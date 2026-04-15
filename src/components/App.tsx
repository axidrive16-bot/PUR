"use client";
import { useGamificationStore, computeLevel } from "@/store/useGamificationStore";
import LearnScreen from "@/components/LearnScreen";
import { InfoTooltip } from "@/components/ScoreTooltip";
import { useState, useEffect, useCallback, useMemo, useRef, memo, useReducer } from "react";
import { usePortfolioStore, useWatchlistStore, useUserStore } from "@/store/usePortfolioStore";
import { AAOIFI_RULES, calcScore, scoreToStatus, calcPurification, computePortfolioMetrics } from "@/domain/aaoifi";
import type { Asset, PortfolioItem, ChartPeriod, ChartPoint } from "@/domain/types";

// ── Design Tokens ──────────────────────────────────────────────────
const T = {
  bg:"#F7F5F0", surface:"#FFFFFF", surface2:"#F2F0EB", surface3:"#ECEAE4",
  border:"rgba(0,0,0,0.07)", borderMid:"rgba(0,0,0,0.12)",
  forest:"#1A3A2A", emerald:"#208640", leaf:"#4A7C3F", mint:"#C8E6C9",
  gold:"#C9A84C", goldLight:"#FDF3E0",
  text:"#1A1A16", textSub:"#6B6960", textMuted:"#A8A49C",
  green:"#208640", greenBg:"#EAF3DE",
  amber:"#B07D2A", amberBg:"#FDF3E0",
  red:"#A32D2D", redBg:"#FCEBEB",
  darkBg:"#111A14", darkSurface:"#1A2A20",
};
const STATUS: any = {
  "conforme": { color: "#208640", bg: "#EAF3DE", label: "Conforme", icon: "✅" },
  "douteux": { color: "#B07D2A", bg: "#FDF3E0", label: "Douteux", icon: "⚠️" },
  "non conforme": { color: "#A32D2D", bg: "#FCEBEB", label: "Non conforme", icon: "❌" },
  "halal": { color: "#208640", bg: "#EAF3DE", label: "Conforme", icon: "✅" },
  "non-halal": { color: "#A32D2D", bg: "#FCEBEB", label: "Non conforme", icon: "❌" }
};
const FREEMIUM = { SCREENINGS: 3 };
const SUB = { PRICE: 9.99, TRIAL: 7 };
const SECTOR_COLORS = [T.emerald,"#4A7C3F","#639922","#C9A84C","#B07D2A","#8B6914"];

// ── Score label ────────────────────────────────────────────────────
function scoreInfo(score: number) {
  if (score >= 75) return { label:"Conforme ✓",      color:T.green, bg:T.greenBg };
  if (score >= 40) return { label:"À surveiller",   color:T.amber, bg:T.amberBg };
  return               { label:"Non conforme",      color:T.red,   bg:T.redBg   };
}

// ── Market insights data (simulé — branché FMP en prod) ────────────
const MARKET_DATA = [
  { ticker:"AAPL",  name:"Apple",      change:+1.59, score:91, why:"Croissance stable",    sector:"Tech",     price:260.5 },
  { ticker:"MSFT",  name:"Microsoft",  change:+0.83, score:87, why:"Dividende fiable",     sector:"Tech",     price:415.2 },
  { ticker:"NKE",   name:"Nike",       change:+1.21, score:84, why:"Marque mondiale",      sector:"Sport",    price:94.7  },
  { ticker:"NOVO",  name:"Novo Nordisk",change:+2.31,score:93, why:"Secteur santé",        sector:"Santé",    price:88.4  },
  { ticker:"ADBE",  name:"Adobe",      change:-0.42, score:89, why:"SaaS récurrent",       sector:"Tech",     price:512.8 },
  { ticker:"ISDE",  name:"iShares Islamic World", change:+0.62, score:94, why:"ETF diversifié", sector:"ETF", price:42.2 },
];

// ── Génère des points avec timestamps réels ────────────────────────
function genPts(base: number, vol: number, n: number, tr: number): ChartPoint[] {
  let p = base*(1-tr*.5); const now = Date.now();
  const pts: ChartPoint[] = Array.from({length:n}, (_,i) => {
    p *= (1+(Math.random()-.48)*vol+tr/n);
    return { t:now-(n-i)*(86400000/n)*n, v:parseFloat(p.toFixed(2)) };
  });
  pts[pts.length-1].v = base; return pts;
}
function mkP(b:number,v:number,t:number): Record<ChartPeriod,ChartPoint[]> {
  return {"1D":genPts(b,v*.3,48,t*.02),"1S":genPts(b,v*.5,56,t*.05),"1M":genPts(b,v,60,t*.15),"1A":genPts(b,v*1.5,52,t)};
}

