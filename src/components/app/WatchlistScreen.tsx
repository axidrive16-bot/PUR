"use client";
import { useWatchlistStore } from "@/store/usePortfolioStore";
import { T, BS, scoreInfo } from "@/components/ui/tokens";
import { useToast } from "@/components/ui/Toast";

export function WatchlistScreen(){
  const{sorted,toggle}=useWatchlistStore();
  const toast=useToast();
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
              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <button style={{...BS.microBtn,color:T.red,borderColor:`${T.red}22`,fontSize:10}} onClick={()=>{toggle(s);toast(`${s.ticker} retiré`,"info");}}>Retirer</button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
