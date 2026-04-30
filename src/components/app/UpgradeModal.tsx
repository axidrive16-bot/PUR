"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { T, BS, SUB } from "@/components/ui/tokens";
import { PurLogo } from "@/components/ui/PurLogo";
import { auth } from "@/lib/auth";

export function UpgradeModal({onClose}:{onClose:()=>void}){
  const toast=useToast();
  const[loading,setLoading]=useState(false);
  const feats=["Screenings illimités","ETF & fonds conformes","Bilans d'entreprise","Alertes de conformité","Historique du score","Score de durabilité","Calcul Zakat automatique","Support prioritaire"];

  async function handleCheckout(){
    setLoading(true);
    try{
      const session=await auth.getSession();
      const token=session?.access_token;
      if(!token){toast("Connectez-vous pour continuer","info");onClose();return;}

      const res=await fetch("/api/stripe/checkout",{
        method:"POST",
        headers:token?{Authorization:`Bearer ${token}`}:{},
      });
      const data=await res.json();
      if(!res.ok||!data.url){
        toast(data.error==="Stripe not configured"?"Paiement bientôt disponible !":"Une erreur est survenue","info");
        onClose();return;
      }
      window.location.href=data.url;
    }catch{
      toast("Une erreur est survenue","info");
    }finally{
      setLoading(false);
    }
  }

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
      <button
        style={{...BS.btnPrimary,opacity:loading?.6:1,cursor:loading?"not-allowed":"pointer"}}
        onClick={handleCheckout}
        disabled={loading}
      >
        {loading?"Chargement…":`Commencer — ${SUB.TRIAL} jours d'essai gratuit`}
      </button>
      <button style={{...BS.btnGhost,width:"100%",marginTop:10}} onClick={onClose}>Pas maintenant</button>
    </Modal>
  );
}
