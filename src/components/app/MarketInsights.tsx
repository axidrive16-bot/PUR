"use client";
import { useState } from "react";
import { T, scoreInfo, mkP } from "@/components/ui/tokens";
import { Spark } from "@/components/ui/Chart";

const MARKET_DATA = [
  { ticker:"AAPL",  name:"Apple",               change:+1.59, score:91, why:"Croissance stable",    sector:"Tech",  price:260.5 },
  { ticker:"MSFT",  name:"Microsoft",            change:+0.83, score:87, why:"Dividende fiable",     sector:"Tech",  price:415.2 },
  { ticker:"NKE",   name:"Nike",                 change:+1.21, score:84, why:"Marque mondiale",      sector:"Sport", price:94.7  },
  { ticker:"NOVO",  name:"Novo Nordisk",         change:+2.31, score:93, why:"Secteur santé",        sector:"Santé", price:88.4  },
  { ticker:"ADBE",  name:"Adobe",                change:-0.42, score:89, why:"SaaS récurrent",       sector:"Tech",  price:512.8 },
  { ticker:"ISDE",  name:"iShares Islamic World",change:+0.62, score:94, why:"ETF diversifié",       sector:"ETF",   price:42.2  },
];

export function MarketInsights({onSearch}:{onSearch:(t:string)=>void}){
  const[filter,setFilter]=useState<"all"|"top"|"etf">("all");
  const filtered=MARKET_DATA.filter(s=>filter==="all"?true:filter==="etf"?s.sector==="ETF":s.sector!=="ETF");
  return(
    <section style={{padding:"0 20px 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div><p style={{fontSize:14,fontWeight:700,color:T.text}}>Opportunités du moment</p><p style={{fontSize:11,color:T.textMuted}}>Sélection conforme · Mise à jour quotidienne</p></div>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {([["all","Tous"],["top","Actions"],["etf","ETF"]] as const).map(([id,lbl])=><button key={id} onClick={()=>setFilter(id)} style={{height:28,padding:"0 12px",background:filter===id?T.forest:T.surface2,color:filter===id?"#E8F0EB":T.textSub,border:"none",borderRadius:100,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{lbl}</button>)}
      </div>
      <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}}>
        {filtered.map(s=>{
          const pos=s.change>=0; const si=scoreInfo(s.score);
          return(
            <button key={s.ticker} onClick={()=>onSearch(s.ticker)} style={{flexShrink:0,width:158,background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px 14px 12px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div><div style={{fontSize:14,fontWeight:800,color:T.text,letterSpacing:"-.3px"}}>{s.ticker}</div><div style={{fontSize:10,color:T.textMuted,marginTop:1}}>{s.name}</div></div>
                <div style={{background:pos?T.greenBg:T.redBg,color:pos?T.green:T.red,fontSize:10,fontWeight:700,padding:"3px 6px",borderRadius:6}}>{pos?"+":""}{s.change}%</div>
              </div>
              <div style={{marginBottom:8}}><Spark pts={mkP(s.price,.02,pos?.5:-.4)["1M"]} color={pos?T.green:T.red}/></div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:`1px solid ${T.border}`,paddingTop:8}}>
                <div><div style={{fontSize:9,color:T.textMuted,marginBottom:2}}>Score</div><div style={{fontSize:14,fontWeight:800,color:si.color}}>{s.score}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:9,color:T.textMuted,marginBottom:2}}>Raison</div><div style={{fontSize:9,fontWeight:700,color:T.textSub}}>{s.why}</div></div>
              </div>
              <div style={{marginTop:7,background:T.surface2,borderRadius:6,padding:"3px 7px",display:"inline-block"}}><span style={{fontSize:9,color:T.textSub,fontWeight:600}}>{s.sector}</span></div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
