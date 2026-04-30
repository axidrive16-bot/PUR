"use client";
import { useState, useMemo } from "react";
import { portfolioDB } from "@/lib/db";
import { usePortfolios } from "@/hooks/usePortfolios";
import { T, BS, SECTOR_COLORS, scoreInfo } from "@/components/ui/tokens";
import { Chart } from "@/components/ui/Chart";
import { PieChart } from "@/components/ui/Chart";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { InfoTooltip } from "@/components/ScoreTooltip";

const BENCHMARKS: Record<string,{label:string;trend:number}>={
  "sp500":  {label:"S&P 500",   trend:0.18},
  "cac40":  {label:"CAC 40",    trend:0.09},
  "msci":   {label:"MSCI World",trend:0.14},
  "nasdaq": {label:"NASDAQ",    trend:0.24},
};

export function PortfolioScreen({setTab}:{setTab:(t:string)=>void}){
  const pfCtx=usePortfolios();
  const toast=useToast();
  const[showCreate,setShowCreate]=useState(false);
  const[newName,setNewName]=useState("");
  const[editId,setEditId]=useState<string|null>(null);
  const[editName,setEditName]=useState("");
  const[pfPeriod,setPfPeriod]=useState<"1J"|"1M"|"YTD"|"1A"|"5A">("1M");
  const[benchmark,setBenchmark]=useState("sp500");
  const[showBenchmark,setShowBenchmark]=useState(false);
  const m=pfCtx.metrics;

  const pfPts=useMemo(()=>{
    const now=Date.now();
    const cfgMap:{[k:string]:{n:number;span:number;vol:number;tr:number}}={
      "1J":{n:24,span:86400000,vol:.004,tr:.005},
      "1M":{n:30,span:30*86400000,vol:.012,tr:.04},
      "YTD":{n:Math.max(7,Math.floor((Date.now()-new Date(new Date().getFullYear(),0,1).getTime())/86400000)),span:Date.now()-new Date(new Date().getFullYear(),0,1).getTime(),vol:.015,tr:.09},
      "1A":{n:52,span:365*86400000,vol:.018,tr:.15},
      "5A":{n:60,span:5*365*86400000,vol:.025,tr:.65},
    };
    const cfg=cfgMap[pfPeriod];
    if(!m.value)return Array.from({length:cfg.n},(_,i)=>({t:now-cfg.span+(i/(cfg.n-1||1))*cfg.span,v:0}));
    let v=m.value*(1-cfg.tr);
    return Array.from({length:cfg.n},(_,i)=>{v*=(1+(Math.random()-.44)*cfg.vol+cfg.tr/cfg.n);return{t:now-cfg.span+(i/(cfg.n-1||1))*cfg.span,v:parseFloat(v.toFixed(2))};});
  },[m.value,pfPeriod]);

  const bmkPts=useMemo(()=>{
    const now=Date.now();const bmk=BENCHMARKS[benchmark];
    const cfgMap:{[k:string]:{n:number;span:number}}={"1J":{n:24,span:86400000},"1M":{n:30,span:30*86400000},"YTD":{n:Math.max(7,Math.floor((Date.now()-new Date(new Date().getFullYear(),0,1).getTime())/86400000)),span:Date.now()-new Date(new Date().getFullYear(),0,1).getTime()},"1A":{n:52,span:365*86400000},"5A":{n:60,span:5*365*86400000}};
    const cfg=cfgMap[pfPeriod];
    const base=m.value||1000;
    if(!m.value)return Array.from({length:cfg.n},(_,i)=>({t:now-cfg.span+(i/(cfg.n-1||1))*cfg.span,v:0}));
    let v=base*(1-bmk.trend);
    return Array.from({length:cfg.n},(_,i)=>{v*=(1+(Math.random()-.46)*.012+bmk.trend/cfg.n);return{t:now-cfg.span+(i/(cfg.n-1||1))*cfg.span,v:parseFloat(v.toFixed(2))};});
  },[m.value,pfPeriod,benchmark]);

  const twr=useMemo(()=>{if(pfPts.length<2)return 0;let p=1;for(let i=1;i<pfPts.length;i++){p*=(pfPts[i].v/pfPts[i-1].v);}return(p-1)*100;},[pfPts]);
  const bmkTwr=useMemo(()=>{if(bmkPts.length<2)return 0;let p=1;for(let i=1;i<bmkPts.length;i++){p*=(bmkPts[i].v/bmkPts[i-1].v);}return(p-1)*100;},[bmkPts]);

  const dividendData=useMemo(()=>pfCtx.active.holdings.map(h=>{
    const annualYield=(h as any).divYield??(Math.random()*3).toFixed(2);
    const annualIncome=(h.price*h.qty)*(parseFloat(annualYield.toString())/100);
    return{ticker:h.ticker,yield:parseFloat(annualYield.toString()),annual:annualIncome,monthly:annualIncome/12};
  }).filter(d=>d.yield>0.1),[pfCtx.active.holdings]);
  const totalAnnualDiv=dividendData.reduce((s,d)=>s+d.annual,0);

  const zakatRate=0.025;
  const zakatAmount=m.value*zakatRate;
  const zakatDue=m.value>5000;
  const sectorSegs=useMemo(()=>m.value>0?Object.entries(m.sectors).map(([k,v],i)=>({label:k,pct:(v/m.value)*100,color:SECTOR_COLORS[i%6]})):[],[m]);

  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease",background:T.bg}}>
      <header style={BS.pageHeader}>
        <h1 style={BS.pageTitle}>Portefeuilles</h1>
        <button onClick={()=>setShowCreate(true)} style={{height:34,padding:"0 14px",background:T.greenBg,border:`1px solid ${T.green}30`,borderRadius:100,color:T.green,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ Nouveau</button>
      </header>

      {/* Portfolio selector */}
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

      {/* Hero chart */}
      <section style={{padding:"0 20px 14px"}}>
        <div style={{background:T.forest,borderRadius:18,padding:"16px 16px 8px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <p style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:"#E8F0EB",lineHeight:1}}>{m.value.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}</p>
                <button onClick={()=>{setEditId(pfCtx.activeId);setEditName(pfCtx.active.name);}} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:6,padding:"3px 8px",color:"rgba(200,230,201,0.6)",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>✎</button>
              </div>
              <p style={{fontSize:12,color:m.gain>=0?"#A5D6A7":"#EF9A9A",fontWeight:700,marginTop:3}}>{m.value>0?`${m.gain>=0?"+":""}${m.gain.toFixed(0)}€ (${m.gain>=0?"+":""}${m.gainPct.toFixed(2)}%)`:"Aucune position"}</p>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800,color:m.conform>=75?"#A5D6A7":"#FFE082"}}>{m.conform}</div>
              <div style={{fontSize:8,color:"rgba(200,230,201,0.4)",letterSpacing:"0.06em"}}>SCORE</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
            {m.value>0&&<div style={{background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"4px 10px",display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:9,color:"rgba(200,230,201,0.6)"}}>TWR port.</span><span style={{fontSize:11,fontWeight:700,color:twr>=0?"#A5D6A7":"#EF9A9A"}}>{twr>=0?"+":""}{twr.toFixed(2)}%</span></div>}
            {m.value>0&&<div style={{background:"rgba(255,255,255,0.06)",borderRadius:8,padding:"4px 10px",display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:9,color:"rgba(200,230,201,0.4)"}}>{BENCHMARKS[benchmark].label}</span><span style={{fontSize:11,fontWeight:700,color:bmkTwr>=0?"rgba(200,230,201,0.7)":"#EF9A9A"}}>{bmkTwr>=0?"+":""}{bmkTwr.toFixed(2)}%</span></div>}
            <div style={{position:"relative",marginLeft:"auto"}}>
              <button onClick={()=>setShowBenchmark(v=>!v)} style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:8,padding:"4px 10px",color:"rgba(200,230,201,0.8)",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{BENCHMARKS[benchmark].label} ▾</button>
              {showBenchmark&&(
                <div style={{position:"absolute",right:0,top:30,background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,zIndex:20,minWidth:130,boxShadow:"0 8px 24px rgba(0,0,0,.15)",overflow:"hidden"}}>
                  {Object.entries(BENCHMARKS).map(([k,v])=>(
                    <button key={k} onClick={()=>{setBenchmark(k);setShowBenchmark(false);}} style={{width:"100%",padding:"9px 14px",background:benchmark===k?T.greenBg:"none",border:"none",borderBottom:`1px solid ${T.border}`,cursor:"pointer",fontSize:12,color:benchmark===k?T.forest:T.text,fontWeight:benchmark===k?700:400,textAlign:"left",fontFamily:"inherit"}}>{v.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{display:"flex",gap:4,marginBottom:6}}>
            {(["1J","1M","YTD","1A","5A"] as const).map(p=>(
              <button key={p} onClick={()=>setPfPeriod(p)} style={{flex:1,height:24,background:pfPeriod===p?"rgba(255,255,255,0.2)":"transparent",border:pfPeriod===p?"1px solid rgba(255,255,255,0.25)":"1px solid transparent",borderRadius:6,color:pfPeriod===p?"#E8F0EB":"rgba(200,230,201,0.45)",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{p}</button>
            ))}
          </div>
          <Chart data={pfPts} color="#6FCF97" height={100} showYAxis={true} label="Valeur du portefeuille"/>
          {(() => {
            const pts2=bmkPts;const W=340,H=100,PT=8,PB=22,PL=42,PR=8,cW=W-PL-PR,cH=H-PT-PB;
            const allVals=[...pfPts.map(d=>d.v),...pts2.map(d=>d.v)];
            const mn=Math.min(...allVals),mx=Math.max(...allVals),rng=mx-mn||1;
            const bmkLine=pts2.map((d,i)=>`${PL+(i/(pts2.length-1||1))*cW},${PT+cH-((d.v-mn)/rng)*cH}`).join(" ");
            return(
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",marginTop:-H-16,pointerEvents:"none",opacity:.6}}>
                <polyline points={bmkLine} fill="none" stroke="#FFD580" strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round"/>
              </svg>
            );
          })()}
          <div style={{display:"flex",gap:14,marginTop:4,paddingLeft:42}}>
            <div style={{display:"flex",gap:5,alignItems:"center"}}><div style={{width:14,height:2,background:"#6FCF97",borderRadius:1}}/><span style={{fontSize:9,color:"rgba(200,230,201,0.5)"}}>Portefeuille</span></div>
            <div style={{display:"flex",gap:5,alignItems:"center"}}><div style={{width:14,height:2,background:"#FFD580",borderRadius:1,backgroundImage:"repeating-linear-gradient(90deg,#FFD580 0,#FFD580 4px,transparent 4px,transparent 7px)"}}/><span style={{fontSize:9,color:"rgba(200,230,201,0.5)"}}>{BENCHMARKS[benchmark].label}</span></div>
          </div>
        </div>
      </section>

      {/* Score cards */}
      <section style={{padding:"0 20px 14px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
        {[{l:"Score",v:m.conform,c:T.green,s:m.conform>=75?"Conforme":"Douteux",tip:"score"},{l:"Durabilité",v:m.esg,c:T.leaf,s:"",tip:"esg"},{l:"Diversif.",v:m.divers,c:T.amber,s:"",tip:"divers"},{l:"Sécurité",v:m.risk,c:m.risk>=70?T.green:T.amber,s:"",tip:"risque"}].map(s=>(
          <div key={s.l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 9px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}><p style={{fontSize:9,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.l}</p><InfoTooltip id={s.tip}/></div>
            <p style={{fontSize:16,fontWeight:800,color:s.c}}>{s.v}</p>
            {s.s&&<p style={{fontSize:8,color:s.c,fontWeight:700,marginTop:1}}>{s.s}</p>}
            <div style={{height:3,background:T.surface2,borderRadius:100,marginTop:4}}><div style={{height:"100%",width:`${s.v}%`,background:s.c,borderRadius:100}}/></div>
          </div>
        ))}
      </section>

      {/* Zakat */}
      <section style={{padding:"0 20px 14px"}}>
        <div style={{background:zakatDue?"linear-gradient(135deg,#FDF8EF,#FDF3E0)":T.surface,border:`1px solid ${zakatDue?T.gold+"40":T.border}`,borderRadius:16,padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div><p style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:3}}>Calcul Zakat</p><p style={{fontSize:11,color:T.textSub,lineHeight:1.5}}>2.5% sur les actifs éligibles · Calculé automatiquement</p></div>
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

      {/* Sectoral pie */}
      {sectorSegs.length>0&&(
        <section style={{padding:"0 20px 14px"}}>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:18}}>
            <p style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:14}}>Allocation sectorielle</p>
            <PieChart segments={sectorSegs}/>
          </div>
        </section>
      )}

      {/* Dividends */}
      <section style={{padding:"0 20px 14px"}}>
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <p style={{fontSize:13,fontWeight:700,color:T.text}}>Revenus passifs</p>
            {totalAnnualDiv>0&&<span style={{background:T.goldLight,color:T.amber,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:100}}>{totalAnnualDiv.toFixed(0)}€/an</span>}
          </div>
          {dividendData.length===0?(
            <div style={{textAlign:"center",padding:"16px 0"}}><p style={{fontSize:12,color:T.textMuted}}>Aucun dividende dans ce portefeuille</p><p style={{fontSize:11,color:T.textMuted,marginTop:3}}>Ajoutez des actions versant des dividendes pour suivre vos revenus passifs</p></div>
          ):(
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                <div style={{background:T.goldLight,borderRadius:10,padding:12}}><p style={{fontSize:9,color:T.amber,marginBottom:3}}>Revenus annuels estimés</p><p style={{fontFamily:"'DM Serif Display',serif",fontSize:18,color:T.text}}>{totalAnnualDiv.toFixed(0)}€</p></div>
                <div style={{background:T.surface2,borderRadius:10,padding:12}}><p style={{fontSize:9,color:T.textMuted,marginBottom:3}}>Mensuel estimé</p><p style={{fontFamily:"'DM Serif Display',serif",fontSize:18,color:T.text}}>{(totalAnnualDiv/12).toFixed(0)}€</p></div>
              </div>
              {dividendData.map(d=>(
                <div key={d.ticker} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderTop:`1px solid ${T.border}`}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{width:30,height:30,borderRadius:8,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:T.textSub}}>{d.ticker.slice(0,2)}</div>
                    <div><p style={{fontSize:12,fontWeight:700,color:T.text}}>{d.ticker}</p><p style={{fontSize:10,color:T.textMuted}}>Rendement {d.yield.toFixed(2)}%</p></div>
                  </div>
                  <div style={{textAlign:"right"}}><p style={{fontSize:12,fontWeight:700,color:T.amber}}>{d.annual.toFixed(0)}€/an</p><p style={{fontSize:10,color:T.textMuted}}>{d.monthly.toFixed(0)}€/mois</p></div>
                </div>
              ))}
              <p style={{fontSize:9,color:T.textMuted,marginTop:10,lineHeight:1.5}}>Ces projections sont basées sur le rendement actuel et ne garantissent pas les revenus futurs.</p>
            </>
          )}
        </div>
      </section>

      {/* Holdings */}
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
          const gainPct=h.paidPrice>0?((h.price-h.paidPrice)/h.paidPrice*100).toFixed(1):"0.0";
          const si=scoreInfo(h.score);
          return(
            <article key={h.ticker} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:14,marginBottom:9}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{width:36,height:36,borderRadius:9,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:T.textSub}}>{h.ticker.slice(0,2)}</div>
                  <div><p style={{fontSize:13,fontWeight:700,color:T.text}}>{h.ticker}</p><p style={{fontSize:11,color:T.textMuted}}>{h.qty} action{h.qty>1?"s":""} · PR {h.paidPrice.toFixed(2)}$</p></div>
                </div>
                <div style={{textAlign:"right"}}><p style={{fontSize:13,fontWeight:700,color:T.text}}>{(h.price*h.qty).toFixed(0)}€</p><p style={{fontSize:11,fontWeight:700,color:gain>=0?T.green:T.red}}>{gain>=0?"+":""}{gain.toFixed(0)}€ ({gain>=0?"+":""}{gainPct}%)</p></div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:7,alignItems:"center"}}><span style={{background:si.bg,color:si.color,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:100}}>{si.label}</span><span style={{fontSize:10,color:T.textMuted}}>Score {h.score}</span></div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",background:T.surface2,borderRadius:7,overflow:"hidden"}}>
                    <button style={{width:26,height:26,background:"none",border:"none",cursor:"pointer",fontSize:13,color:T.textSub,fontFamily:"inherit",fontWeight:700}} onClick={()=>{const nq=Math.max(1,h.qty-1);pfCtx.updateQty(h.ticker,-1);toast(`${h.ticker} : ${nq} action${nq>1?"s":""}`);if(h._id)portfolioDB.updateQty(h._id,nq).catch(()=>{});}}>−</button>
                    <span style={{fontSize:11,fontWeight:800,color:T.text,padding:"0 2px"}}>{h.qty}</span>
                    <button style={{width:26,height:26,background:"none",border:"none",cursor:"pointer",fontSize:13,color:T.green,fontFamily:"inherit",fontWeight:700}} onClick={()=>{const nq=h.qty+1;pfCtx.updateQty(h.ticker,1);toast(`${h.ticker} renforcé ✓`);if(h._id)portfolioDB.updateQty(h._id,nq).catch(()=>{});}}>+</button>
                  </div>
                  <button style={{...BS.microBtn,color:T.red,borderColor:`${T.red}22`,fontSize:10}} onClick={()=>{const _id=h._id;pfCtx.removeFromActive(h.ticker);toast(`${h.ticker} retiré`,"info");if(_id)portfolioDB.remove(_id).catch(()=>{});}}>Retirer</button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {showCreate&&(
        <Modal onClose={()=>setShowCreate(false)}>
          <h2 style={{fontSize:20,fontWeight:800,color:T.text,marginBottom:16}}>Nouveau portefeuille</h2>
          <label style={{fontSize:12,color:T.textSub,marginBottom:5,display:"block"}}>Nom</label>
          <input style={BS.input} placeholder="ex : Dividendes, Croissance…" value={newName} onChange={e=>setNewName(e.target.value)} autoFocus/>
          <button style={{...BS.btnPrimary,marginTop:16}} onClick={()=>{if(newName.trim()){pfCtx.createPf(newName.trim());setNewName("");setShowCreate(false);toast(`Portefeuille "${newName}" créé ✓`);}}} >Créer</button>
          <button style={{...BS.btnGhost,width:"100%",marginTop:10}} onClick={()=>setShowCreate(false)}>Annuler</button>
        </Modal>
      )}
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
