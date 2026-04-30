"use client";
import { useState, useMemo } from "react";
import { useUserStore } from "@/store/usePortfolioStore";
import { useGamificationStore } from "@/store/useGamificationStore";
import { usePortfolios } from "@/hooks/usePortfolios";
import { useSearch, useDebounce } from "@/hooks/useStock";
import { T, BS, scoreInfo } from "@/components/ui/tokens";
import { StockCard } from "./StockCard";
import { UpgradeModal } from "./UpgradeModal";

const POPULAR_STOCKS=[
  {ticker:"AAPL", name:"Apple",          score:91, change:+1.59, sector:"Tech",      pays:"USA",   div:false, status:"conforme"},
  {ticker:"MSFT", name:"Microsoft",      score:87, change:+0.83, sector:"Tech",      pays:"USA",   div:true,  status:"conforme"},
  {ticker:"NOVO", name:"Novo Nordisk",   score:93, change:+2.31, sector:"Santé",     pays:"EU",    div:true,  status:"conforme"},
  {ticker:"NKE",  name:"Nike",           score:84, change:+1.21, sector:"Conso.",    pays:"USA",   div:true,  status:"conforme"},
  {ticker:"ADBE", name:"Adobe",          score:89, change:-0.42, sector:"Tech",      pays:"USA",   div:false, status:"conforme"},
  {ticker:"ISDE", name:"iShares Islamic",score:94, change:+0.62, sector:"ETF",       pays:"Global",div:false, status:"conforme"},
  {ticker:"AMZN", name:"Amazon",         score:62, change:+0.91, sector:"Tech",      pays:"USA",   div:false, status:"douteux"},
  {ticker:"MC",   name:"LVMH",           score:71, change:-0.3,  sector:"Luxe",      pays:"EU",    div:true,  status:"douteux"},
  {ticker:"OR",   name:"L'Oréal",        score:78, change:+0.55, sector:"Conso.",    pays:"EU",    div:true,  status:"conforme"},
  {ticker:"AIR",  name:"Airbus",         score:80, change:+1.1,  sector:"Industrie", pays:"EU",    div:true,  status:"conforme"},
  {ticker:"TSLA", name:"Tesla",          score:44, change:-1.2,  sector:"Auto",      pays:"USA",   div:false, status:"douteux"},
  {ticker:"GOOGL",name:"Alphabet",       score:58, change:+0.7,  sector:"Tech",      pays:"USA",   div:false, status:"douteux"},
];

const SCREEN_FILTERS=[
  {id:"all",      label:"Tous"},
  {id:"conforme", label:"Conforme"},
  {id:"douteux",  label:"Proche conforme"},
  {id:"div",      label:"Dividende"},
  {id:"usa",      label:"USA"},
  {id:"eu",       label:"Europe"},
  {id:"tech",     label:"Tech"},
  {id:"sante",    label:"Santé"},
  {id:"conso",    label:"Conso."},
  {id:"etf",      label:"ETF"},
] as const;

