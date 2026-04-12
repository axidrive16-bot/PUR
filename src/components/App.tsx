"use client";
import { useState, useEffect, useCallback, useMemo, useRef, memo, useReducer } from "react";
import { usePortfolioStore, useWatchlistStore, useUserStore } from "@/store/usePortfolioStore";
import { AAOIFI_RULES, calcScore, scoreToStatus, calcPurification, computePortfolioMetrics } from "@/domain/aaoifi";
import type { Asset, PortfolioItem, ChartPeriod, ChartPoint } from "@/domain/types";

// ── Tokens — PUR Design System ───────────────────────────────────────
const T = {
  // Backgrounds
  bg:        "#F5F4F0",   // warm off-white main background
  surface:   "#FFFFFF",   // elevated card surfaces
  card:      "#FFFFFF",   // card background

  // Borders — subtle, low opacity
  border:    "rgba(0,0,0,0.07)",
  borderMid: "rgba(0,0,0,0.12)",

  // Brand — PUR Emerald Green (CTA / halal / active only)
  green:     "#208640",
  greenDim:  "#20864010",
  greenMid:  "#20864028",

  // Status colors
  orange:    "#C2780C",   // douteux / warning
  orangeDim: "#C2780C10",
  red:       "#C93B3B",   // non-halal / negative
  redDim:    "#C93B3B10",
  blue:      "#2563EB",   // ESG / info
  blueDim:   "#2563EB10",
  purple:    "#7C3AED",

  // Typography hierarchy
  text:      "#0F172A",                   // primary text
  textSub:   "rgba(15,23,42,0.50)",       // secondary text
  textMuted: "rgba(15,23,42,0.28)",       // muted / disabled
};
const STATUS_CFG: Record<string,{color:string;dim:string;label:string;icon:string}> = {
  halal:       {color:T.green, dim:T.greenDim,  label:"Halal",        icon:"✓"},
  douteux:     {color:T.orange,dim:T.orangeDim, label:"Douteux",      icon:"⚠"},
  "non-halal": {color:T.red,  dim:T.redDim,    label:"Non conforme", icon:"✗"},
};
const FREEMIUM = { SCREENINGS: 3 };
const SUBSCRIPTION = { PRICE_EUR: 9.99, TRIAL_DAYS: 7 };
const SECTOR_COLORS = [T.green,T.blue,T.orange,T.purple,"#00b4d8","#ff6b9d"];

