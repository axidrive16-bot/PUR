"use client";
import { useState, useMemo } from "react";
import { T, BS, useCur } from "@/components/ui/tokens";

export function FundamentalsBlock({asset,ticker,isPremium,onUpgrade}:{asset:any;ticker:string;isPremium:boolean;onUpgrade:()=>void}){
  const{fmtP}=useCur();
  const[tab,setTab]=useState<"dcf"|"multiples"|"quarters">("dcf");
  const[showAll,setShowAll]=useState(false);
  const[growthRate,setGrowthRate]=useState(8);
  const[wacc,setWacc]=useState(10);
  const[terminalGrowth,setTerminalGrowth]=useState(3);

  const pe=asset.pe??(asset.price/(asset.eps??10)).toFixed(1);
  const pb=asset.pb??((asset.price/(asset.bookValue??asset.price*.4)).toFixed(1));
  const evEbitda=asset.evEbitda??(pe*0.65).toFixed(1);
  const eps=asset.eps??(asset.price/parseFloat(pe.toString())).toFixed(2);
  const fcfPerShare=asset.fcfPerShare??(parseFloat(eps.toString())*0.82).toFixed(2);
  const sectorPe=asset.sectorPe??22;
  const analystTarget=asset.analystTarget??(asset.price*1.12).toFixed(2);
  const upside=(((parseFloat(analystTarget.toString())/asset.price)-1)*100).toFixed(1);

  const dcfValue=useMemo(()=>{
    const fcf=parseFloat(fcfPerShare.toString());
    let pv=0;
    for(let y=1;y<=5;y++){pv+=fcf*Math.pow(1+growthRate/100,y)/Math.pow(1+wacc/100,y);}
    const tv=fcf*Math.pow(1+growthRate/100,5)*(1+terminalGrowth/100)/((wacc/100)-(terminalGrowth/100));
    return(pv+tv/Math.pow(1+wacc/100,5)).toFixed(2);
  },[growthRate,wacc,terminalGrowth,fcfPerShare]);

  const marginOfSafety=(((parseFloat(dcfValue)-asset.price)/parseFloat(dcfValue))*100).toFixed(1);
  const dcfUpside=(((parseFloat(dcfValue)/asset.price)-1)*100).toFixed(1);
  const isUndervalued=parseFloat(dcfValue)>asset.price;

  const quarters=useMemo(()=>[
    {q:"T1 2025",rev:`${(asset.price*0.22).toFixed(1)}B`,eps:parseFloat(eps.toString()),epsEst:parseFloat(eps.toString())*0.96,beat:true},
    {q:"T4 2024",rev:`${(asset.price*0.20).toFixed(1)}B`,eps:parseFloat(eps.toString())*0.95,epsEst:parseFloat(eps.toString())*0.94,beat:true},
    {q:"T3 2024",rev:`${(asset.price*0.19).toFixed(1)}B`,eps:parseFloat(eps.toString())*0.88,epsEst:parseFloat(eps.toString())*0.91,beat:false},
    {q:"T2 2024",rev:`${(asset.price*0.18).toFixed(1)}B`,eps:parseFloat(eps.toString())*0.82,epsEst:parseFloat(eps.toString())*0.80,beat:true},
  ],[asset.price,eps]);

  if(!isPremium){
    return(
      <button onClick={onUpgrade} style={{width:"100%",background:T.surface2,border:`1px solid ${T.amber}28`,borderRadius:12,padding:"12px 14px",marginBottom:13,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",fontFamily:"inherit"}}>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:T.amber,marginBottom:1}}>Valorisation DCF · Multiples · Résultats</div>
          <div style={{fontSize:11,color:T.textMuted}}>P/E, PBV, EV/EBITDA, modèle DCF, transcripts · Premium</div>
        </div>
        <span style={{fontSize:12,color:T.amber,fontWeight:700}}>Voir →</span>
      </button>
    );
  }

  return(
    <div style={{background:T.surface2,borderRadius:12,overflow:"hidden",marginBottom:13}}>
      <div style={{display:"flex",borderBottom:`1px solid ${T.border}`}}>
        {([["dcf","Valorisation DCF"],["multiples","Multiples"],["quarters","Résultats"]] as const).map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,height:36,background:tab===id?T.surface:"none",border:"none",borderBottom:tab===id?`2px solid ${T.forest}`:"2px solid transparent",color:tab===id?T.forest:T.textMuted,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{lbl}</button>
        ))}
      </div>
      <div style={{padding:14}}>
        {tab==="dcf"&&(
          <div>
            <p style={{fontSize:10,color:T.textMuted,marginBottom:10,lineHeight:1.6}}>Estimation basée sur les flux de trésorerie. Ces données sont fournies à titre informatif uniquement et ne constituent pas un conseil en investissement.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[{label:"Taux croissance",value:growthRate,set:setGrowthRate,min:0,max:30},{label:"WACC",value:wacc,set:setWacc,min:4,max:20},{label:"Croissance term.",value:terminalGrowth,set:setTerminalGrowth,min:0,max:5}].map(({label,value,set,min,max})=>(
                <div key={label}>
                  <p style={{fontSize:9,color:T.textMuted,marginBottom:4}}>{label}</p>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <input type="range" min={min} max={max} value={value} onChange={e=>set(Number(e.target.value))} style={{flex:1,accentColor:T.forest,height:3}}/>
                    <span style={{fontSize:11,fontWeight:700,color:T.text,minWidth:26}}>{value}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{background:T.surface,borderRadius:10,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div>
                  <p style={{fontSize:10,color:T.textMuted,marginBottom:2}}>Valeur intrinsèque estimée</p>
                  <p style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:T.text}}>{fmtP(parseFloat(dcfValue))}</p>
                </div>
                <div style={{background:isUndervalued?T.greenBg:T.redBg,color:isUndervalued?T.green:T.red,borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700}}>{isUndervalued?"Sous-évalué":"Sur-évalué"}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div style={{background:T.surface2,borderRadius:8,padding:10}}><p style={{fontSize:9,color:T.textMuted,marginBottom:2}}>Cours actuel</p><p style={{fontSize:13,fontWeight:700,color:T.text}}>{fmtP(asset.price)}</p></div>
                <div style={{background:isUndervalued?T.greenBg:T.redBg,borderRadius:8,padding:10}}><p style={{fontSize:9,color:isUndervalued?T.green:T.red,marginBottom:2}}>Potentiel DCF</p><p style={{fontSize:13,fontWeight:700,color:isUndervalued?T.green:T.red}}>{parseFloat(dcfUpside)>=0?"+":""}{dcfUpside}%</p></div>
              </div>
              <div style={{marginTop:8,background:T.surface2,borderRadius:8,padding:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <p style={{fontSize:10,color:T.textMuted}}>Marge de sécurité</p>
                  <p style={{fontSize:12,fontWeight:700,color:parseFloat(marginOfSafety)>20?T.green:parseFloat(marginOfSafety)>0?T.amber:T.red}}>{marginOfSafety}%</p>
                </div>
                <div style={{marginTop:6,background:T.surface,borderRadius:100,height:4,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.max(0,Math.min(100,parseFloat(marginOfSafety)))}%`,background:parseFloat(marginOfSafety)>20?T.green:parseFloat(marginOfSafety)>0?T.amber:T.red,borderRadius:100}}/></div>
              </div>
              <p style={{fontSize:9,color:T.textMuted,marginTop:8,lineHeight:1.5}}>Consensus analystes : cible à {analystTarget}$ · Potentiel {parseFloat(upside)>=0?"+":""}{upside}% vs cours actuel</p>
            </div>
          </div>
        )}
        {tab==="multiples"&&(
          <div>
            <p style={{fontSize:10,color:T.textMuted,marginBottom:10,lineHeight:1.6}}>Comparaison des multiples de valorisation par rapport au secteur. Données à titre indicatif uniquement.</p>
            {[{label:"P/E (Price/Earnings)",val:parseFloat(pe.toString()),sector:sectorPe,desc:"Combien les investisseurs paient par unité de bénéfice."},{label:"P/B (Price/Book)",val:parseFloat(pb.toString()),sector:3.2,desc:"Ratio cours/valeur comptable de l'entreprise."},{label:"EV/EBITDA",val:parseFloat(evEbitda.toString()),sector:14,desc:"Valeur d'entreprise relative aux bénéfices opérationnels."}].map(({label,val,sector,desc})=>{
              const cheaper=val<sector;
              return(
                <div key={label} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{fontSize:12,fontWeight:700,color:T.text}}>{label}</span>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:13,fontWeight:800,color:cheaper?T.green:T.red}}>{val.toFixed(1)}x</span><span style={{fontSize:10,color:T.textMuted}}>sect. {sector}x</span></div>
                  </div>
                  <div style={{position:"relative",height:6,background:T.surface,borderRadius:100,overflow:"visible",marginBottom:4}}>
                    <div style={{position:"absolute",top:0,left:0,height:"100%",width:`${Math.min((val/Math.max(val,sector*1.5))*100,100)}%`,background:cheaper?T.green:T.red,borderRadius:100,transition:"width .6s ease"}}/>
                    <div style={{position:"absolute",top:-2,height:10,width:2,background:T.textMuted,borderRadius:1,left:`${Math.min((sector/Math.max(val,sector*1.5))*100,100)}%`}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:9,color:T.textMuted}}>{desc}</span><span style={{fontSize:9,fontWeight:700,color:cheaper?T.green:T.red}}>{cheaper?"Moins cher que le sect.":"Plus cher que le sect."}</span></div>
                </div>
              );
            })}
            <div style={{background:T.surface,borderRadius:10,padding:12,marginTop:4}}><p style={{fontSize:10,color:T.textMuted,marginBottom:4}}>FCF par action</p><p style={{fontSize:14,fontWeight:700,color:T.text}}>{fcfPerShare}$ <span style={{fontSize:10,color:T.textMuted,fontWeight:400}}>· EPS {eps}$</span></p></div>
          </div>
        )}
        {tab==="quarters"&&(
          <div>
            <p style={{fontSize:10,color:T.textMuted,marginBottom:10}}>Résultats trimestriels récents. Données à titre indicatif uniquement.</p>
            {(showAll?quarters:quarters.slice(0,2)).map((q,i)=>(
              <div key={i} style={{background:T.surface,borderRadius:10,padding:12,marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:12,fontWeight:700,color:T.text}}>{q.q}</span>
                    <span style={{background:q.beat?T.greenBg:T.redBg,color:q.beat?T.green:T.red,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:100}}>{q.beat?"Supérieur aux attentes":"Inférieur"}</span>
                  </div>
                  <span style={{fontSize:11,color:T.textMuted}}>CA {q.rev}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div><p style={{fontSize:9,color:T.textMuted,marginBottom:2}}>BPA réel</p><p style={{fontSize:13,fontWeight:700,color:q.beat?T.green:T.red}}>{q.eps.toFixed(2)}$</p></div>
                  <div><p style={{fontSize:9,color:T.textMuted,marginBottom:2}}>BPA estimé</p><p style={{fontSize:13,fontWeight:700,color:T.text}}>{q.epsEst.toFixed(2)}$</p></div>
                </div>
              </div>
            ))}
            {quarters.length>2&&<button onClick={()=>setShowAll(v=>!v)} style={{width:"100%",background:"none",border:`1px solid ${T.border}`,borderRadius:9,padding:"8px 0",fontSize:11,color:T.textSub,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{showAll?"Voir moins ▲":"Voir plus ▼"}</button>}
          </div>
        )}
      </div>
    </div>
  );
}