// ── Hooks ─────────────────────────────────────────────────────────
function useAsync<T>(fn:()=>Promise<T>, deps:any[]=[]) {
  const [s,set] = useState<{data:T|null;isLoading:boolean;error:string|null}>({data:null,isLoading:true,error:null});
  const m = useRef(true);
  useEffect(()=>{
    m.current=true; set(x=>({...x,isLoading:true,error:null}));
    fn().then(d=>{if(m.current)set({data:d,isLoading:false,error:null});}).catch(e=>{if(m.current)set({data:null,isLoading:false,error:e.message});});
    return()=>{m.current=false;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },deps); return s;
}
function useStock(ticker:string|null,period:ChartPeriod="1M"){
  return useAsync(()=>ticker?fetch(`/api/stock/${ticker}?period=${period}`).then(r=>{if(!r.ok)throw new Error("Ticker introuvable");return r.json();}):Promise.resolve(null),[ticker,period]);
}
function useSearch(q:string){return useAsync(()=>q.length>=2?fetch(`/api/search?q=${encodeURIComponent(q)}`).then(r=>r.json()):Promise.resolve({results:[]}),[q]);}
function useDebounce<T>(v:T,d:number):T{const[db,set]=useState(v);useEffect(()=>{const h=setTimeout(()=>set(v),d);return()=>clearTimeout(h);},[v,d]);return db;}

// ── Toast ─────────────────────────────────────────────────────────
let _toast:((m:string,t?:string)=>void)|null=null;
const useToast=()=>_toast??((m:string)=>console.log(m));
function ToastProvider({children}:{children:React.ReactNode}){
  const[ts,set]=useState<{id:number;msg:string;type:string}[]>([]);
  const add=useCallback((msg:string,type="success")=>{const id=Date.now();set(t=>[...t,{id,msg,type}]);setTimeout(()=>set(t=>t.filter(x=>x.id!==id)),3000);},[]);
  _toast=add;
  return <>{children}<div style={{position:"fixed",top:52,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 32px)",maxWidth:394,zIndex:999,display:"flex",flexDirection:"column",gap:7,pointerEvents:"none"}}>{ts.map(t=><div key={t.id} role="alert" style={{background:T.surface,border:`1px solid ${T.borderMid}`,borderRadius:12,padding:"11px 15px",display:"flex",gap:10,alignItems:"center",animation:"toastIn .3s ease",boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}><span>{t.type==="success"?"✅":t.type==="error"?"❌":"ℹ️"}</span><span style={{fontSize:13,fontWeight:700,color:T.text}}>{t.msg}</span></div>)}</div></>;
}

// ── Skeleton ─────────────────────────────────────────────────────
function Sk({w="100%",h=14,r=7}:{w?:string|number;h?:number;r?:number}){return <div style={{width:w,height:h,borderRadius:r,background:`linear-gradient(90deg,${T.surface2} 25%,${T.surface} 50%,${T.surface2} 75%)`,backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite"}}/>;}

// ── PUR Logo SVG (fidèle à l'image) ────────────────────────────────
function PurLogo({size=32,showName=true}:{size?:number;showName?:boolean}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:9}}>
      <div style={{width:size,height:size,borderRadius:size*0.25,background:T.forest,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <svg width={size*0.62} height={size*0.62} viewBox="0 0 24 24" fill="none">
          {/* P shape */}
          <path d="M6 20V5C6 5 6 3 8 3C10 3 12 3 12 6C12 9 9 9 9 9" stroke="#C8E6C9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Checkmark inside circle */}
          <path d="M9 9C9 9 10.5 11.5 12 12" stroke="#C8E6C9" strokeWidth="1.6" strokeLinecap="round"/>
          {/* Arrow up-right */}
          <path d="M12 12L18 6" stroke="#C8E6C9" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M14.5 6H18V9.5" stroke="#C8E6C9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {showName&&<div><div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:size*0.59,fontWeight:800,color:T.text,letterSpacing:"-0.03em",lineHeight:1}}>PUR</div><div style={{fontSize:9,color:T.textMuted,letterSpacing:"0.05em",lineHeight:1,marginTop:1}}>Invest with confidence</div></div>}
    </div>
  );
}

// ── Score Ring ────────────────────────────────────────────────────
const ScoreRing=memo(({score,size=64}:{score:number;size?:number})=>{
  const si=scoreInfo(score);const r=size*.37,c=2*Math.PI*r;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${score}/100 — ${si.label}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.surface2} strokeWidth="5"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={si.color} strokeWidth="5" strokeDasharray={`${(score/100)*c} ${c}`} strokeDashoffset={c*.25} strokeLinecap="round" style={{transition:"stroke-dasharray .9s ease"}}/>
        <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle" fill={si.color} fontSize={size*.24} fontWeight="800" fontFamily="'Cabinet Grotesk',sans-serif">{score}</text>
      </svg>
      <div style={{background:si.bg,color:si.color,fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:100,letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{si.label}</div>
    </div>
  );
});
ScoreRing.displayName="ScoreRing";

// ── Chart avec Y-axis visible ─────────────────────────────────────
const Chart=memo(({data,color=T.emerald,height=130,showYAxis=true,label=""}:{data:ChartPoint[];color?:string;height?:number;showYAxis?:boolean;label?:string})=>{
  const[hov,setHov]=useState<number|null>(null);
  const svgRef=useRef<SVGSVGElement>(null);
  const W=340,H=height,PT=8,PB=22,PL=showYAxis?42:8,PR=8;
  const cW=W-PL-PR,cH=H-PT-PB;
  const vals=data.map(d=>d.v);
  const min=vals.length?Math.min(...vals):0,max=vals.length?Math.max(...vals):1;
  const range=max-min||1;
  // Y-axis ticks — 4 niveaux lisibles
  const yStep=(range/3);
  const yTicks=[min,min+yStep,min+yStep*2,max].map(v=>Math.round(v));
  const pts=data.map((d,i)=>({x:PL+(i/(data.length-1||1))*cW,y:PT+cH-((d.v-min)/range)*cH,v:d.v,t:d.t}));
  const poly=pts.map(p=>`${p.x},${p.y}`).join(" ");
  const area=`M${pts[0]?.x||PL},${PT+cH} ${pts.map(p=>`L${p.x},${p.y}`).join(" ")} L${pts[pts.length-1]?.x||PL+cW},${PT+cH} Z`;
  const gid=`g${color.replace(/[^a-z0-9]/gi,"")}${data.length}`;
  const hovPt=hov!==null?pts[hov]:null;
  const fmtV=(v:number)=>v>=1000?`${(v/1000).toFixed(1)}k`:`${v.toFixed(0)}`;
  const fmtT=(ts:number)=>{const d=new Date(ts);return d.toLocaleDateString("fr-FR",{day:"numeric",month:"short"});};
  const onMove=useCallback((e:React.MouseEvent|React.TouchEvent)=>{
    if(!svgRef.current)return;
    const rect=svgRef.current.getBoundingClientRect();
    const cx="touches" in e?e.touches[0]?.clientX||0:e.clientX;
    const xS=(cx-rect.left)*(W/rect.width);
    let ci=0,md=Infinity;
    pts.forEach((p,i)=>{const d=Math.abs(p.x-xS);if(d<md){md=d;ci=i;}});
    setHov(ci);
  },[pts]);

  if(!data.length)return(
    <div style={{height,background:T.surface2,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontSize:12,color:T.textMuted}}>Données en cours de chargement…</span>
    </div>
  );

  return(
    <div>
      {/* Valeur au survol */}
      <div style={{height:22,marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
        {hovPt?(
          <><span style={{fontSize:14,fontWeight:800,color:T.text,fontFamily:"'DM Serif Display',serif"}}>{fmtV(hovPt.v)}€</span><span style={{fontSize:11,color:T.textMuted}}>{fmtT(hovPt.t)}</span></>
        ):<span style={{fontSize:11,color:T.textMuted}}>{label}</span>}
      </div>
      <div style={{cursor:"crosshair"}} onMouseMove={onMove} onMouseLeave={()=>setHov(null)} onTouchMove={onMove} onTouchEnd={()=>setHov(null)}>
        <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",overflow:"visible"}} role="img" aria-label="Graphique de valeur">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity=".15"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </linearGradient>
          </defs>
          {/* Gridlines horizontales */}
          {yTicks.map((v,i)=>{
            const y=PT+cH-((v-min)/range)*cH;
            return<line key={i} x1={PL} y1={y} x2={PL+cW} y2={y} stroke={T.border} strokeWidth="1" strokeDasharray="3,4"/>;
          })}
          {/* Y-axis labels */}
          {showYAxis&&yTicks.map((v,i)=>{
            const y=PT+cH-((v-min)/range)*cH;
            return<text key={i} x={PL-5} y={y+1} textAnchor="end" dominantBaseline="middle" fontSize="9" fill={T.textMuted} fontFamily="'Cabinet Grotesk',sans-serif">{fmtV(v)}€</text>;
          })}
          {/* Area */}
          <path d={area} fill={`url(#${gid})`}/>
          {/* Line */}
          <polyline points={poly} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {/* X-axis baseline */}
          <line x1={PL} y1={PT+cH+1} x2={PL+cW} y2={PT+cH+1} stroke={T.border} strokeWidth="1"/>
          {/* X-axis labels — 3 points */}
          {[0,Math.floor(data.length/2),data.length-1].map(idx=>pts[idx]&&(
            <text key={idx} x={pts[idx].x} y={H-4} textAnchor={idx===0?"start":idx===data.length-1?"end":"middle"} fontSize="9" fill={T.textMuted} fontFamily="'Cabinet Grotesk',sans-serif">
              {fmtT(data[idx].t)}
            </text>
          ))}
          {/* Crosshair */}
          {hovPt&&<>
            <line x1={hovPt.x} y1={PT} x2={hovPt.x} y2={PT+cH} stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity=".5"/>
            <circle cx={hovPt.x} cy={hovPt.y} r="4" fill={color} stroke={T.surface} strokeWidth="2"/>
          </>}
        </svg>
      </div>
    </div>
  );
});
Chart.displayName="Chart";

// ── Mini Sparkline ────────────────────────────────────────────────
const Spark=memo(({pts,color=T.emerald}:{pts:ChartPoint[];color?:string})=>{
  if(!pts?.length||pts.length<2)return null;
  const vals=pts.map(d=>d.v),mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1;
  const W=52,H=22;
  const ps=vals.map((v,i)=>`${(i/(vals.length-1))*W},${H-((v-mn)/rng)*(H*.85)}`).join(" ");
  return<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true"><polyline points={ps} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
});
Spark.displayName="Spark";

// ── Ratio Bar ─────────────────────────────────────────────────────
const RatioBar=memo(({label,value,max,detail}:{label:string;value:number;max:number;detail:string})=>{
  const[open,setOpen]=useState(false);
  const ok=value<max,pct=Math.min((value/max)*100,100),color=ok?T.green:T.red;
  return(
    <div style={{marginBottom:13}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,fontFamily:"inherit"}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{width:17,height:17,borderRadius:5,background:ok?T.greenBg:T.redBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color,fontWeight:800}}>{ok?"✓":"✕"}</div>
          <span style={{fontSize:13,color:T.textSub}}>{label}</span>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:700,color}}>{value}%</span>
          <span style={{fontSize:11,color:T.textMuted}}>/ {max}%</span>
          <span style={{fontSize:10,color:T.textMuted}}>{open?"▲":"▼"}</span>
        </div>
      </button>
      <div style={{height:5,background:T.surface2,borderRadius:100,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:100,transition:"width .8s ease"}}/>
      </div>
      {open&&<div style={{fontSize:12,color:T.textSub,marginTop:8,padding:"10px 12px",background:T.surface2,borderRadius:8,lineHeight:1.7}}>{detail}</div>}
    </div>
  );
});
RatioBar.displayName="RatioBar";

// ── Modal ─────────────────────────────────────────────────────────
const Modal=({children,onClose}:{children:React.ReactNode;onClose:()=>void})=>(
  <div role="dialog" aria-modal="true" onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300,backdropFilter:"blur(6px)",animation:"fadeIn .2s ease"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.surface,width:"100%",maxWidth:430,borderRadius:"20px 20px 0 0",padding:"20px 22px 44px",maxHeight:"92vh",overflowY:"auto",animation:"sheetUp .32s cubic-bezier(.34,1.2,.64,1)"}}>
      <div style={{width:36,height:4,borderRadius:2,background:T.border,margin:"0 auto 20px Fitz"}}/>
      {children}
    </div>
  </div>
);

// ── Upgrade Modal ─────────────────────────────────────────────────
function UpgradeModal({onClose}:{onClose:()=>void}){
  const set=useUserStore(s=>s.setIsPremium);const toast=useToast();
  const feats=["Screenings illimités","ETF & fonds conformes","Bilans d'entreprise","Alertes de conformité","Historique du score","Score de durabilité","Calcul Zakat automatique","Support prioritaire"];
  return(
    <Modal onClose={onClose}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}><PurLogo size={28}/></div>
      <h2 style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:6}}>PUR Premium</h2>
      <p style={{fontSize:13,color:T.textSub,marginBottom:18,lineHeight:1.7}}>Tout ce qu'il vous faut pour investir sereinement.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:18}}>
        {feats.map(f=><div key={f} style={{display:"flex",gap:6,alignItems:"center",fontSize:12,color:T.text}}><div style={{width:13,height:13,borderRadius:3,background:T.greenBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:T.green,fontWeight:800,flexShrink:0}}>✓</div>{f}</div>)}
      </div>
      <div style={{background:T.surface2,borderRadius:12,padding:18,textAlign:"center",marginBottom:14}}>
        <span style={{fontFamily:"'DM Serif Display',serif",fontSize:30,color:T.text}}>{SUB.PRICE}€</span>
        <span style={{fontSize:13,color:T.textSub}}> / mois</span>
        <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>{SUB.TRIAL} jours gratuits · Résiliable</div>
      </div>
      <button style={BS.btnPrimary} onClick={()=>{set(true);toast("Premium activé ✓");onClose();}}>Commencer — {SUB.TRIAL} jours gratuits</button>
      <button style={{...BS.btnGhost,width:"100%",marginTop:10}} onClick={onClose}>Pas maintenant</button>
    </Modal>
  );
}