// ── Hooks SWR-like ─────────────────────────────────────────────────
function useAsync<T>(fn: () => Promise<T>, deps: any[] = []) {
  const [state, set] = useState<{data:T|null;isLoading:boolean;error:string|null}>({data:null,isLoading:true,error:null});
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    set(s => ({...s, isLoading:true, error:null}));
    fn()
      .then(d  => { if (mounted.current) set({data:d, isLoading:false, error:null}); })
      .catch(e => { if (mounted.current) set({data:null, isLoading:false, error:e.message}); });
    return () => { mounted.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

function useStock(ticker: string | null, period: ChartPeriod = "1M") {
  return useAsync(
    () => ticker
      ? fetch(`/api/stock/${ticker}?period=${period}`).then(r => { if (!r.ok) throw new Error("Ticker introuvable"); return r.json(); })
      : Promise.resolve(null),
    [ticker, period]
  );
}

function useSearch(query: string) {
  return useAsync(
    () => query.length >= 2
      ? fetch(`/api/search?q=${encodeURIComponent(query)}`).then(r => r.json())
      : Promise.resolve({ results: [] }),
    [query]
  );
}

function useDebounce<T>(v: T, d: number): T {
  const [db, set] = useState(v);
  useEffect(() => { const h = setTimeout(() => set(v), d); return () => clearTimeout(h); }, [v, d]);
  return db;
}

// ── Génère des points de graphique simulés (remplacé par FMP en prod) ─
function genPts(base: number, vol: number, n: number, tr: number): ChartPoint[] {
  let p = base*(1-tr*.5); const now = Date.now();
  const pts: ChartPoint[] = Array.from({length:n}, (_,i) => {
    p *= (1+(Math.random()-.48)*vol+tr/n);
    return { t: now-(n-i)*(86400000/n)*n, v: parseFloat(p.toFixed(2)) };
  });
  pts[pts.length-1].v = base;
  return pts;
}
function mkPeriods(b: number, vol: number, tr: number): Record<ChartPeriod, ChartPoint[]> {
  return {
    "1D": genPts(b, vol*.3, 48, tr*.02),
    "1S": genPts(b, vol*.5, 56, tr*.05),
    "1M": genPts(b, vol,   60, tr*.15),
    "1A": genPts(b, vol*1.5,52, tr),
  };
}

// ── Toast ─────────────────────────────────────────────────────────
let _toast: ((msg: string, type?: string) => void) | null = null;
const useToast = () => _toast ?? ((m: string) => console.log(m));

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, set] = useState<{id:number;msg:string;type:string}[]>([]);
  const add = useCallback((msg: string, type = "success") => {
    const id = Date.now();
    set(t => [...t, {id,msg,type}]);
    setTimeout(() => set(t => t.filter(x => x.id !== id)), 3200);
  }, []);
  _toast = add;
  return (
    <>
      {children}
      <div style={{position:"fixed",top:54,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 32px)",maxWidth:394,zIndex:999,display:"flex",flexDirection:"column",gap:7,pointerEvents:"none"}}>
        {toasts.map(t => (
          <div key={t.id} role="alert" style={{background:T.surface,border:`1px solid ${t.type==="success"?T.greenMid:T.borderMid}`,borderRadius:16,padding:"12px 16px",display:"flex",gap:10,alignItems:"center",animation:"toastIn .3s ease",boxShadow:"0 4px 24px rgba(0,0,0,0.12)"}}>
            <span>{t.type==="success"?"✅":t.type==="error"?"❌":"ℹ️"}</span>
            <span style={{fontSize:13,fontWeight:600,color:T.text}}>{t.msg}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Auth Modal ─────────────────────────────────────────────────────
function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode]       = useState<"signin"|"signup">("signin");
  const [email, setEmail]     = useState("");
  const [pw, setPw]           = useState("");
  const [pw2, setPw2]         = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const [confirm, setConfirm] = useState(false);
  const toast = useToast();

  const submit = async () => {
    setErr("");
    if (!email || !pw) { setErr("Tous les champs sont requis."); return; }
    if (mode === "signup" && pw !== pw2) { setErr("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Erreur"); setLoading(false); return; }
      if (data.needsConfirmation) { setConfirm(true); setLoading(false); return; }
      toast("Bienvenue ! 👋");
      onClose();
      window.location.reload();
    } catch {
      setErr("Erreur réseau");
    }
    setLoading(false);
  };

  if (confirm) return (
    <Modal onClose={onClose}>
      <div style={{textAlign:"center",padding:"20px 0"}}>
        <div style={{fontSize:52,marginBottom:16}}>📧</div>
        <h2 style={{fontSize:20,fontWeight:800,color:T.text,marginBottom:10}}>Vérifiez votre email</h2>
        <p style={{fontSize:13,color:T.textSub,lineHeight:1.7}}>Un lien de confirmation a été envoyé à <strong style={{color:T.text}}>{email}</strong>.</p>
        <button style={{...BS.btnGhost,marginTop:20,padding:"0 24px"}} onClick={onClose}>Fermer</button>
      </div>
    </Modal>
  );

  return (
    <Modal onClose={onClose}>
      <div style={{textAlign:"center",marginBottom:20}}>
        <h2 style={{fontSize:22,fontWeight:800,color:T.text,fontFamily:"Sora,sans-serif"}}>Halal<span style={{color:T.green}}>Screen</span></h2>
        <p style={{fontSize:12,color:T.textSub,marginTop:4}}>Finance islamique · {AAOIFI_RULES.VERSION}</p>
      </div>
      <div style={{...BS.segCtrl,marginBottom:16}}>
        {([["signin","Se connecter"],["signup","Créer un compte"]] as const).map(([id,lbl]) => (
          <button key={id} onClick={() => { setMode(id); setErr(""); }} style={{...BS.seg,...(mode===id?BS.segActive:{})}}>{lbl}</button>
        ))}
      </div>
      {err && <div style={{background:T.redDim,border:`1px solid ${T.red}30`,borderRadius:11,padding:"10px 14px",marginBottom:14,fontSize:13,color:T.red}}>{err}</div>}
      <label style={{fontSize:12,color:T.textSub,marginBottom:6,display:"block"}}>Email</label>
      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="vous@email.com" style={{...BS.input,marginBottom:12}} />
      <label style={{fontSize:12,color:T.textSub,marginBottom:6,display:"block"}}>Mot de passe</label>
      <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" style={{...BS.input,marginBottom:mode==="signup"?12:20}} />
      {mode === "signup" && <>
        <label style={{fontSize:12,color:T.textSub,marginBottom:6,display:"block"}}>Confirmer</label>
        <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="••••••••" style={{...BS.input,marginBottom:20}} />
      </>}
      <button style={{...BS.btnPrimary,opacity:loading?.7:1}} onClick={submit} disabled={loading}>
        {loading ? "Chargement…" : mode === "signin" ? "Se connecter" : "Créer mon compte"}
      </button>
    </Modal>
  );
}

// ── Primitives ─────────────────────────────────────────────────────
const Modal = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",animation:"fadeIn .2s ease"}} onClick={onClose}>
    {/* Bottom sheet — white surface, 24px top radius */}
    <div style={{background:T.surface,width:"100%",maxWidth:430,borderRadius:"24px 24px 0 0",padding:"20px 24px 48px",maxHeight:"92vh",overflowY:"auto",animation:"sheetUp .32s cubic-bezier(.34,1.2,.64,1)",boxShadow:"0 -8px 48px rgba(0,0,0,0.12)"}} onClick={e=>e.stopPropagation()}>
      {/* Drag handle */}
      <div style={{width:36,height:4,borderRadius:2,background:T.borderMid,margin:"0 auto 24px"}}/>
      {children}
    </div>
  </div>
);

function Skeleton({ w="100%", h=14, r=7 }: { w?:string|number; h?:number; r?:number }) {
  return <div style={{width:w,height:h,borderRadius:r,background:"linear-gradient(90deg,#EDECEA 25%,#F5F4F2 50%,#EDECEA 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite"}}/>;
}
function LoadingCard() {
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:24,padding:22,marginBottom:12,boxShadow:"0 4px 24px rgba(0,0,0,0.04)"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
        <div style={{flex:1,marginRight:16}}><Skeleton h={20} w="60%" r={4}/><div style={{marginTop:8}}><Skeleton h={14} w="40%" r={4}/></div></div>
        <Skeleton w={48} h={48} r={24}/>
      </div>
      <Skeleton h={60} r={8}/><div style={{marginTop:10}}><Skeleton h={8} r={4}/></div>
    </div>
  );
}

const ScoreRing = memo(({ score, size=64 }: { score:number; size?:number }) => {
  const color = score>=75?T.green:score>=45?T.orange:T.red;
  const r=size*.38, c=2*Math.PI*r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`HalalScore™ ${score}/100`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${(score/100)*c} ${c}`} strokeDashoffset={c*.25} strokeLinecap="round"
        style={{transition:"stroke-dasharray .9s ease"}}/>
      <text x={size/2} y={size/2+5} textAnchor="middle" fill={color} fontSize={size*.2} fontWeight="800" fontFamily="Sora,sans-serif">{score}</text>
    </svg>
  );
});
ScoreRing.displayName = "ScoreRing";

const RatioBar = memo(({ label, value, limitKey, detail }: { label:string; value:number; limitKey:keyof typeof AAOIFI_RULES; detail:string }) => {
  const [open, setOpen] = useState(false);
  const limit = AAOIFI_RULES[limitKey] as number ?? 33;
  const ok = value < limit, pct = Math.min((value/limit)*100, 100);
  return (
    <div style={{marginBottom:14}}>
      <button onClick={() => setOpen(o=>!o)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,fontFamily:"inherit"}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{width:18,height:18,borderRadius:5,background:ok?T.greenDim:T.redDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:ok?T.green:T.red,fontWeight:800}}>{ok?"✓":"✗"}</div>
          <span style={{fontSize:13,color:T.textSub}}>{label}</span>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:700,color:ok?T.green:T.red}}>{value}%</span>
          <span style={{fontSize:11,color:T.textMuted}}>/{limit}%</span>
          <span style={{fontSize:10,color:T.textMuted}}>{open?"▲":"▼"}</span>
        </div>
      </button>
      <div style={{height:5,background:T.border,borderRadius:3,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:ok?T.green:T.red,borderRadius:3,transition:"width .8s ease"}}/>
      </div>
      {open && <div style={{fontSize:12,color:T.textSub,marginTop:8,padding:"10px 12px",background:T.surface,borderRadius:10,lineHeight:1.7}}>{detail}<br/><span style={{color:T.textMuted,fontSize:11}}>Standard: {AAOIFI_RULES.VERSION} · Seuil: {limit}%</span></div>}
    </div>
  );
});
RatioBar.displayName = "RatioBar";

const Chart = memo(({ periods, currentPeriod, onPeriodChange, color=T.green, height=110 }: {
  periods: Record<ChartPeriod, ChartPoint[]>;
  currentPeriod: ChartPeriod;
  onPeriodChange: (p: ChartPeriod) => void;
  color?: string;
  height?: number;
}) => {
  const [hov, setHov] = useState<number|null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const data = periods?.[currentPeriod] || [];
  const W=370, H=height, PB=24, PT=6, pH=H-PB-PT;
  const vals = data.map(d=>d.v);
  const min=Math.min(...vals)||0, max=Math.max(...vals)||1, range=max-min||1;
  const pts = data.map((d,i) => ({x:(i/(data.length-1||1))*W, y:PT+pH-((d.v-min)/range)*pH, v:d.v, t:d.t}));
  const poly = pts.map(p=>`${p.x},${p.y}`).join(" ");
  const area = `M${pts[0]?.x||0},${PT+pH} ${pts.map(p=>`L${p.x},${p.y}`).join(" ")} L${pts[pts.length-1]?.x||W},${PT+pH} Z`;
  const gid  = `cg${color.replace(/[^a-z0-9]/gi,"")}${currentPeriod}`;
  const fmtT = (ts: number, p: string) => {
    const d=new Date(ts);
    if(p==="1D") return d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    if(p==="1S") return ["Di","Lu","Ma","Me","Je","Ve","Sa"][d.getDay()];
    if(p==="1M") return d.toLocaleDateString("fr-FR",{day:"numeric",month:"short"});
    return d.toLocaleDateString("fr-FR",{month:"short",year:"2-digit"});
  };
  const lblIdxs = data.length>1?[0,Math.floor(data.length*.25),Math.floor(data.length*.5),Math.floor(data.length*.75),data.length-1]:[];
  const hovPt = hov!==null?pts[hov]:null;
  const onMove = useCallback((e: React.MouseEvent|React.TouchEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX || 0 : e.clientX;
    const xS = (clientX - rect.left) * (W / rect.width);
    let ci=0, md=Infinity;
    pts.forEach((p,i) => { const d=Math.abs(p.x-xS); if(d<md){md=d;ci=i;} });
    setHov(ci);
  }, [pts]);

  if (!data.length) return (
    <div>
      <div style={{display:"flex",gap:4,marginBottom:10}}>
        {(["1D","1S","1M","1A"] as ChartPeriod[]).map(p=>(
          <button key={p} onClick={()=>onPeriodChange(p)} style={{flex:1,height:32,background:currentPeriod===p?color:T.bg,color:currentPeriod===p?"#FFFFFF":T.textSub,border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{p}</button>
        ))}
      </div>
      <div style={{height:height,background:T.bg,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:12,color:T.textMuted}}>Graphique disponible avec la clé FMP complète</span>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",gap:4,marginBottom:10}}>
        {(["1D","1S","1M","1A"] as ChartPeriod[]).map(p=>(
          <button key={p} onClick={()=>onPeriodChange(p)} style={{flex:1,height:32,background:currentPeriod===p?color:T.bg,color:currentPeriod===p?"#FFFFFF":T.textSub,border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{p}</button>
        ))}
      </div>
      <div style={{height:24,marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
        {hovPt ? <><span style={{fontSize:15,fontWeight:800,color:T.text,fontFamily:"Sora,sans-serif"}}>{hovPt.v.toFixed(2)}$</span><span style={{fontSize:11,color:T.textSub}}>{fmtT(hovPt.t,currentPeriod)}</span></> : <span style={{fontSize:11,color:T.textMuted}}>Survolez le graphique</span>}
      </div>
      <div style={{marginLeft:-4,marginRight:-4,cursor:"crosshair"}} onMouseMove={onMove} onMouseLeave={()=>setHov(null)} onTouchMove={onMove} onTouchEnd={()=>setHov(null)}>
        <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",overflow:"visible"}}>
          <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".22"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
          <path d={area} fill={`url(#${gid})`}/>
          <polyline points={poly} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {lblIdxs.map((idx,i) => pts[idx] && (
            <text key={i} x={pts[idx].x} y={H-4} textAnchor={i===0?"start":i===lblIdxs.length-1?"end":"middle"} fill={T.textMuted} fontSize="9" fontFamily="DM Sans,sans-serif">
              {fmtT(data[idx].t, currentPeriod)}
            </text>
          ))}
          <line x1="0" y1={PT+pH+1} x2={W} y2={PT+pH+1} stroke={T.border} strokeWidth="1"/>
          {hovPt && <>
            <line x1={hovPt.x} y1={PT} x2={hovPt.x} y2={PT+pH} stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity=".6"/>
            <circle cx={hovPt.x} cy={hovPt.y} r="4" fill={color} stroke={T.bg} strokeWidth="2"/>
          </>}
        </svg>
      </div>
    </div>
  );
});
Chart.displayName = "Chart";

// ── Upgrade Modal ─────────────────────────────────────────────────
function UpgradeModal({ onClose }: { onClose: () => void }) {
  const setIsPremium = useUserStore(s => s.setIsPremium);
  const toast = useToast();
  const feats = ["Screenings illimités","ETF islamiques certifiés","Rapports complets","Alertes conformité","Historique HalalScore™","Score ESG","Purification auto","Support prioritaire"];
  return (
    <Modal onClose={onClose}>
      <h2 style={{fontSize:22,fontWeight:800,color:T.text,fontFamily:"Sora,sans-serif",marginBottom:6}}>HalalScreen Premium</h2>
      <p style={{fontSize:13,color:T.textSub,marginBottom:18,lineHeight:1.7}}>Investissez en accord avec vos valeurs.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:18}}>
        {feats.map(f=><div key={f} style={{display:"flex",gap:7,alignItems:"center",fontSize:12,color:T.text}}><div style={{width:15,height:15,borderRadius:4,background:T.greenDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:T.green,fontWeight:800,flexShrink:0}}>✓</div>{f}</div>)}
      </div>
      <div style={{background:T.bg,borderRadius:16,padding:20,textAlign:"center",marginBottom:16,border:`1px solid ${T.borderMid}`}}>
        <div style={{fontSize:34,fontWeight:800,color:T.text,fontFamily:"Sora,sans-serif"}}>{SUBSCRIPTION.PRICE_EUR}€</div>
        <div style={{fontSize:12,color:T.textSub}}>par mois · {SUBSCRIPTION.TRIAL_DAYS} jours gratuits</div>
      </div>
      <button style={BS.btnPrimary} onClick={() => { setIsPremium(true); toast("Premium activé ⭐"); onClose(); }}>
        Commencer — {SUBSCRIPTION.TRIAL_DAYS} jours gratuits
      </button>
      <button style={{...BS.btnGhost,width:"100%",marginTop:10}} onClick={onClose}>Pas maintenant</button>
    </Modal>
  );
}

