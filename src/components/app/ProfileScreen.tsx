"use client";
import { useState } from "react";
import { useUserStore } from "@/store/usePortfolioStore";
import { T, BS, SUB } from "@/components/ui/tokens";
import { PurLogo } from "@/components/ui/PurLogo";
import { useToast } from "@/components/ui/Toast";
import { UpgradeModal } from "./UpgradeModal";
import { AuthModal } from "./AuthModal";
import { LegalModal } from "./LegalModal";

const PROFILE_FAQ=[
  {q:"C'est quoi PUR ?",a:"PUR est une application qui analyse les bilans financiers des entreprises cotées et calcule un score de conformité basé sur 3 ratios objectifs : endettement, revenus, et liquidités. L'objectif est de vous donner les informations nécessaires pour investir selon vos valeurs."},
  {q:"Qu'est-ce que le score de conformité ?",a:"Le score va de 0 à 100.\n\n✓ Score ≥ 75 : Conforme\n! Score 40–74 : À surveiller\n✕ Score < 40 : Non conforme\n\nCe score est recalculé à chaque publication de résultats trimestriels."},
  {q:"Quels sont les critères AAOIFI ?",a:"PUR analyse 3 ratios :\n• Dette ≤ 33 % des actifs totaux\n• Revenus sensibles ≤ 5 % du CA (intérêts, alcool, jeux…)\n• Liquidités ≤ 33 % des actifs\n\nPlus le score est élevé, plus l'entreprise respecte ces critères."},
  {q:"C'est quoi la purification des dividendes ?",a:"Si une entreprise conforme a malgré tout une petite part de revenus sensibles (ex. 2 %), PUR calcule que 2 % de vos dividendes reçus doivent être donnés en charité. C'est la purification."},
  {q:"C'est quoi la Zakat ?",a:"La Zakat est un prélèvement annuel de 2,5 % sur les actifs éligibles au-delà d'un certain seuil. PUR estime le montant selon la valeur de votre portefeuille. Consultez un érudit qualifié pour une décision précise."},
  {q:"Que faire si mon action devient non conforme ?",a:"Si une action passe sous le seuil, PUR vous alerte dans la Watchlist. Vous décidez ensuite de conserver, réduire ou vendre. PUR ne donne aucun conseil d'investissement : chaque décision vous appartient entièrement."},
  {q:"PUR donne-t-il des conseils financiers ?",a:"Non. PUR est strictement un outil d'information et d'analyse. Les scores ne constituent en aucun cas des conseils en investissement. Consultez un conseiller financier agréé pour des conseils adaptés à votre situation."},
  {q:"Comment fonctionne l'abonnement ?",a:"PUR propose un essai gratuit de 14 jours sans carte bancaire requise. À l'issue de l'essai, un abonnement mensuel de 9,99 €/mois est requis pour continuer à utiliser toutes les fonctionnalités. Résiliable à tout moment."},
];