// ── Auth Modal ────────────────────────────────────────────────────
function AuthModal({onClose}:{onClose:()=>void}){
  const[mode,setMode]=useState<"signin"|"signup">("signin");
  const[email,setEmail]=useState("");const[pw,setPw]=useState("");const[pw2,setPw2]=useState("");
  const[loading,setL]=useState(false);const[err,setErr]=useState("");const[ok,setOk]=useState(false);
  const toast=useToast();
  const submit=async()=>{
    setErr("");if(!email||!pw){setErr("Tous les champs sont requis.");return;}
    if(mode==="signup"&&pw!==pw2){setErr("Les mots de passe ne correspondent pas.");return;}
    setL(true);
    try{const res=await fetch(`/api/auth/${mode}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password:pw})});const data=await res.json();if(!res.ok){setErr(data.error??"Erreur");setL(false);return;}if(data.needsConfirmation){setOk(true);setL(false);return;}toast("Bienvenue !");onClose();window.location.reload();}catch{setErr("Erreur réseau");}
    setL(false);
  };
  if(ok)return<Modal onClose={onClose}><div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:48,marginBottom:14}}>📧</div><h2 style={{fontSize:20,fontWeight:800,color:T.text,marginBottom:10}}>Vérifiez votre email</h2><p style={{fontSize:13,color:T.textSub,lineHeight:1.7}}>Lien envoyé à <strong style={{color:T.text}}>{email}</strong></p><button style={{...BS.btnGhost,marginTop:20,padding:"0 24px"}} onClick={onClose}>Fermer</button></div></Modal>;
  return(
    <Modal onClose={onClose}>
      <div style={{marginBottom:18,textAlign:"center"}}><PurLogo size={30}/></div>
      <div style={{...BS.segCtrl,marginBottom:16}}>
        {(["signin","signup"] as const).map((id,i)=><button key={id} onClick={()=>{setMode(id);setErr("");}} style={{...BS.seg,...(mode===id?BS.segActive:{})}}>{["Se connecter","Créer un compte"][i]}</button>)}
      </div>
      {err&&<div style={{background:T.redBg,border:`1px solid ${T.red}30`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:T.red}}>{err}</div>}
      <label style={{fontSize:12,color:T.textSub,marginBottom:5,display:"block"}}>Email</label>
      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="vous@email.com" style={{...BS.input,marginBottom:12}}/>
      <label style={{fontSize:12,color:T.textSub,marginBottom:5,display:"block"}}>Mot de passe</label>
      <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" style={{...BS.input,marginBottom:mode==="signup"?12:20}}/>
      {mode==="signup"&&<><label style={{fontSize:12,color:T.textSub,marginBottom:5,display:"block"}}>Confirmer</label><input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="••••••••" style={{...BS.input,marginBottom:20}}/></>}
      <button style={{...BS.btnPrimary,opacity:loading?.7:1}} onClick={submit} disabled={loading}>{loading?"Chargement…":mode==="signin"?"Se connecter":"Créer mon compte"}</button>
    </Modal>
  );
}

// ── Multi-Portfolio Store ─────────────────────────────────────────
interface Portfolio { id:string; name:string; holdings:PortfolioItem[]; createdAt:string; }
const DEFAULT_PORTFOLIOS:Portfolio[]=[
  { id:"p1", name:"Portefeuille principal", holdings:[], createdAt:new Date().toISOString() },
];

function usePortfolios(){
  const[portfolios,setPf]=useState<Portfolio[]>(()=>{try{const v=localStorage.getItem("pur_portfolios");return v?JSON.parse(v):DEFAULT_PORTFOLIOS;}catch{return DEFAULT_PORTFOLIOS;}});
  const[activeId,setActiveId]=useState<string>(()=>{try{return localStorage.getItem("pur_active_pf")||"p1";}catch{return "p1";}});
  useEffect(()=>{try{localStorage.setItem("pur_portfolios",JSON.stringify(portfolios));}catch{}},[portfolios]);
  useEffect(()=>{try{localStorage.setItem("pur_active_pf",activeId);}catch{}},[activeId]);
  const active=portfolios.find(p=>p.id===activeId)||portfolios[0];
  const createPf=(name:string)=>{const id="p"+Date.now();setPf(ps=>[...ps,{id,name,holdings:[],createdAt:new Date().toISOString()}]);setActiveId(id);};
  const renamePf=(id:string,name:string)=>setPf(ps=>ps.map(p=>p.id===id?{...p,name}:p));
  const deletePf=(id:string)=>{setPf(ps=>{const next=ps.filter(p=>p.id!==id);if(activeId===id&&next.length)setActiveId(next[0].id);return next;});};
  const addToActive=(asset:Asset)=>setPf(ps=>ps.map(p=>p.id===activeId?{...p,holdings:p.holdings.find(h=>h.ticker===asset.ticker)?p.holdings:[...p.holdings,{...asset,qty:1,paidPrice:asset.price,_id:null}]}:p));
  const removeFromActive=(ticker:string)=>setPf(ps=>ps.map(p=>p.id===activeId?{...p,holdings:p.holdings.filter(h=>h.ticker!==ticker)}:p));
  const inActive=(ticker:string)=>active.holdings.some(h=>h.ticker===ticker);
  const metrics=useMemo(()=>computePortfolioMetrics(active.holdings),[active]);
  return{portfolios,active,activeId,setActiveId,createPf,renamePf,deletePf,addToActive,removeFromActive,inActive,metrics};
}

// ── StockCard ─────────────────────────────────────────────────────
function StockCard({ticker,onReport,pfCtx}:{ticker:string;onReport:(t:string)=>void;pfCtx:ReturnType<typeof usePortfolios>}){
  const{toggle:wlToggle,inList:inWl}=useWatchlistStore();
  const isPremium=useUserStore(s=>s.isPremium);
  const toast=useToast();
  const[period,setPeriod]=useState<ChartPeriod>("1M");
  const[showWhy,setShowWhy]=useState(false);
  const[showUp,setShowUp]=useState(false);
  const{data,isLoading,error}=useStock(ticker,period);
  const asset=data?.asset;
  const enriched=useMemo(()=>{
    if(!asset)return{"1D":[],"1S":[],"1M":[],"1A":[]};
    const hist=data?.history?.[period]??[];
    if(hist.length>0)return{...asset.periods,[period]:hist};
    return mkP(asset.price,(asset.beta??1)*.015,(asset.change??0)>0?.8:-.3);
  },[asset,data,period]);
  if(isLoading)return<div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:20}}><Sk h={22} w="55%" r={4}/><div style={{marginTop:8}}><Sk h={14} w="35%" r={4}/></div><div style={{marginTop:14}}><Sk h={110} r={8}/></div></div>;
  if(error||!asset)return<div style={{background:T.redBg,border:`1px solid ${T.red}22`,borderRadius:16,padding:18,color:T.red,fontSize:13}}>Ticker introuvable : {ticker}</div>;
  const cfg = STATUS[asset.status] ?? STATUS["conforme"] ?? STATUS.halal;
  const si=scoreInfo(asset.score);
  const isInPf=pfCtx.inActive(ticker);
  const isWatched=inWl(ticker);
  const cc=(asset.change??0)>=0?T.green:T.red;
  const currentPts=enriched[period]??[];
  return(
    <article style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,overflow:"hidden"}}>
      {/* Status banner */}
      <div style={{background:cfg.bg,padding:"7px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <div style={{width:16,height:16,borderRadius:4,background:cfg.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:800}}>{cfg.icon}</div>
          <span style={{fontSize:11,fontWeight:700,color:cfg.color}}>{cfg.label}</span>
          <span style={{fontSize:11,color:cfg.color,opacity:.65}}>— {cfg.label==="Conforme"?"Vous pouvez investir":cfg.label==="À surveiller"?"Par précaution":"Ne pas investir"}</span>
        </div>
      </div>
      <div style={{padding:18}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <h2 style={{fontSize:20,fontWeight:800,color:T.text,letterSpacing:"-.5px",margin:0}}>{ticker}</h2>
            <p style={{fontSize:12,color:T.textSub,marginBottom:8}}>{asset.name}</p>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {[[asset.sector,T.emerald],[asset.mktCap,T.textMuted],[(asset.divYield??0)>0?`Div. ${asset.divYield}%`:null,T.amber],[asset.volatility,asset.volatility==="Faible"?T.green:asset.volatility==="Élevée"?T.red:T.amber]].filter(([v])=>v).map(([v,c],i)=><span key={i} style={{fontSize:10,background:`${c}12`,color:c as string,padding:"3px 7px",borderRadius:100,fontWeight:600}}>{v}</span>)}
            </div>
          </div>
          <ScoreRing score={asset.score} size={60}/>
        </div>
        {/* Prix */}
        <div style={{marginBottom:14}}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,lineHeight:1}}>{asset.price}$</div>
          <div style={{fontSize:12,color:cc,fontWeight:700,marginTop:3}}>{(asset.change??0)>=0?"+":""}{asset.change}% aujourd'hui</div>
        </div>
        {/* Période */}
        <div style={{display:"flex",gap:4,marginBottom:8}}>
          {(["1D","1S","1M","1A"] as ChartPeriod[]).map(p=><button key={p} onClick={()=>setPeriod(p)} style={{flex:1,height:26,background:period===p?cc:T.surface2,color:period===p?"#fff":T.textSub,border:"none",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{p}</button>)}
        </div>
        {/* Chart avec Y-axis */}
        <Chart data={currentPts} color={cc} height={120} showYAxis={true} label={`Cours · ${period}`}/>
        {/* Ratios */}
        <div style={{background:T.surface2,borderRadius:12,padding:14,marginBottom:13,marginTop:14}}>
          <p style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textMuted,marginBottom:12}}>Analyse de conformité</p>
          <RatioBar label="Dette / actifs" value={asset.ratioDebt} max={33} detail={`Mesure l'endettement de ${ticker}. Seuil maximum : 33% des actifs totaux.`}/>
          <RatioBar label="Revenus non conformes" value={asset.ratioRevHaram} max={5} detail={`Part des revenus illicites. Seuil maximum : 5% du chiffre d'affaires.`}/>
          <RatioBar label="Liquidités / actifs" value={asset.ratioCash} max={33} detail={`Instruments monétaires sensibles. Seuil maximum : 33% des actifs.`}/>
        </div>
        {/* Historique score */}
        {isPremium&&asset.scoreHistory.length>0&&(
          <div style={{background:T.surface2,borderRadius:12,padding:14,marginBottom:13}}>
            <p style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textMuted,marginBottom:10}}>Évolution du score — {asset.scoreHistory.length} trimestres</p>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",height:40}}>
              {(asset.scoreHistory as any[]).map((v: number, i: number) => { 
                const si2 = scoreInfo(v); 
                return <div key={i} style={{ height: 20, width: 4, background: si2.color, borderRadius: 2 }} />;
              })}
            </div>
          </div>
        )}
        {!isPremium&&<button onClick={()=>setShowUp(true)} style={{width:"100%",background:T.surface2,border:`1px solid ${T.amber}28`,borderRadius:12,padding:"10px 14px",marginBottom:13,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",fontFamily:"inherit"}}><div><div style={{fontSize:12,fontWeight:700,color:T.amber,marginBottom:1}}>Historique du score sur 2 ans</div><div style={{fontSize:11,color:T.textMuted}}>Évolution trimestrielle · Premium</div></div><span style={{fontSize:12,color:T.amber,fontWeight:700}}>Voir →</span></button>}
        {/* Pourquoi */}
        <div style={{background:T.surface2,borderRadius:12,overflow:"hidden",marginBottom:13}}>
          <button onClick={()=>setShowWhy(w=>!w)} style={{width:"100%",padding:"11px 14px",display:"flex",justifyContent:"space-between",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}><span style={{fontSize:13,fontWeight:700,color:T.text}}>Pourquoi {asset.status==="halal"?"conforme":asset.status==="douteux"?"à surveiller":"non conforme"} ?</span><span style={{color:T.textMuted,fontSize:12}}>{showWhy?"▲":"▼"}</span></button>
          {showWhy&&<div style={{padding:"0 14px 14px"}}>{(asset.whyHalal as any[]).map((w: any, i: number) => <div key={i} style={{display:"flex",gap:8,marginBottom:10}}><div style={{width:16,height:16,borderRadius:4,background:w.ok?T.greenBg:T.redBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:w.ok?T.green:T.red,fontWeight:800,flexShrink:0,marginTop:1}}>{w.ok?"✓":"✕"}</div><div><p style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:2}}>{w.label}</p><p style={{fontSize:11,color:T.textSub,lineHeight:1.6}}>{w.detail}</p></div></div>)}</div>}
        </div>
        {/* Purification */}
        {(asset.divAnnual??0)>0&&<div style={{background:T.goldLight,border:`1px solid ${T.gold}30`,borderRadius:12,padding:14,marginBottom:14}}><p style={{fontSize:12,fontWeight:700,color:T.amber,marginBottom:7}}>Purification des dividendes</p><div style={{display:"flex",gap:16}}><div><p style={{fontSize:10,color:T.textMuted,marginBottom:2}}>Dividende/an</p><p style={{fontSize:13,fontWeight:700,color:T.text}}>{asset.divAnnual}$</p></div><div><p style={{fontSize:10,color:T.textMuted,marginBottom:2}}>Part à purifier</p><p style={{fontSize:13,fontWeight:700,color:T.amber}}>{asset.divHaramPct}%</p></div><div><p style={{fontSize:10,color:T.textMuted,marginBottom:2}}>Montant</p><p style={{fontSize:13,fontWeight:700,color:T.amber}}>{calcPurification(asset.divAnnual??0,asset.divHaramPct??0).toFixed(3)}$</p></div></div></div>}
        {/* CTAs */}
        <div style={{display:"flex",gap:7}}>
          <button onClick={()=>{pfCtx.addToActive(asset);toast(isInPf?`${ticker} déjà dans le portefeuille`:`${ticker} ajouté ✓`,isInPf?"info":"success");}} style={{flex:1,height:46,background:isInPf?T.greenBg:T.forest,border:`1px solid ${isInPf?T.green:T.forest}`,borderRadius:12,color:isInPf?T.green:"#E8F0EB",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
            {isInPf?"Déjà dans le portefeuille ✓":"+ Ajouter"}
          </button>
          <button onClick={()=>{const wasWl=isWatched;wlToggle(asset);if(!wasWl){useGamificationStore.getState().trackWatchlist();}toast(wasWl?`Retiré`:`${ticker} suivi 🔖`);}} style={{width:46,height:46,background:isWatched?T.greenBg:T.surface2,border:`1px solid ${isWatched?T.green:T.border}`,borderRadius:12,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>🔖</button>
          <button onClick={()=>onReport(ticker)} style={{width:46,height:46,background:T.surface2,border:`1px solid ${T.border}`,borderRadius:12,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}} title="Rapport">📋</button>
        </div>
      </div>
      {showUp&&<UpgradeModal onClose={()=>setShowUp(false)}/>}
    </article>
  );
}

// ── Market Insights Section ───────────────────────────────────────
function MarketInsights({onSearch}:{onSearch:(t:string)=>void}){
  const[filter,setFilter]=useState<"all"|"top"|"etf">("all");
  const filtered=MARKET_DATA.filter(s=>filter==="all"?true:filter==="etf"?s.sector==="ETF":s.sector!=="ETF");
  return(
    <section style={{padding:"0 20px 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div><p style={{fontSize:14,fontWeight:700,color:T.text}}>Opportunités du moment</p><p style={{fontSize:11,color:T.textMuted}}>Sélection conforme · Mise à jour quotidienne</p></div>
      </div>
      {/* Filtres */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {([["all","Tous"],["top","Actions"],["etf","ETF"]] as const).map(([id,lbl])=><button key={id} onClick={()=>setFilter(id)} style={{height:28,padding:"0 12px",background:filter==="id"?T.forest:T.surface2,color:filter===id?"#E8F0EB":T.textSub,border:"none",borderRadius:100,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{lbl}</button>)}
      </div>
      {/* Cards horizontales */}
      <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}}>
        {filtered.map(s=>{
          const pos=s.change>=0;const si=scoreInfo(s.score);
          return(
            <button key={s.ticker} onClick={()=>onSearch(s.ticker)} style={{flexShrink:0,width:158,background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px 14px 12px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}>
              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:T.text,letterSpacing:"-.3px"}}>{s.ticker}</div>
                  <div style={{fontSize:10,color:T.textMuted,marginTop:1}}>{s.name}</div>
                </div>
                <div style={{background:pos?T.greenBg:T.redBg,color:pos?T.green:T.red,fontSize:10,fontWeight:700,padding:"3px 6px",borderRadius:6}}>
                  {pos?"+":""}{s.change}%
                </div>
              </div>
              {/* Mini sparkline */}
              <div style={{marginBottom:8}}>
                <Spark pts={mkP(s.price,.02,pos?.5:-.4)["1M"]} color={pos?T.green:T.red}/>
              </div>
              {/* Score */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:`1px solid ${T.border}`,paddingTop:8}}>
                <div>
                  <div style={{fontSize:9,color:T.textMuted,marginBottom:2}}>Score</div>
                  <div style={{fontSize:14,fontWeight:800,color:si.color}}>{s.score}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:9,color:T.textMuted,marginBottom:2}}>Raison</div>
                  <div style={{fontSize:9,fontWeight:700,color:T.textSub}}>{s.why}</div>
                </div>
              </div>
              {/* Sector tag */}
              <div style={{marginTop:7,background:T.surface2,borderRadius:6,padding:"3px 7px",display:"inline-block"}}>
                <span style={{fontSize:9,color:T.textSub,fontWeight:600}}>{s.sector}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── Home Screen ───────────────────────────────────────────────────
function HomeScreen({setTab,openReport}:{setTab:(t:string)=>void;openReport:(t:string)=>void}){
  const pfCtx=usePortfolios();
  const isPremium=useUserStore(s=>s.isPremium);
  const screenings=useUserStore(s=>s.screenings);
  const toast=useToast();
  const[q,setQ]=useState("");const[ticker,setTicker]=useState<string|null>(null);
  const[showUp,setShowUp]=useState(false);const[showAuth,setShowAuth]=useState(false);
  const dq=useDebounce(q,400);const{data:sr}=useSearch(dq);
  const m=pfCtx.metrics;
  // Portefeuille chart data
  const pfPts=useMemo(()=>{
    const base=m.value||3500;const now=Date.now();
    return Array.from({length:30},(_,i)=>({t:now-(29-i)*86400000,v:base*(0.93+i/100+(Math.random()-.4)*.02)}));
  },[m.value]);

  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease",background:T.bg}}>
      {/* Header */}
      <header style={{padding:"52px 20px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <PurLogo size={32}/>
        <button onClick={()=>isPremium?null:setShowAuth(true)} style={{...BS.iconBtn,background:isPremium?T.forest:T.surface,border:`1px solid ${isPremium?T.forest:T.border}`}}>
          <span style={{fontSize:15,color:isPremium?"#E8F0EB":T.textSub}}>{isPremium?"⭐":"👤"}</span>
        </button>
      </header>

      {/* Portfolio hero — avec Y-axis visible */}
      <section style={{padding:"0 20px 14px"}}>
        <div style={{background:T.forest,borderRadius:20,padding:"18px 18px 10px 18px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <p style={{fontSize:10,color:"rgba(200,230,201,0.5)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:3}}>{pfCtx.active.name}</p>
              <p style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color:"#E8F0EB",lineHeight:1}}>{m.value.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}</p>
              <p style={{fontSize:12,color:m.gain>=0?"#A5D6A7":"#EF9A9A",fontWeight:700,marginTop:3}}>{m.gain>=0?"+":""}{m.gain.toFixed(0)}€ · {m.gain>=0?"+":""}{m.gainPct.toFixed(2)}%</p>
            </div>
            <div style={{textAlign:"center",background:"rgba(255,255,255,0.07)",borderRadius:10,padding:"8px 12px"}}>
              <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:22,fontWeight:800,color:m.conform>=75?"#A5D6A7":"#FFE082"}}>{m.conform}</div>
              <div style={{fontSize:8,color:"rgba(200,230,201,0.4)",letterSpacing:"0.06em",marginTop:1}}>SCORE</div>
              <div style={{fontSize:9,color:m.conform>=75?"#A5D6A7":"#FFE082",fontWeight:700,marginTop:1}}>{m.conform>=75?"Conforme ✓":"À surveiller"}</div>
            </div>
          </div>
          {/* Chart avec Y-axis et gridlines */}
          <div style={{color:"rgba(200,230,201,0.6)"}}>
            <Chart data={pfPts} color="#6FCF97" height={110} showYAxis={true} label="Valeur du portefeuille"/>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section style={{padding:"0 20px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button onClick={()=>setTab("screen")} style={{display:"flex",flexDirection:"column",gap:4,padding:"14px 14px",borderRadius:14,border:`1px solid ${T.green}22`,background:T.greenBg,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
          <span style={{fontSize:20}}>🔍</span>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>Analyser</span>
          <span style={{fontSize:11,color:T.textSub}}>{isPremium?"Illimité":`${FREEMIUM.SCREENINGS-screenings} restants`}</span>
        </button>
        <button onClick={()=>setTab("portfolio")} style={{display:"flex",flexDirection:"column",gap:4,padding:"14px 14px",borderRadius:14,border:`1px solid ${T.border}`,background:T.surface,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
          <span style={{fontSize:20}}>📊</span>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>Portefeuilles</span>
          <span style={{fontSize:11,color:T.textSub}}>{pfCtx.portfolios.length} portefeuille{pfCtx.portfolios.length>1?"s":""}</span>
        </button>
      </section>

      {/* Search bar */}
      <section style={{padding:"0 20px 6px"}}>
        <div style={{position:"relative"}}>
          <div style={{display:"flex",gap:8}}>
            <input style={BS.input} placeholder="Analyser une action (ex: AAPL)" value={q} onChange={e=>{setQ(e.target.value);if(!e.target.value)setTicker(null);}} onKeyDown={e=>e.key==="Enter"&&sr?.results?.[0]&&setTicker(sr.results[0].ticker)}/>
            <button style={{width:48,height:50,background:T.forest,border:"none",borderRadius:12,color:"#E8F0EB",fontSize:18,cursor:"pointer",flexShrink:0}} onClick={()=>sr?.results?.[0]&&setTicker(sr.results[0].ticker)}>→</button>
          </div>
          {sr?.results?.length>0&&q&&!ticker&&(
            <div style={{position:"absolute",top:56,left:0,right:56,background:T.surface,border:`1px solid ${T.borderMid}`,borderRadius:12,zIndex:10,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,0.1)"}}>
              {sr.results.slice(0,5).map((r:any)=>(
                <button key={r.ticker} onClick={()=>{setTicker(r.ticker);setQ(r.ticker);}} style={{width:"100%",padding:"11px 15px",display:"flex",justifyContent:"space-between",background:"none",border:"none",borderBottom:`1px solid ${T.border}`,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                  <div><div style={{fontSize:13,fontWeight:700,color:T.text}}>{r.ticker}</div><div style={{fontSize:11,color:T.textSub}}>{r.name}</div></div>
                  <span style={{fontSize:10,color:T.textMuted,background:T.surface2,padding:"2px 7px",borderRadius:6}}>{r.exchange}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {!isPremium&&<div style={{display:"flex",gap:5,marginTop:7,alignItems:"center"}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:3,background:i<screenings?T.green:T.surface2}}/>)}<span style={{fontSize:11,color:T.textSub,marginLeft:3}}>{screenings}/{FREEMIUM.SCREENINGS} analyses aujourd'hui</span><button style={{fontSize:11,color:T.green,background:"none",border:"none",cursor:"pointer",marginLeft:"auto",fontFamily:"inherit",fontWeight:700}} onClick={()=>setShowUp(true)}>Illimité →</button></div>}
        {ticker&&<div style={{marginTop:12}}><StockCard ticker={ticker} onReport={openReport} pfCtx={pfCtx}/></div>}
      </section>

      {/* Market Insights */}
      <MarketInsights onSearch={(t)=>{setTicker(t);setQ(t);}}/>

      {showUp&&<UpgradeModal onClose={()=>setShowUp(false)}/>}
      {showAuth&&<AuthModal onClose={()=>setShowAuth(false)}/>}
    </div>
  );
}

// ── Screening Screen ──────────────────────────────────────────────
function ScreeningScreen({openReport}:{openReport:(t:string)=>void}){
  const isPremium=useUserStore(s=>s.isPremium);
  const screenings=useUserStore(s=>s.screenings);
  const inc=useUserStore(s=>s.incScreenings);
  const pfCtx=usePortfolios();
  const[q,setQ]=useState("");const[ticker,setTicker]=useState<string|null>(null);
  const[showUp,setShowUp]=useState(false);
  const dq=useDebounce(q,300);const{data:sr}=useSearch(dq);
  const gStore=useGamificationStore();
  const doSearch=(t:string)=>{if(!isPremium&&screenings>=FREEMIUM.SCREENINGS){setShowUp(true);return;}inc();gStore.trackAnalysis();gStore.checkStreak();setTicker(t);setQ(t);};
  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease",background:T.bg}}>
      <header style={BS.pageHeader}><h1 style={BS.pageTitle}>Analyser</h1>{!isPremium&&<div style={{fontSize:11,background:T.amberBg,color:T.amber,padding:"4px 10px",borderRadius:100,fontWeight:700}}>{screenings}/{FREEMIUM.SCREENINGS}</div>}</header>
      <div style={{padding:"0 20px 14px"}}>
        <div style={{position:"relative"}}>
          <div style={{display:"flex",gap:8}}>
            <input style={BS.input} placeholder="Ticker ou nom de l'entreprise…" value={q} onChange={e=>{setQ(e.target.value);if(!e.target.value)setTicker(null);}}/>
            <button style={{width:48,height:50,background:T.forest,border:"none",borderRadius:12,color:"#E8F0EB",fontSize:18,cursor:"pointer",flexShrink:0}} onClick={()=>sr?.results?.[0]&&doSearch(sr.results[0].ticker)}>→</button>
          </div>
          {sr?.results?.length>0&&q&&!ticker&&(
            <div style={{position:"absolute",top:56,left:0,right:56,background:T.surface,border:`1px solid ${T.borderMid}`,borderRadius:12,zIndex:10,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,0.1)"}}>
              {sr.results.slice(0,6).map((r:any)=>(
                <button key={r.ticker} onClick={()=>doSearch(r.ticker)} style={{width:"100%",padding:"11px 15px",display:"flex",justifyContent:"space-between",background:"none",border:"none",borderBottom:`1px solid ${T.border}`,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                  <div><div style={{fontSize:13,fontWeight:700,color:T.text}}>{r.ticker}</div><div style={{fontSize:11,color:T.textSub}}>{r.name}</div></div>
                  <span style={{fontSize:10,color:T.textMuted,background:T.surface2,padding:"2px 7px",borderRadius:6}}>{r.exchange}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p style={{fontSize:11,color:T.textMuted,marginTop:7}}>Données en temps réel · Financial Modeling Prep</p>
      </div>
      {ticker&&<div style={{padding:"0 20px 16px"}}><StockCard ticker={ticker} onReport={openReport} pfCtx={pfCtx}/></div>}
      {showUp&&<UpgradeModal onClose={()=>setShowUp(false)}/>}
    </div>
  );
}

// ── Portfolio Screen — Multi-portfolio + Zakat ────────────────────
function PortfolioScreen({setTab}:{setTab:(t:string)=>void}){
  const pfCtx=usePortfolios();
  const toast=useToast();
  const[showCreate,setShowCreate]=useState(false);
  const[newName,setNewName]=useState("");
  const[editId,setEditId]=useState<string|null>(null);
  const[editName,setEditName]=useState("");
  const m=pfCtx.metrics;
  const pfPts=useMemo(()=>{
    const base=m.value||3500;const now=Date.now();
    return Array.from({length:30},(_,i)=>({t:now-(29-i)*86400000,v:base*(0.93+i/100+(Math.random()-.4)*.02)}));
  },[m.value]);
  // Zakat : 2.5% sur la valeur nette eligible
  const zakatRate=0.025;
  const zakatAmount=(m.value*zakatRate);
  const zakatThreshold=5000; // Seuil simplifi
  const zakatDue=m.value>zakatThreshold;
  const sectorSegs=useMemo(()=>Object.entries(m.sectors).map(([k,v],i)=>({label:k,pct:(v/m.value)*100,color:SECTOR_COLORS[i%6]})),[m]);

  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease",background:T.bg}}>
      <header style={BS.pageHeader}>
        <h1 style={BS.pageTitle}>Portefeuilles</h1>
        <button onClick={()=>setShowCreate(true)} style={{height:34,padding:"0 14px",background:T.greenBg,border:`1px solid ${T.green}30`,borderRadius:100,color:T.green,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ Nouveau</button>
      </header>

      {/* Sélecteur de portefeuille */}
      <section style={{padding:"0 20px 14px"}}>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
          {pfCtx.portfolios.map(p=>(
            <button key={p.id} onClick={()=>pfCtx.setActiveId(p.id)} style={{flexShrink:0,height:34,padding:"0 14px",background:pfCtx.activeId===p.id?T.forest:T.surface,border:`1px solid ${pfCtx.activeId===p.id?T.forest:T.border}`,borderRadius:100,color:pfCtx.activeId===p.id?"#E8F0EB":T.textSub,fontSize:12,fontWeight:pfCtx.activeId===p.id?700:500,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",display:"flex",alignItems:"center",gap:6}}>
              {p.name}
              {pfCtx.activeId===p.id&&pfCtx.portfolios.length>1&&<span onClick={e=>{e.stopPropagation();if(pfCtx.portfolios.length>1)pfCtx.deletePf(p.id);else toast("Impossible de supprimer le dernier portefeuille","error");}} style={{fontSize:10,opacity:.6,marginLeft:2}}>✕</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Hero chart avec Y-axis */}
      <section style={{padding:"0 20px 14px"}}>
        <div style={{background:T.forest,borderRadius:18,padding:"16px 16px 8px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <p style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:"#E8F0EB",lineHeight:1}}>{m.value.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}</p>
                <button onClick={()=>{setEditId(pfCtx.activeId);setEditName(pfCtx.active.name);}} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:6,padding:"3px 8px",color:"rgba(200,230,201,0.6)",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>✎</button>
              </div>
              <p style={{fontSize:12,color:m.gain>=0?"#A5D6A7":"#EF9A9A",fontWeight:700,marginTop:3}}>{m.gain>=0?"+":""}{m.gain.toFixed(0)}€ ({m.gain>=0?"+":""}{m.gainPct.toFixed(2)}%)</p>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800,color:m.conform>=75?"#A5D6A7":"#FFE082"}}>{m.conform}</div>
              <div style={{fontSize:8,color:"rgba(200,230,201,0.4)",letterSpacing:"0.06em"}}>SCORE</div>
            </div>
          </div>
          <Chart data={pfPts} color="#6FCF97" height={100} showYAxis={true} label="Valeur du portefeuille"/>
        </div>
      </section>

      {/* Score cards */}
      <section style={{padding:"0 20px 14px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
        {[{l:"Score",v:m.conform,c:T.green,s:m.conform>=75?"Conforme":"Douteux",tip:"score"},{l:"Durabilité",v:m.esg,c:T.leaf,s:"",tip:"esg"},{l:"Diversif.",v:m.divers,c:T.amber,s:"",tip:"divers"},{l:"Sécurité",v:m.risk,c:m.risk>=70?T.green:T.amber,s:"",tip:"risque"}].map(s=>(
          <div key={s.l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 9px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}><p style={{fontSize:9,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.l}</p>{(s as any).tip&&<InfoTooltip id={(s as any).tip}/>}</div>
            <p style={{fontSize:16,fontWeight:800,color:s.c}}>{s.v}</p>
            {s.s&&<p style={{fontSize:8,color:s.c,fontWeight:700,marginTop:1}}>{s.s}</p>}
            <div style={{height:3,background:T.surface2,borderRadius:100,marginTop:4}}><div style={{height:"100%",width:`${s.v}%`,background:s.c,borderRadius:100}}/></div>
          </div>
        ))}
      </section>

      {/* Zakat section */}
      <section style={{padding:"0 20px 14px"}}>
        <div style={{background:zakatDue?"linear-gradient(135deg,#FDF8EF,#FDF3E0)":T.surface,border:`1px solid ${zakatDue?T.gold+"40":T.border}`,borderRadius:16,padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:3}}>Calcul Zakat</p>
              <p style={{fontSize:11,color:T.textSub,lineHeight:1.5}}>2.5% sur les actifs éligibles · Calculé automatiquement</p>
            </div>
            <div style={{background:zakatDue?T.amberBg:T.surface2,borderRadius:8,padding:"4px 10px"}}><span style={{fontSize:11,fontWeight:700,color:zakatDue?T.amber:T.textMuted}}>{zakatDue?"Dû cette année":"Pas encore dû"}</span></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:zakatDue?14:0}}>
            <div><p style={{fontSize:10,color:T.textMuted,marginBottom:2}}>Valeur éligible</p><p style={{fontSize:13,fontWeight:700,color:T.text}}>{m.value.toFixed(0)}€</p></div>
            <div><p style={{fontSize:10,color:T.textMuted,marginBottom:2}}>Taux</p><p style={{fontSize:13,fontWeight:700,color:T.amber}}>2.5%</p></div>
            <div><p style={{fontSize:10,color:T.textMuted,marginBottom:2}}>À donner</p><p style={{fontSize:13,fontWeight:700,color:zakatDue?T.amber:T.textMuted}}>{zakatDue?zakatAmount.toFixed(2):"—"}€</p></div>
          </div>
          {zakatDue&&<div style={{display:"flex",gap:8}}>
            <button style={{flex:1,height:38,background:"rgba(176,125,42,0.12)",border:`1px solid ${T.amber}30`,borderRadius:10,color:T.amber,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}} onClick={()=>toast("Zakat marquée comme acquittée ✓")}>Marquer comme payée</button>
            <button style={{flex:1,height:38,background:T.greenBg,border:`1px solid ${T.green}30`,borderRadius:10,color:T.green,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}} onClick={()=>toast("Redirection vers une organisation caritative…")}>Donner maintenant →</button>
          </div>}
        </div>
      </section>

      {/* Répartition */}
      {sectorSegs.length>0&&(
        <section style={{padding:"0 20px 14px"}}>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:18}}>
            <p style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:14}}>Répartition sectorielle</p>
            {sectorSegs.map(s=>(
              <div key={s.label} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
                <div style={{width:8,height:8,borderRadius:4,background:s.color,flexShrink:0}}/>
                <span style={{fontSize:12,color:T.textSub,flex:1}}>{s.label}</span>
                <div style={{width:80,height:4,background:T.surface2,borderRadius:100,overflow:"hidden"}}><div style={{height:"100%",width:`${s.pct}%`,background:s.color,borderRadius:100}}/></div>
                <span style={{fontSize:12,fontWeight:700,color:T.text,width:30,textAlign:"right"}}>{s.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Positions */}
      <section style={{padding:"0 20px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <p style={{fontSize:13,fontWeight:700,color:T.text}}>{pfCtx.active.holdings.length} positions</p>
          <button onClick={()=>setTab("screen")} style={{height:30,padding:"0 12px",background:T.greenBg,border:`1px solid ${T.green}30`,borderRadius:100,color:T.green,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ Ajouter</button>
        </div>
        {pfCtx.active.holdings.length===0?(
          <div style={{textAlign:"center",padding:"32px 0",color:T.textMuted,background:T.surface,borderRadius:16,border:`1px solid ${T.border}`}}>
            <p style={{fontSize:28,marginBottom:8}}>📊</p>
            <p style={{fontSize:13,fontWeight:700,color:T.textSub}}>Portefeuille vide</p>
            <p style={{fontSize:11,marginTop:3}}>Analysez une action et ajoutez-la ici</p>
          </div>
        ):pfCtx.active.holdings.map(h=>{
          const gain=(h.price-h.paidPrice)*h.qty;
          const gainPct=((h.price-h.paidPrice)/h.paidPrice*100).toFixed(1);
          const si=scoreInfo(h.score);
          return(
            <article key={h.ticker} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:14,marginBottom:9}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{width:36,height:36,borderRadius:9,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:T.textSub}}>{h.ticker.slice(0,2)}</div>
                  <div><p style={{fontSize:13,fontWeight:700,color:T.text}}>{h.ticker}</p><p style={{fontSize:11,color:T.textMuted}}>{h.qty} action{h.qty>1?"s":""} · PR {h.paidPrice.toFixed(2)}$</p></div>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontSize:13,fontWeight:700,color:T.text}}>{(h.price*h.qty).toFixed(0)}€</p>
                  <p style={{fontSize:11,fontWeight:700,color:gain>=0?T.green:T.red}}>{gain>=0?"+":""}{gain.toFixed(0)}€ ({gain>=0?"+":""}{gainPct}%)</p>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:7,alignItems:"center"}}>
                  <span style={{background:si.bg,color:si.color,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:100}}>{si.label}</span>
                  <span style={{fontSize:10,color:T.textMuted}}>Score {h.score}</span>
                </div>
                <button style={{...BS.microBtn,color:T.red,borderColor:`${T.red}22`,fontSize:10}} onClick={()=>{pfCtx.removeFromActive(h.ticker);toast(`${h.ticker} retiré`,"info");}}>Retirer</button>
              </div>
            </article>
          );
        })}
      </section>

      {/* Modal création portefeuille */}
      {showCreate&&(
        <Modal onClose={()=>setShowCreate(false)}>
          <h2 style={{fontSize:20,fontWeight:800,color:T.text,marginBottom:16}}>Nouveau portefeuille</h2>
          <label style={{fontSize:12,color:T.textSub,marginBottom:5,display:"block"}}>Nom</label>
          <input style={BS.input} placeholder="ex : Dividendes, Croissance…" value={newName} onChange={e=>setNewName(e.target.value)} autoFocus/>
          <button style={{...BS.btnPrimary,marginTop:16}} onClick={()=>{if(newName.trim()){pfCtx.createPf(newName.trim());setNewName("");setShowCreate(false);toast(`Portefeuille "${newName}" créé ✓`);}}} >Créer</button>
          <button style={{...BS.btnGhost,width:"100%",marginTop:10}} onClick={()=>setShowCreate(false)}>Annuler</button>
        </Modal>
      )}
      {/* Modal renommage */}
      {editId&&(
        <Modal onClose={()=>setEditId(null)}>
          <h2 style={{fontSize:20,fontWeight:800,color:T.text,marginBottom:16}}>Renommer</h2>
          <input style={BS.input} value={editName} onChange={e=>setEditName(e.target.value)} autoFocus/>
          <button style={{...BS.btnPrimary,marginTop:16}} onClick={()=>{if(editName.trim()){pfCtx.renamePf(editId,editName.trim());setEditId(null);toast("Portefeuille renommé ✓");}}} >Enregistrer</button>
          <button style={{...BS.btnGhost,width:"100%",marginTop:10}} onClick={()=>setEditId(null)}>Annuler</button>
        </Modal>
      )}
    </div>
  );
}

// ── Watchlist Screen ──────────────────────────────────────────────
function WatchlistScreen(){
  const{sorted,toggle}=useWatchlistStore();const toast=useToast();
  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease",background:T.bg}}>
      <header style={BS.pageHeader}><h1 style={BS.pageTitle}>Watchlist</h1></header>
      <section style={{padding:"0 20px 24px"}}>
        {sorted().length===0?(
          <div style={{textAlign:"center",padding:"60px 0",color:T.textMuted}}>
            <p style={{fontSize:30,marginBottom:10}}>🔖</p>
            <p style={{fontSize:14,fontWeight:700,color:T.textSub}}>Aucun titre suivi</p>
            <p style={{fontSize:11,marginTop:4}}>Analysez une action pour l'ajouter ici</p>
          </div>
        ):sorted().map(s=>{
          const si=scoreInfo(s.score);
          return(
            <div key={s.ticker} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:14,marginBottom:9}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{display:"flex",gap:9,alignItems:"center"}}>
                  <div style={{width:34,height:34,borderRadius:9,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:T.textSub}}>{s.ticker.slice(0,2)}</div>
                  <div><p style={{fontSize:13,fontWeight:700,color:T.text}}>{s.ticker}</p><p style={{fontSize:11,color:T.textMuted}}>{s.name}</p></div>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontFamily:"'DM Serif Display',serif",fontSize:15,color:T.text}}>{s.price}$</p>
                  <span style={{background:si.bg,color:si.color,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:100}}>Score {s.score} · {si.label}</span>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end"}}><button style={{...BS.microBtn,color:T.red,borderColor:`${T.red}22`,fontSize:10}} onClick={()=>{toggle(s);toast(`${s.ticker} retiré`,"info");}}>Retirer</button></div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

// ── Profile Screen ────────────────────────────────────────────────
function ProfileScreen(){
  const{isPremium,screenings,setIsPremium}=useUserStore();
  const toast=useToast();
  const[showUp,setShowUp]=useState(false);const[showAuth,setShowAuth]=useState(false);
  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease",background:T.bg}}>
      <div style={{padding:"52px 20px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}><PurLogo size={34}/>{isPremium&&<span style={{background:T.greenBg,color:T.green,fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:100}}>Premium actif</span>}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:16}}><p style={{fontSize:10,color:T.textMuted,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>Analyses</p><p style={{fontSize:22,fontWeight:800,color:T.text}}>{screenings}</p></div>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:16}}><p style={{fontSize:10,color:T.textMuted,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>Statut</p><p style={{fontSize:13,fontWeight:700,color:isPremium?T.green:T.amber}}>{isPremium?"Premium ✓":"Gratuit"}</p></div>
        </div>
        {!isPremium&&<button onClick={()=>setShowUp(true)} style={{width:"100%",background:T.forest,borderRadius:16,padding:20,marginBottom:16,cursor:"pointer",textAlign:"left",fontFamily:"inherit",border:"none"}}>
          <p style={{fontSize:16,fontWeight:800,color:"#E8F0EB",marginBottom:5}}>Passer à Premium</p>
          <p style={{fontSize:12,color:"rgba(200,230,201,0.6)",marginBottom:14,lineHeight:1.6}}>Analyses illimitées · Bilans complets · Calcul Zakat automatique</p>
          <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:12}}><span style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:"#E8F0EB"}}>{SUB.PRICE}€</span><span style={{fontSize:12,color:"rgba(200,230,201,0.5)"}}>/ mois · {SUB.TRIAL} jours gratuits</span></div>
          <div style={{background:"#E8F0EB",borderRadius:10,padding:"10px",textAlign:"center",fontSize:13,fontWeight:700,color:T.forest}}>Commencer gratuitement</div>
        </button>}
        <button onClick={()=>setShowAuth(true)} style={{width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:15,marginBottom:12,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit",textAlign:"left"}}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:16}}>🔐</span><span style={{fontSize:13,color:T.text}}>Se connecter / Créer un compte</span></div><span style={{color:T.textMuted}}>›</span></button>
        {[{icon:"📊",label:"Mes portefeuilles"},{icon:"🧮",label:"Calcul Zakat"},{icon:"💬",label:"Support"}].map(item=><button key={item.label} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",borderTop:"none",borderLeft:"none",borderRight:"none",borderBottom:`1px solid ${T.border}`,cursor:"pointer",background:"none",fontFamily:"inherit",textAlign:"left"}}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:16}}>{item.icon}</span><span style={{fontSize:13,color:T.text}}>{item.label}</span></div><span style={{color:T.textMuted}}>›</span></button>)}
        {isPremium&&<button style={{...BS.btnGhost,width:"100%",marginTop:18,color:T.red,borderColor:`${T.red}20`}} onClick={()=>{setIsPremium(false);toast("Abonnement annulé","info");}}>Annuler l'abonnement</button>}
      </div>
      {showUp&&<UpgradeModal onClose={()=>setShowUp(false)}/>}
      {showAuth&&<AuthModal onClose={()=>setShowAuth(false)}/>}
    </div>
  );
}

// ── Base Styles ───────────────────────────────────────────────────
const BS={
  pageHeader:{padding:"52px 20px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"} as React.CSSProperties,
  pageTitle:{fontSize:22,fontWeight:800,color:T.text,letterSpacing:"-.5px"} as React.CSSProperties,
  input:{flex:1,height:50,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"0 15px",fontSize:14,outline:"none",background:T.surface,color:T.text,fontFamily:"inherit",transition:"border-color .2s"} as React.CSSProperties,
  iconBtn:{width:44,height:44,borderRadius:12,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"} as React.CSSProperties,
  btnPrimary:{width:"100%",height:50,background:T.forest,border:"none",borderRadius:13,color:"#E8F0EB",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"} as React.CSSProperties,
  btnGhost:{height:44,background:"none",border:`1px solid ${T.border}`,borderRadius:11,color:T.textSub,fontFamily:"inherit",fontWeight:600,fontSize:13,cursor:"pointer"} as React.CSSProperties,
  microBtn:{height:28,padding:"0 10px",background:"none",border:"1px solid",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"} as React.CSSProperties,
  segCtrl:{display:"flex",background:T.surface2,borderRadius:11,padding:3} as React.CSSProperties,
  seg:{flex:1,height:34,background:"none",border:"none",borderRadius:9,color:T.textSub,fontFamily:"inherit",fontWeight:600,fontSize:13,cursor:"pointer",transition:"all .15s"} as React.CSSProperties,
  segActive:{background:T.surface,color:T.text,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"} as React.CSSProperties,
};

// ── Navigation tabs ───────────────────────────────────────────────
const TABS=[
  {id:"home",label:"Accueil",
    icon:(active:boolean)=>(
      // Icône maison minimaliste
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 9.5L10 3L17 9.5V17H13V13H7V17H3V9.5Z" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={active?T.greenBg:"none"}/>
      </svg>
    )},
  {id:"screen",label:"Analyser",
    icon:(active:boolean)=>(
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="9" cy="9" r="5.5" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5"/>
        <path d="M13.5 13.5L17 17" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7 9L8.5 10.5L11.5 7.5" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )},
  {id:"portfolio",label:"Portfolios",
    icon:(active:boolean)=>(
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="10" width="3.5" height="7" rx="1" fill={active?T.forest:"#A8A49C"}/>
        <rect x="8.25" y="7" width="3.5" height="10" rx="1" fill={active?T.forest:"#A8A49C"} opacity={active?1:.7}/>
        <rect x="13.5" y="4" width="3.5" height="13" rx="1" fill={active?T.forest:"#A8A49C"} opacity={active?1:.5}/>
      </svg>
    )},
  {id:"learn",label:"Apprendre",
    icon:(active:boolean)=>(
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 5H17M3 10H17M3 15H11" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="15" cy="15" r="3" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5"/>
        <path d="M15 13.5V15L16 16" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )},
  {id:"profile",label:"Profil",
    icon:(active:boolean)=>(
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3.5" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5"/>
        <path d="M3 17C3 14.2386 6.13401 12 10 12C13.866 12 17 14.2386 17 17" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
];

// ── App Root ──────────────────────────────────────────────────────
export default function App(){
  const[phase,setPhase]=useState<"splash"|"app">("splash");
  const[splashOut,setSplashOut]=useState(false);
  const[tab,setTab]=useState("home");
  const[reportTicker,setReportTicker]=useState<string|null>(null);
  const pfCtx=usePortfolios();
  useEffect(()=>{const t1=setTimeout(()=>setSplashOut(true),1600);const t2=setTimeout(()=>setPhase("app"),1950);return()=>{clearTimeout(t1);clearTimeout(t2);};},[]);
  const openReport=useCallback((t:string)=>setReportTicker(t),[]);
  const closeReport=useCallback(()=>setReportTicker(null),[]);

  return(
    <ToastProvider>
      <div style={{minHeight:"100vh",background:T.bg,display:"flex",justifyContent:"center"}}>
        <div style={{width:"100%",maxWidth:430,minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>

          {/* Splash */}
          {phase==="splash"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:28,animation:splashOut?"fadeOut .35s ease forwards":"none"}}>
              <div style={{animation:"fadeUp .5s ease forwards",opacity:0,textAlign:"center"}}>
                {/* Logo agrandi */}
                <div style={{width:100,height:100,borderRadius:30,background:T.forest,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",boxShadow:"0 24px 64px rgba(26,58,42,0.22)"}}>
                  <svg width="58" height="58" viewBox="0 0 24 24" fill="none">
                    <path d="M6 20V5C6 5 6 3 8 3C10 3 12 3 12 6C12 9 9 9 9 9" stroke="#C8E6C9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 9C9 9 10.5 11.5 12 12" stroke="#C8E6C9" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M12 12L18 6" stroke="#C8E6C9" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M14.5 6H18V9.5" stroke="#C8E6C9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {/* Titre aligné */}
                <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:40,fontWeight:800,color:T.text,letterSpacing:"-1.5px",lineHeight:1,marginBottom:8}}>PUR</div>
                <div style={{fontSize:14,color:T.textSub,letterSpacing:"0.02em",lineHeight:1}}>The new way to invest</div>
              </div>
              <div style={{display:"flex",gap:7,animation:"fadeUp .5s .3s ease forwards",opacity:0}}>
                {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:2.5,background:T.emerald,animation:`blink 1.2s ${i*.2}s ease-in-out infinite alternate`}}/>)}
              </div>
            </div>
          )}

          {/* App */}
          {phase==="app"&&<>
            {reportTicker&&(
              <div style={{position:"fixed",inset:0,background:T.bg,zIndex:200,display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto",overflowY:"auto"}}>
                <div style={{padding:"52px 20px 20px"}}>
                  <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16}}>
                    <button onClick={closeReport} style={{width:38,height:38,borderRadius:11,background:T.surface,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,cursor:"pointer",color:T.text}}>←</button>
                    <div><h1 style={{fontSize:18,fontWeight:800,color:T.text}}>{reportTicker}</h1><p style={{fontSize:11,color:T.textMuted}}>Rapport de conformité</p></div>
                  </div>
                  <StockCard ticker={reportTicker} onReport={()=>{}} pfCtx={pfCtx}/>
                </div>
              </div>
            )}
            {!reportTicker&&<>
              {tab==="home"      &&<HomeScreen      setTab={setTab} openReport={openReport}/>}
              {tab==="screen"    &&<ScreeningScreen openReport={openReport}/>}
              {tab==="portfolio" &&<PortfolioScreen setTab={setTab}/>}
              {tab==="watchlist" &&<WatchlistScreen/>}
              {tab==="learn"      &&<LearnScreen/>}
              {tab==="profile"   &&<ProfileScreen/>}

              <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:T.surface,borderTop:`1px solid ${T.border}`,display:"flex",padding:"8px 0 24px",zIndex:100}}>
                {TABS.map(t=>(
                  <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"5px 0",fontFamily:"inherit"}}>
                    {t.icon(tab===t.id)}
                    <span style={{fontSize:9,fontWeight:tab===t.id?700:400,color:tab===t.id?T.forest:T.textMuted,letterSpacing:"0.02em"}}>{t.label}</span>
                    {tab===t.id&&<div style={{width:14,height:2,borderRadius:1,background:T.forest}}/>}
                  </button>
                ))}
              </nav>
            </>}
          </>}
        </div>
      </div>
    </ToastProvider>
  );
}