// ── StockCard — branché sur /api/stock/[ticker] ────────────────────
function StockCard({ ticker, onReport }: { ticker: string; onReport: (t: string) => void }) {
  const pfAdd    = usePortfolioStore(s => s.add);
  const inPf     = usePortfolioStore(s => s.inPortfolio);
  const wlToggle = useWatchlistStore(s => s.toggle);
  const inWl     = useWatchlistStore(s => s.inList);
  const isPremium= useUserStore(s => s.isPremium);
  const toast    = useToast();
  const [period, setPeriod] = useState<ChartPeriod>("1M");
  const [showWhy, setShowWhy]       = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data, isLoading, error } = useStock(ticker, period);
  const asset = data?.asset;

  // Enrichit les périodes avec des données simulées si FMP ne les fournit pas
  const enrichedPeriods = useMemo(() => {
    if (!asset) return {"1D":[],"1S":[],"1M":[],"1A":[]};
    const hist = data?.history?.[period] ?? [];
    if (hist.length > 0) return {...asset.periods, [period]: hist};
    return mkPeriods(asset.price, (asset.beta??1)*.015, (asset.change??0)>0?.8:-.3);
  }, [asset, data, period]);

  if (isLoading) return <LoadingCard/>;
  if (error || !asset) return (
    <div style={{background:T.surface,border:`1px solid ${T.redDim}`,borderRadius:20,padding:20,color:T.red,fontSize:13,fontWeight:500,boxShadow:"0 4px 24px rgba(0,0,0,0.04)"}}>
      ❌ {error || "Ticker introuvable"}
    </div>
  );

  const cfg       = STATUS_CFG[asset.status] ?? STATUS_CFG.halal;
  const isInPf    = inPf(ticker);
  const isWatched = inWl(ticker);
  const chartColor= (asset.change??0) >= 0 ? T.green : T.red;

  return (
    <article aria-label={`Fiche ${ticker}`} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:24,overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,0.05)"}}>
      {/* Status banner — colored tint strip */}
      <div style={{background:cfg.dim,padding:"9px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{width:20,height:20,borderRadius:6,background:cfg.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#000"}}>{cfg.icon}</div>
          <span style={{fontSize:12,fontWeight:800,color:cfg.color}}>{cfg.label}</span>
        </div>
        <span style={{fontSize:11,color:T.textSub}}>{AAOIFI_RULES.VERSION}</span>
      </div>

      {/* Card body — increased padding for breathing room */}
      <div style={{padding:22}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <h2 style={{fontSize:24,fontWeight:800,color:T.text,fontFamily:"Sora,sans-serif",letterSpacing:"-.5px",margin:0}}>{ticker}</h2>
            <p style={{fontSize:13,color:T.textSub,marginBottom:7}}>{asset.name}</p>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {[[asset.sector,T.blue],[`${asset.country} ${asset.mktCap}`,T.textSub],[(asset.divYield??0)>0?`${asset.divYield}% div.`:null,T.orange],[asset.volatility,asset.volatility==="Faible"?T.green:asset.volatility==="Élevée"?T.red:T.orange]].filter(([v])=>v).map(([v,c],i)=>(
                <span key={i} style={{fontSize:11,background:`${c}16`,color:c as string,padding:"3px 8px",borderRadius:20,fontWeight:600}}>{v}</span>
              ))}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
            <ScoreRing score={asset.score} size={60}/>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <span style={{fontSize:9,color:T.textSub}}>ESG</span>
              <div style={{height:3,width:32,background:T.border,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${asset.esgScore}%`,background:T.blue,borderRadius:2}}/></div>
              <span style={{fontSize:9,color:T.blue,fontWeight:700}}>{asset.esgScore}</span>
            </div>
          </div>
        </div>

        {/* Prix */}
        <div style={{marginBottom:13}}>
          <div style={{fontSize:28,fontWeight:800,color:T.text,fontFamily:"Sora,sans-serif"}}>{asset.price}$</div>
          <div style={{fontSize:13,color:chartColor,fontWeight:600}}>{(asset.change??0)>=0?"+":""}{asset.change}% aujourd'hui</div>
        </div>

        {/* Graphique */}
        <Chart periods={enrichedPeriods} currentPeriod={period} onPeriodChange={setPeriod} color={chartColor} height={110}/>

        {/* AAOIFI Ratios — soft background tray */}
        <div style={{background:T.bg,borderRadius:16,padding:18,marginBottom:14,marginTop:16,border:`1px solid ${T.border}`}}>
          <p style={{fontSize:11,color:T.textSub,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:16}}>Ratios {AAOIFI_RULES.VERSION}</p>
          <RatioBar label="Dette / actifs" value={asset.ratioDebt} limitKey="DEBT_MAX" detail={`${ticker} à ${asset.ratioDebt}%.`}/>
          <RatioBar label="Revenus haram"  value={asset.ratioRevHaram} limitKey="HARAM_REVENUE_MAX" detail={`${ticker} à ${asset.ratioRevHaram}%.`}/>
          <RatioBar label="Liquidités"     value={asset.ratioCash} limitKey="CASH_MAX" detail={`${ticker} à ${asset.ratioCash}%.`}/>
        </div>

        {/* Historique score (Premium) */}
        {isPremium && asset.scoreHistory.length > 0 && (
          <div style={{background:T.bg,borderRadius:16,padding:18,marginBottom:14,border:`1px solid ${T.border}`}}>
            <p style={{fontSize:11,color:T.textSub,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>HalalScore™ — {asset.scoreHistory.length} trimestres</p>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",height:44}}>
              {asset.scoreHistory.map((v: number,i: number) => {
                const col = v>=75?T.green:v>=45?T.orange:T.red;
                return <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flex:1}}>
                  <span style={{fontSize:9,color:T.textSub}}>{v}</span>
                  <div style={{width:"68%",borderRadius:"2px 2px 0 0",background:`${col}${i===asset.scoreHistory.length-1?"":"88"}`,height:`${(v/100)*34}px`,minHeight:3}}/>
                </div>;
              })}
            </div>
          </div>
        )}
        {!isPremium && (
          <button onClick={()=>setShowUpgrade(true)} style={{width:"100%",background:T.bg,border:`1px solid ${T.borderMid}`,borderRadius:16,padding:"13px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",fontFamily:"inherit"}}>
            <div><div style={{fontSize:12,fontWeight:700,color:T.orange,marginBottom:2}}>⭐ Historique HalalScore™</div><div style={{fontSize:11,color:T.textSub}}>Évolution sur 2 ans</div></div>
            <span style={{fontSize:12,color:T.orange}}>→</span>
          </button>
        )}

        {/* Pourquoi halal — collapsible tray */}
        <div style={{background:T.bg,borderRadius:16,overflow:"hidden",marginBottom:14,border:`1px solid ${T.border}`}}>
          <button onClick={()=>setShowWhy(w=>!w)} style={{width:"100%",padding:"12px 14px",display:"flex",justifyContent:"space-between",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>Pourquoi {asset.status==="halal"?"conforme":asset.status==="douteux"?"douteuse":"non conforme"} ?</span>
            <span style={{color:T.textMuted}}>{showWhy?"▲":"▼"}</span>
          </button>
          {showWhy && (
            <div style={{padding:"0 14px 14px"}}>
              {asset.whyHalal.map((w: { ok: boolean; label: string; detail: string },i: number) => (
                <div key={i} style={{display:"flex",gap:9,marginBottom:11}}>
                  <div style={{width:18,height:18,borderRadius:5,background:w.ok?T.greenDim:T.redDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:w.ok?T.green:T.red,fontWeight:800,flexShrink:0,marginTop:1}}>{w.ok?"✓":"✗"}</div>
                  <div><p style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:2}}>{w.label}</p><p style={{fontSize:12,color:T.textSub,lineHeight:1.65}}>{w.detail}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purification */}
        {(asset.divAnnual??0) > 0 && (
          <div style={{background:T.bg,border:`1px solid ${T.borderMid}`,borderRadius:16,padding:16,marginBottom:14}}>
            <p style={{fontSize:12,fontWeight:700,color:T.orange,marginBottom:7}}>🌙 Purification dividendes</p>
            <div style={{display:"flex",gap:14}}>
              <div><p style={{fontSize:10,color:T.textSub,marginBottom:3}}>Dividende/an</p><p style={{fontSize:13,fontWeight:700,color:T.text}}>{asset.divAnnual}$</p></div>
              <div><p style={{fontSize:10,color:T.textSub,marginBottom:3}}>Part haram</p><p style={{fontSize:13,fontWeight:700,color:T.orange}}>{asset.divHaramPct}%</p></div>
              <div><p style={{fontSize:10,color:T.textSub,marginBottom:3}}>À purifier</p><p style={{fontSize:13,fontWeight:700,color:T.orange}}>{calcPurification(asset.divAnnual??0, asset.divHaramPct??0).toFixed(3)}$</p></div>
            </div>
          </div>
        )}

        {/* CTAs — 48px touch targets, 16px radius */}
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{pfAdd(asset);toast(isInPf?`${ticker} déjà dans le portefeuille`:`${ticker} ajouté ✓`,isInPf?"info":"success");}} style={{flex:1,height:50,background:T.green,border:"none",borderRadius:16,color:"#FFFFFF",fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:15,cursor:"pointer",letterSpacing:"-.1px"}}>+ Portefeuille</button>
          <button onClick={()=>{wlToggle(asset);toast(isWatched?`Retiré de la watchlist`:`${ticker} ajouté 🔖`);}} style={{width:50,height:50,background:isWatched?T.orangeDim:T.bg,border:`1px solid ${isWatched?T.orange:T.borderMid}`,borderRadius:16,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>🔖</button>
          <button onClick={()=>onReport(ticker)} style={{width:50,height:50,background:isPremium?T.bg:T.bg,border:`1px solid ${T.borderMid}`,borderRadius:16,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}} title="Rapport complet">📋</button>
        </div>
      </div>
      {showUpgrade && <UpgradeModal onClose={()=>setShowUpgrade(false)}/>}
    </article>
  );
}

// ── Screens ─────────────────────────────────────────────────────────
function HomeScreen({ setTab, openReport }: { setTab:(t:string)=>void; openReport:(t:string)=>void }) {
  const metrics  = usePortfolioStore(s => s.metrics);
  const holdings = usePortfolioStore(s => s.holdings);
  const isPremium= useUserStore(s => s.isPremium);
  const screenings=useUserStore(s => s.screenings);
  const toast    = useToast();
  const [q, setQ]             = useState("");
  const [ticker, setTicker]   = useState<string|null>(null);
  const [showUp, setShowUp]   = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const dq = useDebounce(q, 400);
  const { data: searchData }  = useSearch(dq);
  const m = metrics;

  const pfData = useMemo(() => [3050,3180,3120,3300,3280,3450,3420,m.value].map((v,i,a)=>({t:Date.now()-(a.length-i)*86400000*4,v})), [m.value]);
  const pfPeriods = useMemo(() => ({"1D":pfData,"1S":pfData,"1M":pfData,"1A":pfData}), [pfData]);

  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease"}}>
      {/* Home header — breathing room, brand mark */}
      <header style={{padding:"56px 24px 20px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <p style={{fontSize:11,color:T.textSub,marginBottom:4,textTransform:"uppercase",letterSpacing:"1px",fontWeight:500}}>Dashboard</p>
          <h1 style={{fontSize:24,fontWeight:800,color:T.text,fontFamily:"Sora,sans-serif",letterSpacing:"-.5px"}}>Halal<span style={{color:T.green}}>Screen</span></h1>
        </div>
        <button onClick={()=>isPremium?null:setShowAuth(true)} style={{...BS.iconBtn,background:isPremium?"linear-gradient(135deg,#D97706,#C2780C)":T.surface}}>
          {isPremium?"⭐":"👤"}
        </button>
      </header>

      {/* Portfolio card section */}
      <section style={{padding:"0 24px 16px"}}>
        {/* Dark premium portfolio card — Deep Forest on light bg */}
        <div style={{background:"linear-gradient(145deg,#0A3B1C,#0d4a24)",border:"none",borderRadius:24,padding:"24px 24px 18px",overflow:"hidden",boxShadow:"0 8px 40px rgba(10,59,28,0.22)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div>
              <p style={{fontSize:11,color:"rgba(255,255,255,.55)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Portefeuille</p>
              <p style={{fontSize:32,fontWeight:800,color:T.text,fontFamily:"Sora,sans-serif",letterSpacing:"-1.5px"}}>{m.value.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}</p>
              <p style={{fontSize:13,color:m.gain>=0?T.green:T.red,fontWeight:600,marginTop:2}}>{m.gain>=0?"+":""}{m.gain.toFixed(0)}€ ({m.gain>=0?"+":""}{m.gainPct.toFixed(2)}%)</p>
            </div>
            <ScoreRing score={m.conform} size={56}/>
          </div>
          <div style={{display:"flex",gap:0,borderTop:`1px solid ${T.border}`,paddingTop:12}}>
            {[{l:"AAOIFI",v:`${m.conform}/100`,c:T.green},{l:"ESG",v:`${m.esg}/100`,c:T.blue},{l:"Diversif.",v:`${m.divers}/100`,c:T.purple},{l:"Risque",v:`${m.risk}/100`,c:m.risk>70?T.green:T.orange}].map((s,i)=>(
              <div key={i} style={{flex:1,borderLeft:i>0?`1px solid ${T.border}`:"",paddingLeft:i>0?12:0}}>
                <p style={{fontSize:9,color:"rgba(255,255,255,.50)",marginBottom:3,letterSpacing:".3px"}}>{s.l}</p>
                <p style={{fontSize:14,fontWeight:800,color:s.c}}>{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick action cards — white surface, 18px radius */}
      <section style={{padding:"0 24px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <button onClick={()=>setTab("screen")} style={{...BS.quickAction,background:T.surface,color:T.green}}>
          <span style={{fontSize:22}}>🔍</span>
          <span style={{fontSize:14,fontWeight:700,color:T.text}}>Screening</span>
          <span style={{fontSize:12,color:T.textSub,fontWeight:400}}>{isPremium?"Illimité":`${FREEMIUM.SCREENINGS-screenings} restants`}</span>
        </button>
        <button onClick={()=>setTab("portfolio")} style={{...BS.quickAction,background:T.surface,color:T.blue}}>
          <span style={{fontSize:22}}>📊</span>
          <span style={{fontSize:14,fontWeight:700,color:T.text}}>Portefeuille</span>
          <span style={{fontSize:12,color:T.textSub,fontWeight:400}}>{holdings.length} positions</span>
        </button>
      </section>

      {/* Quick search section */}
      <section style={{padding:"0 24px 16px"}}>
        <div style={{position:"relative"}}>
          <div style={{display:"flex",gap:8}}>
            <input style={BS.input} placeholder="Vérifier une action (ex: AAPL, MSFT)" value={q} onChange={e=>{setQ(e.target.value);if(!e.target.value)setTicker(null);}} onKeyDown={e=>e.key==="Enter"&&searchData?.results?.[0]&&setTicker(searchData.results[0].ticker)}/>
            <button style={{...BS.iconBtn,background:T.green,width:52,flexShrink:0,fontSize:18,color:"#fff",border:"none"}} onClick={()=>searchData?.results?.[0]&&setTicker(searchData.results[0].ticker)}>→</button>
          </div>
          {searchData?.results?.length > 0 && q && !ticker && (
            <div style={{position:"absolute",top:60,left:0,right:56,background:T.surface,border:`1px solid ${T.borderMid}`,borderRadius:16,zIndex:10,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.10)"}}>
              {searchData.results.slice(0,4).map((r: any) => (
                <button key={r.ticker} onClick={()=>{setTicker(r.ticker);setQ(r.ticker);}} style={{width:"100%",padding:"12px 16px",display:"flex",justifyContent:"space-between",background:"none",border:"none",borderBottom:`1px solid ${T.border}`,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                  <div><div style={{fontSize:14,fontWeight:700,color:T.text}}>{r.ticker}</div><div style={{fontSize:12,color:T.textSub}}>{r.name}</div></div>
                  <span style={{fontSize:11,color:T.textSub}}>{r.exchange}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {!isPremium && (
          <div style={{display:"flex",gap:5,marginTop:8,alignItems:"center"}}>
            {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:3.5,background:i<screenings?T.green:T.border}}/>)}
            <span style={{fontSize:11,color:T.textSub,marginLeft:4}}>{screenings}/{FREEMIUM.SCREENINGS} aujourd'hui</span>
            <button style={{fontSize:11,color:T.green,background:"none",border:"none",cursor:"pointer",marginLeft:"auto",fontFamily:"inherit"}} onClick={()=>setShowUp(true)}>Illimité →</button>
          </div>
        )}
        {ticker && <div style={{marginTop:12}}><StockCard ticker={ticker} onReport={openReport}/></div>}
      </section>

      {showUp   && <UpgradeModal onClose={()=>setShowUp(false)}/>}
      {showAuth && <AuthModal   onClose={()=>setShowAuth(false)}/>}
    </div>
  );
}

function ScreeningScreen({ openReport }: { openReport:(t:string)=>void }) {
  const isPremium = useUserStore(s => s.isPremium);
  const screenings= useUserStore(s => s.screenings);
  const incScreenings = useUserStore(s => s.incScreenings);
  const [q, setQ]         = useState("");
  const [ticker, setTicker] = useState<string|null>(null);
  const [showUp, setShowUp] = useState(false);
  const dq = useDebounce(q, 300);
  const { data: searchData } = useSearch(dq);

  const doSearch = (t: string) => {
    if (!isPremium && screenings >= FREEMIUM.SCREENINGS) { setShowUp(true); return; }
    incScreenings();
    setTicker(t); setQ(t);
  };

  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease"}}>
      <header style={BS.pageHeader}>
        <h1 style={BS.pageTitle}>Screening</h1>
        {!isPremium && <div style={{fontSize:11,background:T.orangeDim,color:T.orange,padding:"4px 10px",borderRadius:20,fontWeight:700}}>{screenings}/{FREEMIUM.SCREENINGS}</div>}
      </header>
      <div style={{padding:"0 24px 16px"}}>
        <div style={{position:"relative"}}>
          <div style={{display:"flex",gap:8}}>
            <input style={BS.input} placeholder="Ticker ou nom de l'entreprise..." value={q} onChange={e=>{setQ(e.target.value);if(!e.target.value)setTicker(null);}}/>
            <button style={{...BS.iconBtn,background:T.green,width:52,flexShrink:0,fontSize:18,color:"#fff",border:"none"}} onClick={()=>searchData?.results?.[0]&&doSearch(searchData.results[0].ticker)}>→</button>
          </div>
          {searchData?.results?.length > 0 && q && !ticker && (
            <div style={{position:"absolute",top:60,left:0,right:56,background:T.surface,border:`1px solid ${T.borderMid}`,borderRadius:16,zIndex:10,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.10)"}}>
              {searchData.results.slice(0,6).map((r: any) => (
                <button key={r.ticker} onClick={()=>doSearch(r.ticker)} style={{width:"100%",padding:"12px 16px",display:"flex",justifyContent:"space-between",background:"none",border:"none",borderBottom:`1px solid ${T.border}`,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                  <div><div style={{fontSize:14,fontWeight:700,color:T.text}}>{r.ticker}</div><div style={{fontSize:12,color:T.textSub}}>{r.name}</div></div>
                  <span style={{fontSize:11,color:T.textSub,background:T.surface,padding:"2px 8px",borderRadius:6}}>{r.exchange}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p style={{fontSize:11,color:T.textSub,marginTop:8}}>Données réelles via Financial Modeling Prep · {AAOIFI_RULES.VERSION}</p>
      </div>
      {ticker && <div style={{padding:"0 24px 24px"}}><StockCard ticker={ticker} onReport={openReport}/></div>}
      {showUp && <UpgradeModal onClose={()=>setShowUp(false)}/>}
    </div>
  );
}

function PortfolioScreen({ setTab }: { setTab:(t:string)=>void }) {
  const { holdings, metrics: m, purified, markPurified, remove } = usePortfolioStore();
  const toast = useToast();
  const sectorSegs = useMemo(() => Object.entries(m.sectors).map(([k,v],i)=>({label:k,pct:(v/m.value)*100,color:SECTOR_COLORS[i%6]})), [m]);
  const yearPur = useMemo(() => {
    const y = new Date().getFullYear().toString();
    return purified.filter(e=>e.date.startsWith(y)).reduce((s,e)=>s+e.amount,0);
  }, [purified]);

  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease"}}>
      <header style={BS.pageHeader}>
        <h1 style={BS.pageTitle}>Portefeuille</h1>
        <button onClick={()=>setTab("screen")} style={{...BS.microBtn,color:T.green,borderColor:`${T.green}28`,padding:"6px 14px",fontSize:12}}>+ Ajouter</button>
      </header>

      {/* Total value card */}
      <section style={{padding:"0 24px 16px"}}>
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:24,padding:22,boxShadow:"0 4px 24px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <p style={{fontSize:11,color:T.textSub,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Valeur totale</p>
              <p style={{fontSize:30,fontWeight:800,color:T.text,fontFamily:"Sora,sans-serif",letterSpacing:"-1.5px"}}>{m.value.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}</p>
              <p style={{fontSize:13,color:m.gain>=0?T.green:T.red,fontWeight:600}}>{m.gain>=0?"+":""}{m.gain.toFixed(0)}€ ({m.gain>=0?"+":""}{m.gainPct.toFixed(2)}%)</p>
            </div>
            <ScoreRing score={m.conform} size={54}/>
          </div>
        </div>
      </section>

      {/* Score tiles — white cards, 4-column grid */}
      <section style={{padding:"0 24px 16px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {[{l:"AAOIFI",v:m.conform,c:T.green},{l:"ESG",v:m.esg,c:T.blue},{l:"Divers.",v:m.divers,c:T.purple},{l:"Risque",v:m.risk,c:m.risk>=70?T.green:T.orange}].map(s=>(
          <div key={s.l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:"14px 10px",boxShadow:"0 2px 8px rgba(0,0,0,0.03)"}}>
            <p style={{fontSize:9,color:T.textSub,marginBottom:5,textTransform:"uppercase"}}>{s.l}</p>
            <p style={{fontSize:16,fontWeight:800,color:s.c,fontFamily:"Sora,sans-serif",marginBottom:5}}>{s.v}</p>
            <div style={{height:3,background:T.border,borderRadius:2}}><div style={{height:"100%",width:`${s.v}%`,background:s.c,borderRadius:2}}/></div>
          </div>
        ))}
      </section>

      {/* Sector breakdown */}
      {sectorSegs.length > 0 && (
        <section style={{padding:"0 24px 16px"}}>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:20,boxShadow:"0 4px 24px rgba(0,0,0,0.04)"}}>
            <p style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:14}}>Répartition sectorielle</p>
            <div style={{flex:1}}>
              {sectorSegs.map(seg=>(
                <div key={seg.label} style={{display:"flex",justifyContent:"space-between",marginBottom:9}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{width:8,height:8,borderRadius:4,background:seg.color}}/>
                    <span style={{fontSize:13,color:T.textSub}}>{seg.label}</span>
                  </div>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <div style={{width:80,height:5,background:T.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${seg.pct}%`,background:seg.color,borderRadius:3}}/></div>
                    <span style={{fontSize:12,fontWeight:700,color:T.text,width:30,textAlign:"right"}}>{seg.pct.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Dividend purification card */}
      {m.divTot > 0 && (
        <section style={{padding:"0 24px 16px"}}>
          <div style={{background:T.surface,border:`1px solid ${T.borderMid}`,borderRadius:20,padding:20,boxShadow:"0 4px 24px rgba(0,0,0,0.04)"}}>
            <p style={{fontSize:13,fontWeight:700,color:T.orange,marginBottom:12}}>🌙 Purification des dividendes</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
              <div><p style={{fontSize:10,color:T.textSub,marginBottom:3}}>Dividendes/an</p><p style={{fontSize:13,fontWeight:700,color:T.text}}>{m.divTot.toFixed(2)}€</p></div>
              <div><p style={{fontSize:10,color:T.textSub,marginBottom:3}}>Part haram</p><p style={{fontSize:13,fontWeight:700,color:T.orange}}>{m.divTot?(m.divHar/m.divTot*100).toFixed(1):0}%</p></div>
              <div><p style={{fontSize:10,color:T.textSub,marginBottom:3}}>À purifier</p><p style={{fontSize:13,fontWeight:700,color:T.orange}}>{m.divHar.toFixed(2)}€</p></div>
            </div>
            {yearPur > 0 && <p style={{fontSize:12,color:T.green,marginBottom:10}}>✓ {yearPur.toFixed(2)}€ purifiés cette année</p>}
            <div style={{display:"flex",gap:8}}>
              <button style={{flex:1,height:40,background:`${T.orange}18`,border:`1px solid ${T.orange}35`,borderRadius:10,color:T.orange,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}} onClick={()=>{markPurified(m.divHar);toast(`${m.divHar.toFixed(2)}€ marqués purifiés 🌙`);}}>Marquer purifié</button>
              <button style={{flex:1,height:40,background:`${T.green}15`,border:`1px solid ${T.green}30`,borderRadius:10,color:T.green,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}} onClick={()=>toast("Redirection vers LaunchGood 🌍")}>Donner →</button>
            </div>
          </div>
        </section>
      )}

      {/* Positions list */}
      <section style={{padding:"0 24px 32px"}}>
        <p style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:4}}>Mes positions</p>
        <p style={{fontSize:12,color:T.textSub,marginBottom:14}}>{holdings.length} actifs</p>
        {holdings.length === 0 ? (
          <div style={{textAlign:"center",padding:"40px 0",color:T.textSub}}>
            <p style={{fontSize:32,marginBottom:8}}>📊</p>
            <p style={{fontSize:13}}>Portefeuille vide</p>
            <p style={{fontSize:11,marginTop:4}}>Faites un screening et ajoutez des actions</p>
          </div>
        ) : holdings.map(h => {
          const gain    = (h.price - h.paidPrice) * h.qty;
          const gainPct = ((h.price - h.paidPrice) / h.paidPrice * 100).toFixed(1);
          const cfg     = STATUS_CFG[h.status] ?? STATUS_CFG.halal;
          const divH    = calcPurification((h.divAnnual??0)*h.qty, h.divHaramPct??0);
          return (
            <article key={h.ticker} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:17,marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:11}}>
                <div style={{display:"flex",gap:11,alignItems:"center"}}>
                  <div style={{width:40,height:40,borderRadius:12,background:cfg.dim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:cfg.color}}>{h.ticker.slice(0,2)}</div>
                  <div><p style={{fontSize:14,fontWeight:700,color:T.text}}>{h.ticker}</p><p style={{fontSize:12,color:T.textSub}}>{h.qty} action{h.qty>1?"s":""} · PR {h.paidPrice}$</p></div>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontSize:14,fontWeight:700,color:T.text}}>{(h.price*h.qty).toFixed(0)}€</p>
                  <p style={{fontSize:12,fontWeight:600,color:gain>=0?T.green:T.red}}>{gain>=0?"+":""}{gain.toFixed(0)}€ ({gain>=0?"+":""}{gainPct}%)</p>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <div style={{display:"flex",gap:4,alignItems:"center"}}><div style={{width:5,height:5,borderRadius:2.5,background:cfg.color}}/><span style={{fontSize:11,color:cfg.color,fontWeight:700}}>{cfg.label}</span></div>
                  <span style={{fontSize:11,color:T.textSub}}>Score {h.score}</span>
                  {divH > 0 && <span style={{fontSize:11,color:T.orange}}>🌙 {divH.toFixed(2)}€/an</span>}
                </div>
                <button style={{...BS.microBtn,color:T.red,borderColor:`${T.red}22`}} onClick={()=>{remove(h.ticker);toast(`${h.ticker} retiré`,"info");}}>Retirer</button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function WatchlistScreen() {
  const { sorted, toggle } = useWatchlistStore();
  const toast = useToast();
  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease"}}>
      <header style={BS.pageHeader}><h1 style={BS.pageTitle}>Watchlist</h1></header>
      <section style={{padding:"0 20px 24px"}}>
        <p style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:3}}>Actions suivies</p>
        <p style={{fontSize:11,color:T.textSub,marginBottom:11}}>{sorted().length} · triées par HalalScore™</p>
        {sorted().length === 0 ? (
          <div style={{textAlign:"center",padding:"40px 0",color:T.textSub}}>
            <p style={{fontSize:32,marginBottom:8}}>🔖</p>
            <p style={{fontSize:13}}>Aucune action suivie</p>
            <p style={{fontSize:11,marginTop:4}}>Faites un screening et ajoutez des actions</p>
          </div>
        ) : sorted().map(s => {
          const cfg = STATUS_CFG[s.status] ?? STATUS_CFG.halal;
          return (
            <div key={s.ticker} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:16,marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
                <div style={{display:"flex",gap:9,alignItems:"center"}}>
                  <div style={{width:6,height:6,borderRadius:3,background:cfg.color}}/>
                  <div><p style={{fontSize:14,fontWeight:700,color:T.text}}>{s.ticker}</p><p style={{fontSize:12,color:T.textSub}}>{s.name}</p></div>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontSize:12,fontWeight:700,color:T.text}}>{s.price}$</span>
                  <span style={{fontSize:11,color:cfg.color,fontWeight:700}}>H:{s.score}</span>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <button style={{...BS.microBtn,color:T.red,borderColor:`${T.red}22`,fontSize:11}} onClick={()=>{toggle(s);toast(`${s.ticker} retiré`,"info");}}>Retirer</button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function ProfileScreen() {
  const { isPremium, screenings, setIsPremium } = useUserStore();
  const { purified } = usePortfolioStore();
  const toast = useToast();
  const [showUp, setShowUp]   = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const purTotal = useMemo(() => purified.reduce((s,p)=>s+p.amount,0), [purified]);

  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease"}}>
      <div style={{padding:"52px 20px 24px"}}>
        <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:22}}>
          <div style={{width:54,height:54,borderRadius:17,background:`linear-gradient(135deg,${T.green}25,${T.blue}18)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>👤</div>
          <div>
            <h1 style={{fontSize:18,fontWeight:800,color:T.text,fontFamily:"Sora,sans-serif"}}>Mon compte</h1>
            {isPremium && <span style={{display:"inline-block",marginTop:4,background:"linear-gradient(135deg,#f5a623,#f0932b)",color:"#000",fontSize:10,fontWeight:800,padding:"3px 10px",borderRadius:20}}>⭐ PREMIUM</span>}
          </div>
        </div>

        {/* Profile stat tiles */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}><p style={{fontSize:11,color:T.textSub,marginBottom:6,fontWeight:500}}>Screenings</p><p style={{fontSize:22,fontWeight:800,color:T.text,fontFamily:"Sora,sans-serif"}}>{screenings}</p></div>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}><p style={{fontSize:11,color:T.textSub,marginBottom:6,fontWeight:500}}>🌙 Purifiés</p><p style={{fontSize:22,fontWeight:800,color:T.orange,fontFamily:"Sora,sans-serif"}}>{purTotal.toFixed(2)}€</p></div>
        </div>

        {!isPremium && (
          <button onClick={()=>setShowUp(true)} style={{width:"100%",background:T.surface,border:`1px solid ${T.borderMid}`,borderRadius:22,padding:22,marginBottom:20,cursor:"pointer",textAlign:"left",fontFamily:"inherit",boxShadow:"0 4px 24px rgba(0,0,0,0.06)"}}>
            <p style={{fontSize:17,fontWeight:800,color:T.text,fontFamily:"Sora,sans-serif",marginBottom:6}}>Passer Premium ⭐</p>
            <p style={{fontSize:13,color:T.textSub,marginBottom:14,lineHeight:1.6}}>Screenings illimités · Rapports complets · ETF islamiques</p>
            <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:13}}>
              <span style={{fontSize:26,fontWeight:800,color:T.text,fontFamily:"Sora,sans-serif"}}>{SUBSCRIPTION.PRICE_EUR}€</span>
              <span style={{fontSize:12,color:T.textSub}}>/mois · {SUBSCRIPTION.TRIAL_DAYS} jours gratuits</span>
            </div>
            <div style={{background:T.green,borderRadius:14,padding:"13px",textAlign:"center",fontSize:14,fontWeight:700,color:"#FFFFFF",letterSpacing:"-.1px"}}>Commencer gratuitement</div>
          </button>
        )}

        <button onClick={()=>setShowAuth(true)} style={{width:"100%",background:T.surface,border:`1px solid ${T.borderMid}`,borderRadius:18,padding:18,marginBottom:14,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit",textAlign:"left",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",gap:11,alignItems:"center"}}><span style={{fontSize:17}}>🔐</span><span style={{fontSize:14,color:T.text}}>Se connecter / Créer un compte</span></div>
          <span style={{color:T.textMuted}}>›</span>
        </button>

        {[{icon:"🌙",label:"Purification dividendes"},{icon:"🏛",label:`Méthodologie ${AAOIFI_RULES.VERSION}`},{icon:"💬",label:"Support"}].map(item=>(
          <button key={item.label} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 0",borderTop:"none",borderLeft:"none",borderRight:"none",borderBottom:`1px solid ${T.border}`,cursor:"pointer",background:"none",fontFamily:"inherit",textAlign:"left"}}>
            <div style={{display:"flex",gap:11,alignItems:"center"}}><span style={{fontSize:17}}>{item.icon}</span><span style={{fontSize:14,color:T.text}}>{item.label}</span></div>
            <span style={{color:T.textMuted}}>›</span>
          </button>
        ))}

        {isPremium && <button style={{...BS.btnGhost,width:"100%",marginTop:18,color:T.red,borderColor:`${T.red}25`}} onClick={()=>{setIsPremium(false);toast("Abonnement annulé","info");}}>Annuler l'abonnement</button>}
      </div>
      {showUp   && <UpgradeModal onClose={()=>setShowUp(false)}/>}
      {showAuth && <AuthModal   onClose={()=>setShowAuth(false)}/>}
    </div>
  );
}

// ── Base styles — PUR Design System ────────────────────────────────
const BS = {
  // Increased top padding for breathing room
  pageHeader: {padding:"56px 24px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"},
  // Sora kept for display headings only
  pageTitle:  {fontSize:24,fontWeight:800,color:T.text,fontFamily:"Sora,sans-serif",letterSpacing:"-.5px"} as React.CSSProperties,
  // Larger input, white bg, subtle border
  input:      {flex:1,height:52,border:`1.5px solid ${T.borderMid}`,borderRadius:16,padding:"0 16px",fontSize:15,outline:"none",background:T.surface,color:T.text,fontFamily:"inherit",transition:"border-color .2s",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"} as React.CSSProperties,
  // 48px min touch target (PUR spec)
  iconBtn:    {width:48,height:48,borderRadius:14,background:T.surface,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:18,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"} as React.CSSProperties,
  // Primary CTA — emerald green, white text, 16px+ radius
  btnPrimary: {width:"100%",height:54,background:T.green,border:"none",borderRadius:16,color:"#FFFFFF",fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:16,cursor:"pointer",letterSpacing:"-.2px"} as React.CSSProperties,
  btnGhost:   {height:46,background:"none",border:`1.5px solid ${T.borderMid}`,borderRadius:14,color:T.textSub,fontFamily:"inherit",fontWeight:600,fontSize:13,cursor:"pointer"} as React.CSSProperties,
  microBtn:   {height:32,padding:"0 12px",background:"none",border:"1px solid",borderRadius:10,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"} as React.CSSProperties,
  // Quick action cards — white surface, soft shadow
  quickAction:{display:"flex",flexDirection:"column",gap:6,padding:"18px 16px",borderRadius:18,border:`1px solid ${T.border}`,cursor:"pointer",textAlign:"left",fontFamily:"inherit",boxShadow:"0 2px 12px rgba(0,0,0,0.04)"} as React.CSSProperties,
  segCtrl:    {display:"flex",background:T.bg,borderRadius:12,padding:3,border:`1px solid ${T.border}`} as React.CSSProperties,
  seg:        {flex:1,height:36,background:"none",border:"none",borderRadius:10,color:T.textSub,fontFamily:"inherit",fontWeight:600,fontSize:13,cursor:"pointer",transition:"all .15s"} as React.CSSProperties,
  segActive:  {background:T.surface,color:T.text,boxShadow:"0 1px 6px rgba(0,0,0,0.08)"} as React.CSSProperties,
};

const TABS = [
  {id:"home",      icon:"⊞", label:"Accueil"},
  {id:"screen",    icon:"🔍", label:"Screening"},
  {id:"portfolio", icon:"📊", label:"Portefeuille"},
  {id:"watchlist", icon:"🔖", label:"Watchlist"},
  {id:"profile",   icon:"👤", label:"Profil"},
];

// ── App Root ───────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase]       = useState<"splash"|"app">("splash");
  const [splashOut, setSplashOut] = useState(false);
  const [tab, setTab]           = useState("home");
  const [reportTicker, setReportTicker] = useState<string|null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setSplashOut(true), 1600);
    const t2 = setTimeout(() => setPhase("app"),    1950);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const openReport  = useCallback((t: string) => setReportTicker(t), []);
  const closeReport = useCallback(() => setReportTicker(null), []);

  return (
    <ToastProvider>
      <div style={{minHeight:"100vh",background:"#ECEAE5",display:"flex",justifyContent:"center"}}>
        <div style={{width:"100%",maxWidth:430,minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>

          {/* Splash */}
          {phase === "splash" && (
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,animation:splashOut?"fadeOut .35s ease forwards":"none"}}>
              <div style={{animation:"fadeUp .5s ease forwards",opacity:0,textAlign:"center"}}>
                {/* Icon mark */}
                <div style={{width:88,height:88,borderRadius:28,background:`linear-gradient(145deg,#0A3B1C,#208640)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,margin:"0 auto 24px",boxShadow:`0 16px 48px ${T.green}30`}}>🕌</div>
                <h1 style={{fontSize:34,fontWeight:800,color:T.text,fontFamily:"Sora,sans-serif",letterSpacing:"-1px"}}>Halal<span style={{color:T.green}}>Screen</span></h1>
                <p style={{fontSize:12,color:T.textSub,marginTop:8,letterSpacing:".4px"}}>{AAOIFI_RULES.VERSION} · Finance islamique</p>
              </div>
              {/* Loading dots */}
              <div style={{display:"flex",gap:7,animation:"fadeUp .5s .25s ease forwards",opacity:0}}>
                {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:3,background:T.green,opacity:.3,animation:`blink 1.2s ${i*.2}s ease-in-out infinite alternate`}}/>)}
              </div>
            </div>
          )}

          {/* App */}
          {phase === "app" && (
            <>
              {reportTicker && (
                <div style={{position:"fixed",inset:0,background:T.bg,zIndex:200,display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto",overflowY:"auto"}}>
                  <div style={{padding:"52px 20px 20px"}}>
                    <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16}}>
                      <button onClick={closeReport} style={{width:38,height:38,borderRadius:11,background:T.card,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer"}}>←</button>
                      <h1 style={{fontSize:20,fontWeight:800,color:T.text,fontFamily:"Sora,sans-serif"}}>{reportTicker} — Rapport</h1>
                    </div>
                    <StockCard ticker={reportTicker} onReport={()=>{}}/>
                  </div>
                </div>
              )}
              {!reportTicker && (
                <>
                  {tab==="home"      && <HomeScreen      setTab={setTab} openReport={openReport}/>}
                  {tab==="screen"    && <ScreeningScreen openReport={openReport}/>}
                  {tab==="portfolio" && <PortfolioScreen setTab={setTab}/>}
                  {tab==="watchlist" && <WatchlistScreen/>}
                  {tab==="profile"   && <ProfileScreen/>}

                  {/* Bottom nav — elevated white, top border divider */}
                  <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(255,255,255,0.94)",borderTop:`1px solid ${T.border}`,backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",display:"flex",padding:"8px 0 24px",zIndex:100,boxShadow:"0 -4px 24px rgba(0,0,0,0.05)"}}>
                    {TABS.map(t => (
                      <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"6px 0",fontFamily:"inherit"}}>
                        {/* Icon — active full opacity, inactive muted */}
                        <span style={{fontSize:19,filter:tab===t.id?"none":"grayscale(1) opacity(0.30)",transition:"filter .2s"}}>{t.icon}</span>
                        <span style={{fontSize:10,fontWeight:tab===t.id?700:500,color:tab===t.id?T.green:T.textMuted,letterSpacing:".1px"}}>{t.label}</span>
                        {/* Active dot indicator */}
                        {tab===t.id && <div style={{width:4,height:4,borderRadius:2,background:T.green}}/>}
                      </button>
                    ))}
                  </nav>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </ToastProvider>
  );
}