export function ScreeningScreen({openReport}:{openReport:(t:string)=>void}){
  const isPremium=useUserStore(s=>s.isPremium);
  const inc=useUserStore(s=>s.incScreenings);
  const pfCtx=usePortfolios();
  const[q,setQ]=useState("");const[ticker,setTicker]=useState<string|null>(null);
  const[showUp,setShowUp]=useState(false);
  const[screenFilter,setScreenFilter]=useState<string>("all");
  const dq=useDebounce(q,300);const{data:sr}=useSearch(dq);
  const gStore=useGamificationStore();
  const doSearch=(t:string)=>{inc();gStore.trackAnalysis();gStore.checkStreak();setTicker(t);setQ(t);};
  const filtered=useMemo(()=>POPULAR_STOCKS.filter(s=>{
    if(screenFilter==="all")return true;
    if(screenFilter==="conforme")return s.status==="conforme";
    if(screenFilter==="douteux")return s.status==="douteux";
    if(screenFilter==="div")return s.div;
    if(screenFilter==="usa")return s.pays==="USA";
    if(screenFilter==="eu")return s.pays==="EU";
    if(screenFilter==="tech")return s.sector==="Tech";
    if(screenFilter==="sante")return s.sector==="Santé";
    if(screenFilter==="conso")return s.sector==="Conso.";
    if(screenFilter==="etf")return s.sector==="ETF";
    return true;
  }),[screenFilter]);

  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease",background:T.bg}}>
      <header style={BS.pageHeader}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {ticker&&<button onClick={()=>{setTicker(null);setQ("");}} style={{width:34,height:34,borderRadius:10,background:T.surface,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14,color:T.text,fontFamily:"inherit"}}>←</button>}
          <h1 style={BS.pageTitle}>{ticker?ticker:"Analyser"}</h1>
        </div>
        {!isPremium&&!ticker&&<div style={{background:T.amberBg,borderRadius:10,padding:"4px 10px"}}><span style={{fontSize:11,fontWeight:700,color:T.amber}}>Essai 14j</span></div>}
      </header>
      {!ticker&&<div style={{padding:"0 20px 14px"}}>
        <div style={{position:"relative"}}>
          <div style={{display:"flex",gap:8}}>
            <input style={BS.input} placeholder="Ticker ou nom de l'entreprise…" value={q} onChange={e=>setQ(e.target.value)} autoFocus/>
            <button style={{width:48,height:50,background:T.forest,border:"none",borderRadius:12,color:"#E8F0EB",fontSize:18,cursor:"pointer",flexShrink:0}} onClick={()=>sr?.results?.[0]&&doSearch(sr.results[0].ticker)}>→</button>
          </div>
          {sr?.results?.length>0&&q&&(
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
        <p style={{fontSize:11,color:T.textMuted,marginTop:7}}>Données financières mises à jour en temps réel</p>
      </div>}
      {ticker&&<div style={{padding:"0 20px 16px"}}><StockCard ticker={ticker} onReport={openReport} pfCtx={pfCtx}/></div>}
      {!ticker&&(
        <div style={{padding:"8px 20px 24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <p style={{fontSize:13,fontWeight:700,color:T.text}}>Actions populaires</p>
            <span style={{fontSize:10,color:T.textMuted}}>Tap pour analyser</span>
          </div>
          <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:14,paddingBottom:2}}>
            {SCREEN_FILTERS.map(f=>(
              <button key={f.id} onClick={()=>setScreenFilter(f.id)} style={{flexShrink:0,height:28,padding:"0 11px",background:screenFilter===f.id?T.forest:T.surface2,color:screenFilter===f.id?"#E8F0EB":T.textSub,border:"none",borderRadius:100,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{f.label}</button>
            ))}
          </div>
          {filtered.length===0?(
            <div style={{textAlign:"center",padding:"28px 0",color:T.textMuted,background:T.surface,borderRadius:14,border:`1px solid ${T.border}`}}>
              <p style={{fontSize:12,fontWeight:700,color:T.textSub}}>Aucun résultat</p>
              <p style={{fontSize:11,marginTop:3}}>Essayez un autre filtre</p>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
              {filtered.map(s=>{
                const pos=s.change>=0;
                const si={conforme:{color:T.green,bg:T.greenBg},douteux:{color:T.amber,bg:T.amberBg}}[s.status as "conforme"|"douteux"]??{color:T.red,bg:"#FCEBEB"};
                return(
                  <button key={s.ticker} onClick={()=>doSearch(s.ticker)} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:"13px 13px 11px",textAlign:"left",cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div><div style={{fontSize:14,fontWeight:800,color:T.text,letterSpacing:"-.3px"}}>{s.ticker}</div><div style={{fontSize:10,color:T.textMuted,marginTop:1}}>{s.name}</div></div>
                      <div style={{background:pos?T.greenBg:"#FCEBEB",color:pos?T.green:T.red,fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:6}}>{pos?"+":""}{s.change}%</div>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:`1px solid ${T.border}`,paddingTop:8}}>
                      <span style={{background:si.bg,color:si.color,fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:100}}>{s.status==="conforme"?"Conforme":"Douteux"}</span>
                      <div style={{display:"flex",gap:4,alignItems:"center"}}>{s.div&&<span style={{fontSize:9,color:T.amber}}>Div.</span>}<span style={{fontSize:13,fontWeight:800,color:si.color}}>{s.score}</span></div>
                    </div>
                    <div style={{marginTop:6,fontSize:9,color:T.textMuted}}>{s.sector} · {s.pays}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {showUp&&<UpgradeModal onClose={()=>setShowUp(false)}/>}
    </div>
  );
}
