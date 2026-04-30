"use client";
import { useState } from "react";
import { portfolioDB } from "@/lib/db";
import { useUserStore } from "@/store/usePortfolioStore";
import { Modal } from "@/components/ui/Modal";
import { T, BS } from "@/components/ui/tokens";
import type { usePortfolios } from "@/hooks/usePortfolios";

export function AddToPortfolioModal({asset,pfCtx,onClose}:{asset:any;pfCtx:ReturnType<typeof usePortfolios>;onClose:()=>void}){
  const[mode,setMode]=useState<"eur"|"shares">("eur");
  const[eurVal,setEurVal]=useState("100");
  const[sharesVal,setSharesVal]=useState("");
  const userId=useUserStore(s=>s.id);
  const price=asset.price??1;
  const parsedEur=parseFloat(eurVal)||0;
  const parsedShares=parseFloat(sharesVal)||0;
  const sharesFromEur=parsedEur/price;
  const eurFromShares=parsedShares*price;
  const finalShares=mode==="eur"?sharesFromEur:parsedShares;

  const handleAdd=async()=>{
    if(finalShares<=0)return;
    const qty=parseFloat(finalShares.toFixed(4));
    pfCtx.addToActive(asset,qty);
    onClose();
    if(userId!=="guest"){
      const row=await portfolioDB.add(userId,asset.ticker,qty,asset.price);
      if(row)pfCtx.setHoldingId(asset.ticker,row.id);
    }
  };

  return(
    <Modal onClose={onClose}>
      <h2 style={{fontSize:19,fontWeight:800,color:T.text,marginBottom:4}}>Ajouter {asset.ticker}</h2>
      <p style={{fontSize:12,color:T.textMuted,marginBottom:18}}>Cours actuel : <strong style={{color:T.text}}>{price}$</strong></p>
      <div style={{...BS.segCtrl,marginBottom:18}}>
        <button onClick={()=>setMode("eur")} style={{...BS.seg,...(mode==="eur"?BS.segActive:{})}}>Montant en €</button>
        <button onClick={()=>setMode("shares")} style={{...BS.seg,...(mode==="shares"?BS.segActive:{})}}>Nombre d'actions</button>
      </div>
      {mode==="eur"&&(
        <div>
          <label style={{fontSize:12,color:T.textSub,marginBottom:5,display:"block"}}>Montant à investir</label>
          <div style={{position:"relative",marginBottom:12}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16,color:T.textMuted,fontWeight:700}}>€</span>
            <input type="number" min="1" value={eurVal} onChange={e=>setEurVal(e.target.value)} style={{...BS.input,paddingLeft:32}} autoFocus/>
          </div>
          <div style={{background:T.surface2,borderRadius:10,padding:"12px 14px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:T.textSub}}>Nombre d'actions</span><span style={{fontSize:16,fontWeight:800,color:T.forest}}>{sharesFromEur.toFixed(4)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}><span style={{fontSize:11,color:T.textMuted}}>Fractions incluses</span><span style={{fontSize:11,color:T.textMuted}}>≈ {parsedEur.toFixed(2)} €</span></div>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:18}}>
            {[50,100,250,500,1000].map(v=><button key={v} onClick={()=>setEurVal(String(v))} style={{flex:1,height:30,background:parseFloat(eurVal)===v?T.forest:T.surface2,color:parseFloat(eurVal)===v?"#E8F0EB":T.textSub,border:"none",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{v}€</button>)}
          </div>
        </div>
      )}
      {mode==="shares"&&(
        <div>
          <label style={{fontSize:12,color:T.textSub,marginBottom:5,display:"block"}}>Nombre d'actions</label>
          <input type="number" min="0.0001" step="0.1" value={sharesVal} onChange={e=>setSharesVal(e.target.value)} placeholder="ex : 2.5" style={{...BS.input,marginBottom:12}} autoFocus/>
          {parsedShares>0&&(
            <div style={{background:T.surface2,borderRadius:10,padding:"12px 14px",marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:T.textSub}}>Montant équivalent</span><span style={{fontSize:16,fontWeight:800,color:T.forest}}>{eurFromShares.toFixed(2)} $</span></div>
            </div>
          )}
        </div>
      )}
      <button style={{...BS.btnPrimary,opacity:finalShares>0?1:0.45}} onClick={handleAdd} disabled={finalShares<=0}>
        Ajouter {finalShares>0?`${finalShares.toFixed(4)} action${finalShares!==1?"s":""}`:""} au portefeuille
      </button>
      <button style={{...BS.btnGhost,width:"100%",marginTop:10}} onClick={onClose}>Annuler</button>
    </Modal>
  );
}