export function ProfileScreen({setTab,onSignOut}:{setTab:(t:string)=>void;onSignOut:()=>void}){
  const{isPremium,screenings,setIsPremium,email,id}=useUserStore();
  const isGuest=id==="guest";
  const toast=useToast();
  const[showUp,setShowUp]=useState(false);const[showAuth,setShowAuth]=useState(false);
  const[showLegal,setShowLegal]=useState(false);
  const[openFaq,setOpenFaq]=useState<number|null>(null);
  const trialDaysLeft=14;

  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease",background:T.bg}}>
      <div style={{padding:"52px 20px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <PurLogo size={34}/>
          <div style={{background:isPremium?T.forest:T.amberBg,borderRadius:12,padding:"6px 12px",textAlign:"center"}}>
            <p style={{fontSize:11,fontWeight:700,color:isPremium?"#E8F0EB":T.amber,lineHeight:1.2}}>{isPremium?"Premium actif":"Essai gratuit"}</p>
            {!isPremium&&<p style={{fontSize:9,color:T.amber,marginTop:1}}>{trialDaysLeft} jours restants</p>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:16}}><p style={{fontSize:10,color:T.textMuted,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>Analyses</p><p style={{fontSize:22,fontWeight:800,color:T.text}}>{screenings}</p></div>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:16}}><p style={{fontSize:10,color:T.textMuted,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>Statut</p><p style={{fontSize:13,fontWeight:700,color:isPremium?T.green:T.amber}}>{isPremium?"Premium ✓":"Essai gratuit"}</p></div>
        </div>
        {!isPremium&&<button onClick={()=>setShowUp(true)} style={{width:"100%",background:T.forest,borderRadius:16,padding:20,marginBottom:16,cursor:"pointer",textAlign:"left",fontFamily:"inherit",border:"none"}}>
          <p style={{fontSize:16,fontWeight:800,color:"#E8F0EB",marginBottom:5}}>Passer à Premium</p>
          <p style={{fontSize:12,color:"rgba(200,230,201,0.6)",marginBottom:14,lineHeight:1.6}}>Analyses illimitées · Bilans complets · Calcul Zakat automatique</p>
          <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:12}}><span style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:"#E8F0EB"}}>{SUB.PRICE}€</span><span style={{fontSize:12,color:"rgba(200,230,201,0.5)"}}>/ mois après {SUB.TRIAL} jours d'essai</span></div>
          <div style={{background:"#E8F0EB",borderRadius:10,padding:"10px",textAlign:"center",fontSize:13,fontWeight:700,color:T.forest}}>Commencer l'essai gratuit</div>
        </button>}
        {isGuest
          ?<button onClick={()=>setShowAuth(true)} style={{width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:15,marginBottom:12,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit",textAlign:"left"}}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:16}}>🔐</span><span style={{fontSize:13,color:T.text}}>Se connecter / Créer un compte</span></div><span style={{color:T.textMuted}}>›</span></button>
          :<div style={{width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:15,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:16}}>👤</span><span style={{fontSize:13,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:220}}>{email}</span></div>
            <button onClick={onSignOut} style={{background:"none",border:`1px solid ${T.red}30`,borderRadius:8,padding:"4px 10px",color:T.red,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>Déconnecter</button>
          </div>
        }
        <button onClick={()=>setTab("portfolio")} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",border:"none",borderBottom:`1px solid ${T.border}`,cursor:"pointer",background:"none",fontFamily:"inherit",textAlign:"left"}}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:16}}>📊</span><span style={{fontSize:13,color:T.text}}>Mes portefeuilles</span></div><span style={{color:T.textMuted}}>›</span></button>
        <button onClick={()=>setTab("portfolio")} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",border:"none",borderBottom:`1px solid ${T.border}`,cursor:"pointer",background:"none",fontFamily:"inherit",textAlign:"left"}}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:16}}>🧮</span><span style={{fontSize:13,color:T.text}}>Calcul Zakat</span></div><span style={{color:T.textMuted}}>›</span></button>
        <button onClick={()=>setTab("methodology")} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",border:"none",borderBottom:`1px solid ${T.border}`,cursor:"pointer",background:"none",fontFamily:"inherit",textAlign:"left"}}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:16}}>🕌</span><span style={{fontSize:13,color:T.text}}>Méthodologie AAOIFI</span></div><span style={{color:T.textMuted}}>›</span></button>
        <button onClick={()=>setShowLegal(true)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",border:"none",borderBottom:`1px solid ${T.border}`,cursor:"pointer",background:"none",fontFamily:"inherit",textAlign:"left"}}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:16}}>⚖️</span><span style={{fontSize:13,color:T.text}}>Mentions légales</span></div><span style={{color:T.textMuted}}>›</span></button>
        <button onClick={()=>toast("Support disponible à support@pur.app","info")} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",border:"none",borderBottom:`1px solid ${T.border}`,cursor:"pointer",background:"none",fontFamily:"inherit",textAlign:"left"}}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:16}}>💬</span><span style={{fontSize:13,color:T.text}}>Support</span></div><span style={{color:T.textMuted}}>›</span></button>
        <p style={{fontSize:13,fontWeight:700,color:T.text,marginTop:24,marginBottom:12}}>Questions fréquentes</p>
        {PROFILE_FAQ.map((item,i)=>(
          <div key={i} style={{background:T.surface,border:`1px solid ${openFaq===i?T.emerald+"40":T.border}`,borderRadius:13,marginBottom:8,overflow:"hidden"}}>
            <button onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{width:"100%",padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
              <span style={{fontSize:13,fontWeight:700,color:T.text,paddingRight:12,flex:1}}>{item.q}</span>
              <span style={{fontSize:11,color:T.textMuted,flexShrink:0}}>{openFaq===i?"▲":"▼"}</span>
            </button>
            {openFaq===i&&<div style={{padding:"0 16px 16px"}}>
              <div style={{height:1,background:T.border,marginBottom:12}}/>
              <p style={{fontSize:13,color:T.textSub,lineHeight:1.75,whiteSpace:"pre-line"}}>{item.a}</p>
            </div>}
          </div>
        ))}
        {isPremium&&<button style={{...BS.btnGhost,width:"100%",marginTop:18,color:T.red,borderColor:`${T.red}20`}} onClick={()=>{setIsPremium(false);toast("Abonnement annulé","info");}}>Annuler l'abonnement</button>}
      </div>
      {showUp&&<UpgradeModal onClose={()=>setShowUp(false)}/>}
      {showAuth&&<AuthModal onClose={()=>setShowAuth(false)}/>}
      {showLegal&&<LegalModal onClose={()=>setShowLegal(false)}/>}
    </div>
  );
}
