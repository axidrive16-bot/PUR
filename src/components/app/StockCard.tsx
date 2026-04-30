"use client";
import { useState, useMemo } from "react";
import { useWatchlistStore, useUserStore } from "@/store/usePortfolioStore";
import { useGamificationStore } from "@/store/useGamificationStore";
import { watchlistDB } from "@/lib/db";
import { calcPurification } from "@/domain/aaoifi";
import { useStock } from "@/hooks/useStock";
import type { ChartPeriod } from "@/domain/types";
import { T, BS, STATUS, scoreInfo, useCur, mkP } from "@/components/ui/tokens";
import { Sk } from "@/components/ui/Modal";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Chart } from "@/components/ui/Chart";
import { RatioBar } from "@/components/ui/RatioBar";
import { FundamentalsBlock } from "./FundamentalsBlock";
import { AddToPortfolioModal } from "./AddToPortfolioModal";
import { UpgradeModal } from "./UpgradeModal";
import type { usePortfolios } from "@/hooks/usePortfolios";

export function StockCard({ticker,onReport,pfCtx}:{ticker:string;onReport:(t:string)=>void;pfCtx:ReturnType<typeof usePortfolios>}){
  const{fmtP,cur,setCur}=useCur();
  const{toggle:wlToggle,inList:inWl}=useWatchlistStore();
  const isPremium=useUserStore(s=>s.isPremium);
  const userId=useUserStore(s=>s.id);
  const[period,setPeriod]=useState<ChartPeriod>("1M");
  const[showWhy,setShowWhy]=useState(false);
  const[showUp,setShowUp]=useState(false);
  const[showAddModal,setShowAddModal]=useState(false);
  const{data,isLoading,error}=useStock(ticker,period);
  const asset=data?.asset;

  const enriched=useMemo(()=>{
    if(!asset)return{"1D":[],"1S":[],"1M":[],"1A":[]};
    const hist=data?.history?.[period]??[];
    if(hist.length>0)return{...asset.periods,[period]:hist};
    return mkP(asset.price,(asset.beta??1)*.015,(asset.change??0)>0?.8:-.3);
  },[asset,data,period]);

  if(isLoading)return(
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:20}}>
      <Sk h={22} w="55%" r={4}/><div style={{marginTop:8}}><Sk h={14} w="35%" r={4}/></div><div style={{marginTop:14}}><Sk h={110} r={8}/></div>
    </div>
  );
  if(error||!asset)return<div style={{background:T.redBg,border:`1px solid ${T.red}22`,borderRadius:16,padding:18,color:T.red,fontSize:13}}>Ticker introuvable : {ticker}</div>;

  const cfg=STATUS[asset.status]??STATUS["conforme"]??STATUS.halal;
  const si=scoreInfo(asset.score);
  const isInPf=pfCtx.inActive(ticker);
  const currentQty=pfCtx.getQty(ticker);
  const isWatched=inWl(ticker);
  const cc=(asset.change??0)>=0?T.green:T.red;
  const currentPts=enriched[period]??[];

  return(
    <article style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,overflow:"hidden"}}>
      <div style={{background:cfg.bg,padding:"7px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <div style={{width:16,height:16,borderRadius:4,background:cfg.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:800}}>{cfg.icon}</div>
          <span style={{fontSize:11,fontWeight:700,color:cfg.color}}>{cfg.label}</span>
          <span style={{fontSize:11,color:cfg.color,opacity:.65}}>— {cfg.label==="Conforme"?"Vous pouvez investir":cfg.label==="À surveiller"?"Par précaution":"Ne pas investir"}</span>
        </div>
      </div>
      <div style={{padding:18}}>
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
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,lineHeight:1}}>{fmtP(asset.price)}</div>
            <div style={{fontSize:12,color:cc,fontWeight:700,marginTop:3}}>{(asset.change??0)>=0?"+":""}{asset.change}% aujourd'hui</div>
          </div>
          <button onClick={()=>setCur(cur==="USD"?"EUR":"USD")} style={{height:26,padding:"0 10px",background:T.surface2,border:`1px solid ${T.border}`,borderRadius:8,fontSize:11,fontWeight:700,color:T.textSub,cursor:"pointer",fontFamily:"inherit",flexShrink:0,marginTop:3}}>
            {cur==="USD"?"$ USD":"€ EUR"}
          </button>
        </div>
        <div style={{display:"flex",gap:4,marginBottom:8}}>
          {(["1D","1S","1M","1A"] as ChartPeriod[]).map(p=><button key={p} onClick={()=>setPeriod(p)} style={{flex:1,height:26,background:period===p?cc:T.surface2,color:period===p?"#fff":T.textSub,border:"none",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{p}</button>)}
        </div>
        <Chart data={currentPts} color={cc} height={120} showYAxis={true} label={`Cours · ${period}`}/>
        <div style={{background:T.surface2,borderRadius:12,padding:14,marginBottom:13,marginTop:14}}>
          <p style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textMuted,marginBottom:12}}>Analyse de conformité</p>
          <RatioBar label="Dette / actifs" value={asset.ratioDebt} max={33} detail={`Mesure l'endettement de ${ticker}. Seuil maximum : 33% des actifs totaux.`}/>
          <RatioBar label="Revenus non conformes" value={asset.ratioRevHaram} max={5} detail={`Part des revenus illicites. Seuil maximum : 5% du chiffre d'affaires.`}/>
          <RatioBar label="Liquidités / actifs" value={asset.ratioCash} max={33} detail={`Instruments monétaires sensibles. Seuil maximum : 33% des actifs.`}/>
        </div>
        {isPremium&&asset.scoreHistory.length>0&&(
          <div style={{background:T.surface2,borderRadius:12,padding:14,marginBottom:13}}>
            <p style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textMuted,marginBottom:10}}>Évolution du score — {asset.scoreHistory.length} trimestres</p>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",height:40}}>
              {(asset.scoreHistory as any[]).map((v:number,i:number)=>{const si2=scoreInfo(v);return<div key={i} style={{height:20,width:4,background:si2.color,borderRadius:2}}/>;})}</div>
          </div>
        )}
        {!isPremium&&<button onClick={()=>setShowUp(true)} style={{width:"100%",background:T.surface2,border:`1px solid ${T.amber}28`,borderRadius:12,padding:"10px 14px",marginBottom:13,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",fontFamily:"inherit"}}><div><div style={{fontSize:12,fontWeight:700,color:T.amber,marginBottom:1}}>Historique du score sur 2 ans</div><div style={{fontSize:11,color:T.textMuted}}>Évolution trimestrielle · Premium</div></div><span style={{fontSize:12,color:T.amber,fontWeight:700}}>Voir →</span></button>}
        <div style={{background:T.surface2,borderRadius:12,overflow:"hidden",marginBottom:13}}>
          <button onClick={()=>setShowWhy(w=>!w)} style={{width:"100%",padding:"11px 14px",display:"flex",justifyContent:"space-between",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}><span style={{fontSize:13,fontWeight:700,color:T.text}}>Pourquoi {asset.status==="halal"?"conforme":asset.status==="douteux"?"à surveiller":"non conforme"} ?</span><span style={{color:T.textMuted,fontSize:12}}>{showWhy?"▲":"▼"}</span></button>
          {showWhy&&<div style={{padding:"0 14px 14px"}}>{(asset.whyHalal as any[]).map((w:any,i:number)=><div key={i} style={{display:"flex",gap:8,marginBottom:10}}><div style={{width:16,height:16,borderRadius:4,background:w.ok?T.greenBg:T.redBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:w.ok?T.green:T.red,fontWeight:800,flexShrink:0,marginTop:1}}>{w.ok?"✓":"✕"}</div><div><p style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:2}}>{w.label}</p><p style={{fontSize:11,color:T.textSub,lineHeight:1.6}}>{w.detail}</p></div></div>)}</div>}
        </div>
        {(asset.divAnnual??0)>0&&<div style={{background:T.goldLight,border:`1px solid ${T.gold}30`,borderRadius:12,padding:14,marginBottom:14}}><p style={{fontSize:12,fontWeight:700,color:T.amber,marginBottom:7}}>Purification des dividendes</p><div style={{display:"flex",gap:16}}><div><p style={{fontSize:10,color:T.textMuted,marginBottom:2}}>Dividende/an</p><p style={{fontSize:13,fontWeight:700,color:T.text}}>{asset.divAnnual}$</p></div><div><p style={{fontSize:10,color:T.textMuted,marginBottom:2}}>Part à purifier</p><p style={{fontSize:13,fontWeight:700,color:T.amber}}>{asset.divHaramPct}%</p></div><div><p style={{fontSize:10,color:T.textMuted,marginBottom:2}}>Montant</p><p style={{fontSize:13,fontWeight:700,color:T.amber}}>{calcPurification(asset.divAnnual??0,asset.divHaramPct??0).toFixed(3)}$</p></div></div></div>}
        <FundamentalsBlock asset={asset} ticker={ticker} isPremium={isPremium} onUpgrade={()=>setShowUp(true)}/>
        {isInPf&&(
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,background:T.greenBg,borderRadius:10,padding:"8px 12px"}}>
            <span style={{fontSize:12,color:T.green,flex:1,fontWeight:600}}>{currentQty} action{currentQty>1?"s":""} en portefeuille</span>
            <div style={{display:"flex",alignItems:"center",background:"rgba(255,255,255,0.5)",borderRadius:8,overflow:"hidden"}}>
              <button onClick={()=>pfCtx.updateQty(ticker,-1)} style={{width:30,height:30,background:"none",border:"none",cursor:"pointer",fontSize:14,color:T.forest,fontFamily:"inherit",fontWeight:700}}>−</button>
              <span style={{width:28,textAlign:"center",fontSize:13,fontWeight:800,color:T.forest}}>{currentQty}</span>
              <button onClick={()=>setShowAddModal(true)} style={{width:30,height:30,background:"none",border:"none",cursor:"pointer",fontSize:14,color:T.green,fontFamily:"inherit",fontWeight:700}}>+</button>
            </div>
          </div>
        )}
        <div style={{display:"flex",gap:7}}>
          <button onClick={()=>setShowAddModal(true)} style={{flex:1,height:46,background:isInPf?T.greenBg:T.forest,border:`1px solid ${isInPf?T.green:T.forest}`,borderRadius:12,color:isInPf?T.green:"#E8F0EB",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
            {isInPf?"Renforcer la position +":"+ Ajouter au portefeuille"}
          </button>
          <button onClick={async()=>{
            const wasWl=isWatched;
            wlToggle(asset);
            if(!wasWl){
              useGamificationStore.getState().trackWatchlist();
              if(userId!=="guest"){
                const row=await watchlistDB.add(userId,asset.ticker,{name:asset.name,sector:asset.sector,score:asset.score,status:asset.status,price:asset.price,change_pct:asset.change});
                if(row)useWatchlistStore.getState().setId(asset.ticker,row.id);
              }
            }else{
              if(userId!=="guest"){
                const _id=useWatchlistStore.getState()._ids[asset.ticker];
                if(_id)watchlistDB.remove(_id).catch(()=>{});
              }
            }
          }} style={{width:46,height:46,background:isWatched?T.greenBg:T.surface2,border:`1px solid ${isWatched?T.green:T.border}`,borderRadius:12,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>🔖</button>
          <button onClick={()=>onReport(ticker)} style={{width:46,height:46,background:T.surface2,border:`1px solid ${T.border}`,borderRadius:12,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}} title="Rapport">📋</button>
        </div>
        {/* Legal disclaimer */}
        <p style={{fontSize:10,color:T.textMuted,lineHeight:1.6,marginTop:8,padding:"10px 12px",background:T.surface2,borderRadius:8}}>
          ⚠️ Ces informations sont fournies à titre indicatif uniquement et ne constituent pas un conseil en investissement. Consultez un conseiller financier agréé avant toute décision. Les données peuvent comporter des délais ou des erreurs.
        </p>
      </div>
      {showAddModal&&<AddToPortfolioModal asset={asset} pfCtx={pfCtx} onClose={()=>setShowAddModal(false)}/>}
      {showUp&&<UpgradeModal onClose={()=>setShowUp(false)}/>}
    </article>
  );
}
