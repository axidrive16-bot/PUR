#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# PUR — Setup 9 : Gamification + FAQ + Tooltips + Quiz
# ═══════════════════════════════════════════════════════════════════
set -e
echo "🎮 PUR — Gamification v4..."

# ── src/store/useGamificationStore.ts ─────────────────────────────
mkdir -p src/store
cat > src/store/useGamificationStore.ts << 'STOREOF'
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BadgeId =
  | "first_analysis" | "five_analyses" | "twenty_analyses"
  | "first_watchlist" | "first_portfolio"
  | "streak_3" | "streak_7" | "streak_30"
  | "score_80" | "score_90" | "all_halal"
  | "quiz_5" | "quiz_20" | "learn_10"
  | "purification_done" | "zakat_done";

export interface Badge { id:BadgeId; name:string; desc:string; icon:string; xp:number; }
export interface Mission { id:string; label:string; target:number; progress:number; xpReward:number; done:boolean; type:string; }

export interface GamificationState {
  xp:number; level:number; streak:number; lastActiveDate:string|null;
  badges:BadgeId[]; missions:Mission[]; missionsWeek:string|null;
  totalAnalyses:number; totalQuizzes:number; totalLearn:number;
  simPortfolio:Array<{ticker:string;score:number;name:string}>;
  notifications:Array<{id:number;msg:string;read:boolean}>;
  addXP:(amount:number,reason:string)=>void;
  trackAnalysis:()=>void; trackWatchlist:()=>void;
  trackQuiz:()=>void; trackLearn:()=>void;
  trackPurif:()=>void; trackZakat:()=>void;
  updateMission:(id:string,delta?:number)=>void;
  checkStreak:()=>void; updateScore:(s:number)=>void;
  addSimStock:(ticker:string,score:number,name:string)=>void;
  removeSimStock:(ticker:string)=>void;
  readNotif:(id:number)=>void;
  resetMissionsIfNewWeek:()=>void;
}

export const XP_PER_LEVEL = (lvl:number) => Math.floor(100 * Math.pow(1.4, lvl - 1));
export function computeLevel(xp:number):{level:number;xpInLevel:number;xpNeeded:number;pct:number}{
  let level=1,remaining=xp;
  while(remaining>=XP_PER_LEVEL(level)){remaining-=XP_PER_LEVEL(level);level++;}
  const xpNeeded=XP_PER_LEVEL(level);
  return{level,xpInLevel:remaining,xpNeeded,pct:Math.round((remaining/xpNeeded)*100)};
}

export const BADGES:Badge[]=[
  {id:"first_analysis",   name:"Première analyse",    desc:"Analysez votre première action",              icon:"🔍",xp:50},
  {id:"five_analyses",    name:"Explorateur",          desc:"Analysez 5 actions",                          icon:"🧭",xp:100},
  {id:"twenty_analyses",  name:"Expert",               desc:"Analysez 20 actions",                         icon:"🏆",xp:300},
  {id:"first_watchlist",  name:"Curieux",              desc:"Ajoutez une action à votre watchlist",        icon:"🔖",xp:30},
  {id:"first_portfolio",  name:"Investisseur",         desc:"Ajoutez une action au portefeuille",          icon:"📊",xp:50},
  {id:"streak_3",         name:"Régulier",             desc:"3 jours consécutifs conformes",               icon:"🔥",xp:75},
  {id:"streak_7",         name:"Persévérant",          desc:"7 jours consécutifs",                         icon:"⚡",xp:150},
  {id:"streak_30",        name:"Maître",               desc:"30 jours consécutifs",                        icon:"💎",xp:500},
  {id:"score_80",         name:"Pureté 80",            desc:"Score de conformité ≥ 80",                    icon:"✨",xp:100},
  {id:"score_90",         name:"Pureté 90",            desc:"Score de conformité ≥ 90",                    icon:"🌟",xp:200},
  {id:"all_halal",        name:"Portefeuille pur",     desc:"100% d'actifs conformes",                     icon:"🌿",xp:250},
  {id:"quiz_5",           name:"Apprenant",            desc:"Répondez à 5 quiz",                           icon:"📚",xp:75},
  {id:"quiz_20",          name:"Savant",               desc:"Répondez à 20 quiz",                          icon:"🎓",xp:200},
  {id:"learn_10",         name:"Érudit",               desc:"Consultez 10 fiches éducatives",              icon:"💡",xp:100},
  {id:"purification_done",name:"Purificateur",         desc:"Marquez une purification",                    icon:"🌙",xp:80},
  {id:"zakat_done",       name:"Donateur",             desc:"Acquittez la Zakat",                          icon:"💝",xp:120},
];

function getWeekKey(){const d=new Date();const jan1=new Date(d.getFullYear(),0,1);const w=Math.ceil(((d.getTime()-jan1.getTime())/86400000+jan1.getDay()+1)/7);return `${d.getFullYear()}-W${w}`;}

function generateMissions():Mission[]{return[
  {id:"m1",label:"Analysez 3 actions",             target:3,progress:0,xpReward:80, done:false,type:"analysis"},
  {id:"m2",label:"Consultez 2 fiches éducatives",  target:2,progress:0,xpReward:50, done:false,type:"learn"},
  {id:"m3",label:"Répondez à 1 quiz",              target:1,progress:0,xpReward:40, done:false,type:"quiz"},
  {id:"m4",label:"Ajoutez 1 action à la watchlist",target:1,progress:0,xpReward:30, done:false,type:"watchlist"},
  {id:"m5",label:"Maintenez votre streak 3 jours", target:3,progress:0,xpReward:100,done:false,type:"streak"},
];}

export const useGamificationStore=create<GamificationState>()(persist((set,get)=>({
  xp:0,level:1,streak:0,lastActiveDate:null,
  badges:[],missions:generateMissions(),missionsWeek:getWeekKey(),
  totalAnalyses:0,totalQuizzes:0,totalLearn:0,
  simPortfolio:[],notifications:[],

  addXP:(amount,reason)=>set(s=>{
    const newXp=s.xp+amount;
    const{level}=computeLevel(newXp);
    const leveled=level>s.level;
    const notif={id:Date.now(),msg:leveled?`🎉 Niveau ${level} atteint ! +${amount} XP`:`+${amount} XP — ${reason}`,read:false};
    return{xp:newXp,level,notifications:[...s.notifications.slice(-9),notif]};
  }),

  trackAnalysis:()=>{
    const s=get();const n=s.totalAnalyses+1;set({totalAnalyses:n});
    s.addXP(20,"Analyse d'action");s.updateMission("m1");
    if(n===1&&!s.badges.includes("first_analysis")){s.addXP(50,"Badge débloqué");set(st=>({badges:[...st.badges,"first_analysis"]}));}
    if(n===5&&!s.badges.includes("five_analyses")){s.addXP(100,"Badge débloqué");set(st=>({badges:[...st.badges,"five_analyses"]}));}
    if(n===20&&!s.badges.includes("twenty_analyses")){s.addXP(300,"Badge débloqué");set(st=>({badges:[...st.badges,"twenty_analyses"]}));}
  },

  trackWatchlist:()=>{
    const s=get();s.addXP(15,"Ajout watchlist");s.updateMission("m4");
    if(!s.badges.includes("first_watchlist"))set(st=>({badges:[...st.badges,"first_watchlist"]}));
  },

  trackQuiz:()=>{
    const s=get();const n=s.totalQuizzes+1;set({totalQuizzes:n});
    s.addXP(25,"Quiz réussi");s.updateMission("m3");
    if(n===5&&!s.badges.includes("quiz_5"))set(st=>({badges:[...st.badges,"quiz_5"]}));
    if(n===20&&!s.badges.includes("quiz_20"))set(st=>({badges:[...st.badges,"quiz_20"]}));
  },

  trackLearn:()=>{
    const s=get();const n=s.totalLearn+1;set({totalLearn:n});
    s.addXP(10,"Fiche éducative");s.updateMission("m2");
    if(n===10&&!s.badges.includes("learn_10"))set(st=>({badges:[...st.badges,"learn_10"]}));
  },

  trackPurif:()=>{const s=get();s.addXP(30,"Purification");if(!s.badges.includes("purification_done"))set(st=>({badges:[...st.badges,"purification_done"]}));},
  trackZakat:()=>{const s=get();s.addXP(50,"Zakat acquittée");if(!s.badges.includes("zakat_done"))set(st=>({badges:[...st.badges,"zakat_done"]}));},

  updateMission:(id,delta=1)=>set(s=>({missions:s.missions.map(m=>{
    if(m.id!==id||m.done)return m;
    const progress=Math.min(m.progress+delta,m.target);const done=progress>=m.target;
    if(done)setTimeout(()=>get().addXP(m.xpReward,`Mission : ${m.label}`),100);
    return{...m,progress,done};
  })})),

  checkStreak:()=>{
    const today=new Date().toISOString().split("T")[0];const s=get();
    if(s.lastActiveDate===today)return;
    const yesterday=new Date(Date.now()-86400000).toISOString().split("T")[0];
    const newStreak=s.lastActiveDate===yesterday?s.streak+1:1;
    set({streak:newStreak,lastActiveDate:today});s.updateMission("m5");
    s.addXP(5,`Streak jour ${newStreak}`);
    if(newStreak===3&&!s.badges.includes("streak_3"))set(st=>({badges:[...st.badges,"streak_3"]}));
    if(newStreak===7&&!s.badges.includes("streak_7"))set(st=>({badges:[...st.badges,"streak_7"]}));
    if(newStreak===30&&!s.badges.includes("streak_30"))set(st=>({badges:[...st.badges,"streak_30"]}));
  },

  updateScore:(score)=>{
    const s=get();
    if(score>=80&&!s.badges.includes("score_80")){s.addXP(100,"Badge Pureté 80");set(st=>({badges:[...st.badges,"score_80"]}));}
    if(score>=90&&!s.badges.includes("score_90")){s.addXP(200,"Badge Pureté 90");set(st=>({badges:[...st.badges,"score_90"]}));}
  },

  addSimStock:(ticker,score,name)=>set(s=>({simPortfolio:s.simPortfolio.find(x=>x.ticker===ticker)?s.simPortfolio:[...s.simPortfolio,{ticker,score,name}]})),
  removeSimStock:(ticker)=>set(s=>({simPortfolio:s.simPortfolio.filter(x=>x.ticker!==ticker)})),
  readNotif:(id)=>set(s=>({notifications:s.notifications.map(n=>n.id===id?{...n,read:true}:n)})),
  resetMissionsIfNewWeek:()=>{const wk=getWeekKey();const s=get();if(s.missionsWeek!==wk)set({missions:generateMissions(),missionsWeek:wk});},
}),{name:"pur-gamification"}));
STOREOF

# ── src/components/ScoreTooltip.tsx ──────────────────────────────
cat > src/components/ScoreTooltip.tsx << 'TTEOF'
"use client";
import { useState } from "react";

const INFOS: Record<string,{title:string;desc:string}> = {
  score:  {title:"Score de conformité",  desc:"Mesure le respect des critères sur 3 ratios : dette (max 33%), revenus sensibles (max 5%), liquidités (max 33%). Score ≥ 75 = Conforme."},
  esg:    {title:"Score ESG",            desc:"Environnement, Social, Gouvernance. Mesure la responsabilité de l'entreprise vis-à-vis de la planète, de ses employés et de sa gouvernance."},
  divers: {title:"Diversification",      desc:"Répartition de vos actifs entre secteurs et entreprises. Un portefeuille diversifié réduit le risque lié à une seule entreprise."},
  risque: {title:"Score de sécurité",    desc:"Basé sur la volatilité (beta) de chaque actif. Plus il est élevé, plus votre portefeuille est stable face aux variations de marché."},
};

export function InfoTooltip({id}:{id:string}){
  const[show,setShow]=useState(false);
  const info=INFOS[id];if(!info)return null;
  return(
    <div style={{position:"relative",display:"inline-flex"}}>
      <button
        onClick={e=>{e.stopPropagation();setShow(s=>!s);}}
        onBlur={()=>setTimeout(()=>setShow(false),150)}
        style={{width:15,height:15,borderRadius:8,background:"rgba(0,0,0,0.07)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#A8A49C",fontWeight:700,flexShrink:0,lineHeight:1}}
        aria-label={`Info : ${info.title}`}
      >ℹ</button>
      {show&&(
        <div style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",width:190,background:"#FFFFFF",border:"1px solid rgba(0,0,0,0.09)",borderRadius:12,padding:"11px 13px",zIndex:100,boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#1A1A16",marginBottom:4}}>{info.title}</div>
          <div style={{fontSize:10,color:"#6B6960",lineHeight:1.65}}>{info.desc}</div>
        </div>
      )}
    </div>
  );
}
TTEOF

# ── src/components/LearnScreen.tsx ───────────────────────────────
cat > src/components/LearnScreen.tsx << 'LEARNEOF'
"use client";
import { useState, useEffect } from "react";
import { useGamificationStore, computeLevel, BADGES } from "@/store/useGamificationStore";

const T={
  bg:"#F7F5F0",surface:"#FFFFFF",surface2:"#F2F0EB",surface3:"#ECEAE4",
  border:"rgba(0,0,0,0.07)",borderMid:"rgba(0,0,0,0.12)",
  forest:"#1A3A2A",emerald:"#208640",amber:"#B07D2A",red:"#A32D2D",
  text:"#1A1A16",textSub:"#6B6960",textMuted:"#A8A49C",
  greenBg:"#EAF3DE",amberBg:"#FDF3E0",redBg:"#FCEBEB",
};

const FAQ=[
  {q:"C'est quoi PUR ?",a:"PUR est une application qui analyse les bilans financiers des entreprises cotées en bourse et calcule un score de conformité basé sur 3 ratios objectifs : niveau d'endettement, nature des revenus, et liquidités. L'objectif est de vous donner les informations dont vous avez besoin pour investir selon vos valeurs."},
  {q:"Qu'est-ce que la bourse ?",a:"La bourse est un marché organisé où des entreprises proposent des parts d'elles-mêmes (appelées actions) à des investisseurs. En achetant une action, vous devenez copropriétaire d'une fraction de l'entreprise et participez à ses résultats financiers."},
  {q:"C'est quoi une action ?",a:"Une action est un titre de propriété d'une entreprise. Si vous achetez 1 action Apple, vous êtes propriétaire d'une infime partie d'Apple. Si l'entreprise réalise des bénéfices, la valeur de votre action peut augmenter. Si elle en perd, elle peut baisser."},
  {q:"C'est quoi un ETF ?",a:"Un ETF (Exchange Traded Fund) est un panier d'actions regroupées en un seul titre. Plutôt que d'acheter des actions individuellement, vous investissez dans des dizaines ou centaines d'entreprises à la fois. C'est une façon simple de diversifier son investissement avec un seul achat."},
  {q:"Quels sont les critères de conformité ?",a:"PUR analyse 3 ratios issus des bilans trimestriels :\n\n• Ratio d'endettement : la dette ne doit pas dépasser 33% des actifs totaux.\n• Revenus non conformes : les revenus sensibles (intérêts, alcool, jeux…) ne doivent pas dépasser 5% du chiffre d'affaires.\n• Liquidités : les placements monétaires ne doivent pas dépasser 33% des actifs.\n\nPlus le score est élevé, plus l'entreprise respecte ces critères."},
  {q:"Que signifie le score ?",a:"Le score va de 0 à 100.\n\n✓ Score ≥ 75 : Conforme — vous pouvez investir sereinement.\n! Score entre 40 et 74 : À surveiller — approchez par précaution.\n✕ Score < 40 : Non conforme — ne correspond pas aux critères.\n\nCe score est recalculé à chaque publication de résultats trimestriels."},
  {q:"Que faire si mon action devient non conforme ?",a:"Si une action que vous suivez passe sous le seuil de conformité, PUR vous alerte dans la section Watchlist. Vous pouvez alors décider de la conserver, de la réduire ou de la vendre selon votre propre jugement. PUR ne vous dit jamais quoi faire : c'est entièrement votre décision."},
  {q:"C'est quoi la purification des dividendes ?",a:"Certaines entreprises conformes ont malgré tout une petite part de revenus sensibles. Si 2% des revenus viennent d'intérêts par exemple, PUR calcule que 2% de vos dividendes reçus doivent être donnés en charité. C'est ce qu'on appelle la purification."},
  {q:"C'est quoi la Zakat ?",a:"La Zakat est un prélèvement annuel de 2.5% sur les actifs éligibles qui dépassent un certain seuil. PUR calcule automatiquement le montant approximatif selon la valeur de votre portefeuille. C'est une estimation — consultez un érudit qualifié pour une décision précise dans votre situation."},
  {q:"C'est quoi le score ESG ?",a:"ESG signifie Environnement, Social, Gouvernance. C'est un indicateur de la responsabilité d'une entreprise vis-à-vis de la planète et de la société. Un score élevé signifie que l'entreprise respecte des standards environnementaux, traite bien ses employés et est bien gouvernée."},
  {q:"À quoi sert la diversification ?",a:"Mettre tout son argent dans une seule entreprise est risqué : si elle chute, tout votre investissement est impacté. La diversification consiste à investir dans plusieurs entreprises, secteurs ou régions pour réduire ce risque. PUR mesure cela avec le score de diversification."},
  {q:"PUR donne-t-il des conseils financiers ?",a:"Non. PUR est strictement un outil d'information et d'analyse. Les scores et informations présentés ne constituent en aucun cas des conseils en investissement. Toute décision d'achat ou de vente vous appartient entièrement. Consultez un conseiller financier agréé pour des conseils adaptés à votre situation personnelle."},
];

const QUIZZES=[
  {q:"Quel est le seuil maximum de dette autorisé par PUR ?",choices:["20%","33%","50%","10%"],correct:1,xp:25},
  {q:"Un ETF, c'est quoi ?",choices:["Une action individuelle","Un panier d'actions","Un compte épargne","Un dividende"],correct:1,xp:20},
  {q:"À partir de quel score une action est 'Conforme' ?",choices:["50","60","75","90"],correct:2,xp:25},
  {q:"Que mesure le ratio de revenus non conformes ?",choices:["La dette totale","Les dividendes versés","La part de revenus sensibles","Le cash en banque"],correct:2,xp:25},
  {q:"La diversification sert à…",choices:["Maximiser les gains","Réduire le risque","Payer moins d'impôts","Choisir les meilleures actions"],correct:1,xp:20},
  {q:"La Zakat représente quel pourcentage annuel ?",choices:["1%","2%","2.5%","5%"],correct:2,xp:25},
  {q:"ESG signifie…",choices:["Économie Sociale Globale","Environnement Social Gouvernance","Equity Shariah Global","Euro Standard Growth"],correct:1,xp:20},
  {q:"Qu'est-ce qu'un dividende ?",choices:["Une taxe sur les gains","Une part des bénéfices versée aux actionnaires","Un emprunt bancaire","Un type d'ETF"],correct:1,xp:20},
  {q:"À quoi sert la purification ?",choices:["Augmenter le rendement","Donner la part non conforme des dividendes reçus","Supprimer une action","Calculer l'impôt"],correct:1,xp:25},
  {q:"Que signifie un score de volatilité 'Élevée' ?",choices:["L'action est non conforme","L'action varie beaucoup en prix","L'entreprise est très endettée","Les dividendes sont élevés"],correct:1,xp:20},
];

const LEARN_CARDS=[
  {icon:"🏦",title:"Comment lire un bilan",cat:"Finance",content:"Un bilan financier montre ce qu'une entreprise possède (actifs) et ce qu'elle doit (passifs). Les actifs incluent bâtiments, équipements, brevets et liquidités. Les passifs incluent les dettes bancaires. La différence constitue les capitaux propres — c'est la richesse nette de l'entreprise."},
  {icon:"📈",title:"Actions vs Obligations",cat:"Finance",content:"Une action = part de propriété d'une entreprise. Une obligation = prêt à une entreprise qui verse des intérêts. Les obligations conventionnelles sont basées sur l'intérêt et ne correspondent généralement pas aux critères de conformité. Les actions d'entreprises conformes sont la voie recommandée."},
  {icon:"🌍",title:"Investir en ETF",cat:"Finance",content:"Un ETF conforme investit uniquement dans des entreprises conformes. Il est géré par un organisme qui filtre régulièrement les composants. Avantage : diversification instantanée avec un seul achat. iShares MSCI World Islamic filtre automatiquement les entreprises non conformes."},
  {icon:"📊",title:"Comprendre la volatilité",cat:"Risque",content:"La volatilité mesure les variations de prix d'une action. Faible volatilité = variations douces et prévisibles. Élevée = variations importantes à court terme. Une action tech peut varier de 5% en une journée. Ce n'est ni bon ni mauvais — c'est une mesure du risque de court terme."},
  {icon:"💰",title:"Les dividendes expliqués",cat:"Rendement",content:"Quand une entreprise réalise des bénéfices, elle peut les distribuer à ses actionnaires sous forme de dividendes. Le rendement en dividende = dividende annuel / prix de l'action. Une entreprise qui verse 2€ pour une action à 100€ a un rendement de 2%. Certains dividendes peuvent nécessiter une purification."},
  {icon:"⚖️",title:"Équilibrer son portefeuille",cat:"Stratégie",content:"Un portefeuille équilibré répartit les investissements entre différents secteurs (technologie, santé, consommation…) et régions géographiques. L'objectif n'est pas de maximiser les gains mais de réduire l'exposition à un seul risque. PUR mesure cela avec le score de diversification."},
];

export default function LearnScreen(){
  const gStore=useGamificationStore();
  const{xp,streak,badges,missions,notifications}=gStore;
  const lvlInfo=computeLevel(xp);
  const[tab,setTab]=useState<"home"|"faq"|"quiz"|"learn"|"badges"|"sim">("home");
  const[openFaq,setOpenFaq]=useState<number|null>(null);
  const[quizIdx,setQuizIdx]=useState(0);
  const[quizAns,setQuizAns]=useState<number|null>(null);
  const[quizDone,setQuizDone]=useState(false);
  const[readCards,setReadCards]=useState<Set<number>>(new Set());
  const unread=notifications.filter(n=>!n.read).length;

  useEffect(()=>{gStore.resetMissionsIfNewWeek();gStore.checkStreak();},[]);

  const handleLearn=(idx:number)=>{if(!readCards.has(idx)){setReadCards(new Set([...readCards,idx]));gStore.trackLearn();}};
  const handleQuizAnswer=(idx:number)=>{if(quizAns!==null)return;setQuizAns(idx);if(idx===QUIZZES[quizIdx].correct)gStore.trackQuiz();};
  const nextQuiz=()=>{if(quizIdx<QUIZZES.length-1){setQuizIdx(q=>q+1);setQuizAns(null);}else setQuizDone(true);};
  const pctMissions=missions.filter(m=>m.done).length/missions.length*100;

  const tabBtn=(id:typeof tab,lbl:string)=>(
    <button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,height:32,padding:"0 12px",background:tab===id?T.forest:T.surface2,color:tab===id?"#E8F0EB":T.textSub,border:"none",borderRadius:9,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{lbl}</button>
  );

  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,background:T.bg,animation:"screenIn .28s ease"}}>
      <header style={{padding:"52px 20px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h1 style={{fontSize:22,fontWeight:800,color:T.text,letterSpacing:"-.5px"}}>Apprendre</h1>
        {unread>0&&<div style={{background:T.emerald,color:"#fff",fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:100}}>{unread} nouveau{unread>1?"x":""}</div>}
      </header>

      {/* XP Card */}
      <section style={{padding:"0 20px 14px"}}>
        <div style={{background:T.forest,borderRadius:18,padding:"18px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div>
              <div style={{fontSize:10,color:"rgba(200,230,201,0.5)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:3}}>Progression</div>
              <div style={{fontSize:24,fontWeight:800,color:"#E8F0EB",lineHeight:1}}>Niveau {lvlInfo.level}</div>
              <div style={{fontSize:12,color:"rgba(200,230,201,0.55)",marginTop:3}}>{lvlInfo.xpInLevel} / {lvlInfo.xpNeeded} XP pour le niveau {lvlInfo.level+1}</div>
            </div>
            <div style={{textAlign:"center",background:"rgba(255,255,255,0.07)",borderRadius:10,padding:"10px 14px"}}>
              <div style={{fontSize:26,marginBottom:2}}>{streak>0?"🔥":"💤"}</div>
              <div style={{fontSize:12,fontWeight:700,color:"#A5D6A7"}}>{streak} jour{streak>1?"s":""}</div>
              <div style={{fontSize:9,color:"rgba(200,230,201,0.4)"}}>streak</div>
            </div>
          </div>
          <div style={{height:8,background:"rgba(255,255,255,0.1)",borderRadius:100,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${lvlInfo.pct}%`,background:"linear-gradient(90deg,#81C784,#4CAF50)",borderRadius:100,transition:"width .6s ease"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
            <span style={{fontSize:9,color:"rgba(200,230,201,0.35)"}}>Niv. {lvlInfo.level}</span>
            <span style={{fontSize:9,color:"rgba(200,230,201,0.35)"}}>Niv. {lvlInfo.level+1}</span>
          </div>
          <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.07)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:11,color:"rgba(200,230,201,0.55)"}}>Missions de la semaine</span>
              <span style={{fontSize:11,fontWeight:700,color:"#A5D6A7"}}>{missions.filter(m=>m.done).length}/{missions.length}</span>
            </div>
            <div style={{height:5,background:"rgba(255,255,255,0.08)",borderRadius:100,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pctMissions}%`,background:"#A5D6A7",borderRadius:100,transition:"width .5s ease"}}/>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div style={{padding:"0 20px 14px",display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
        {tabBtn("home","🏠 Vue d'ensemble")}
        {tabBtn("faq","❓ FAQ")}
        {tabBtn("quiz","🧠 Quiz")}
        {tabBtn("learn","📚 Fiches")}
        {tabBtn("badges","🏆 Badges")}
        {tabBtn("sim","🎮 Simulation")}
      </div>

      {/* ── Home ── */}
      {tab==="home"&&<div style={{padding:"0 20px"}}>
        <p style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:10}}>Missions de la semaine</p>
        {missions.map(m=>(
          <div key={m.id} style={{background:T.surface,border:`1px solid ${m.done?T.emerald+"40":T.border}`,borderRadius:13,padding:"13px 15px",marginBottom:8,display:"flex",gap:12,alignItems:"center"}}>
            <div style={{width:36,height:36,borderRadius:10,background:m.done?T.greenBg:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
              {m.type==="analysis"?"🔍":m.type==="learn"?"📚":m.type==="quiz"?"🧠":m.type==="watchlist"?"🔖":"🔥"}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:m.done?T.emerald:T.text,marginBottom:4}}>{m.label}</div>
              <div style={{height:4,background:T.surface2,borderRadius:100,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(m.progress/m.target)*100}%`,background:m.done?T.emerald:T.amber,borderRadius:100}}/>
              </div>
              <div style={{fontSize:10,color:T.textMuted,marginTop:3}}>{m.progress}/{m.target} · +{m.xpReward} XP</div>
            </div>
            {m.done&&<span style={{fontSize:18}}>✅</span>}
          </div>
        ))}
        <p style={{fontSize:13,fontWeight:700,color:T.text,marginTop:18,marginBottom:10}}>Badges débloqués</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {BADGES.filter(b=>badges.includes(b.id)).map(b=>(
            <div key={b.id} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"9px 12px",display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:18}}>{b.icon}</span>
              <div><div style={{fontSize:11,fontWeight:700,color:T.text}}>{b.name}</div><div style={{fontSize:9,color:T.textMuted}}>+{b.xp} XP</div></div>
            </div>
          ))}
          {badges.length===0&&<p style={{fontSize:12,color:T.textMuted,fontStyle:"italic"}}>Aucun badge encore — commencez à explorer !</p>}
        </div>
        {notifications.length>0&&<>
          <p style={{fontSize:13,fontWeight:700,color:T.text,marginTop:18,marginBottom:10}}>Activité récente</p>
          {notifications.slice().reverse().slice(0,6).map(n=>(
            <div key={n.id} onClick={()=>gStore.readNotif(n.id)} style={{background:n.read?T.surface:T.greenBg,border:`1px solid ${n.read?T.border:T.emerald+"30"}`,borderRadius:10,padding:"10px 13px",marginBottom:7,cursor:"pointer"}}>
              <span style={{fontSize:12,color:n.read?T.textSub:T.emerald,fontWeight:n.read?400:600}}>{n.msg}</span>
            </div>
          ))}
        </>}
      </div>}

      {/* ── FAQ ── */}
      {tab==="faq"&&<div style={{padding:"0 20px"}}>
        <p style={{fontSize:12,color:T.textMuted,marginBottom:14,lineHeight:1.6}}>Consultez une fiche pour gagner +10 XP.</p>
        {FAQ.map((item,i)=>(
          <div key={i} style={{background:T.surface,border:`1px solid ${openFaq===i?T.emerald+"40":T.border}`,borderRadius:13,marginBottom:8,overflow:"hidden"}}>
            <button onClick={()=>{setOpenFaq(openFaq===i?null:i);if(openFaq!==i)gStore.trackLearn();}} style={{width:"100%",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
              <span style={{fontSize:13,fontWeight:700,color:T.text,paddingRight:12,flex:1}}>{item.q}</span>
              <span style={{fontSize:11,color:T.textMuted,flexShrink:0}}>{openFaq===i?"▲":"▼"}</span>
            </button>
            {openFaq===i&&<div style={{padding:"0 16px 16px"}}>
              <div style={{height:1,background:T.border,marginBottom:12}}/>
              <p style={{fontSize:13,color:T.textSub,lineHeight:1.75,whiteSpace:"pre-line"}}>{item.a}</p>
              <div style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:5,background:T.greenBg,borderRadius:8,padding:"3px 9px"}}>
                <span style={{fontSize:10,color:T.emerald,fontWeight:700}}>+10 XP gagné ✓</span>
              </div>
            </div>}
          </div>
        ))}
      </div>}

      {/* ── Quiz ── */}
      {tab==="quiz"&&<div style={{padding:"0 20px"}}>
        {quizDone?(
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{fontSize:52,marginBottom:14}}>🎉</div>
            <h2 style={{fontSize:20,fontWeight:800,color:T.text,marginBottom:8}}>Quiz terminé !</h2>
            <p style={{fontSize:13,color:T.textSub,marginBottom:20,lineHeight:1.6}}>Vous avez répondu à tous les quiz.<br/>Revenez demain pour de nouveaux défis.</p>
            <button onClick={()=>{setQuizDone(false);setQuizIdx(0);setQuizAns(null);}} style={{height:44,padding:"0 24px",background:T.forest,border:"none",borderRadius:12,color:"#E8F0EB",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Recommencer</button>
          </div>
        ):(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:12,color:T.textMuted}}>Question {quizIdx+1} / {QUIZZES.length}</span>
              <span style={{fontSize:11,fontWeight:700,color:T.amber,background:T.amberBg,padding:"3px 9px",borderRadius:100}}>+{QUIZZES[quizIdx].xp} XP</span>
            </div>
            <div style={{height:4,background:T.surface2,borderRadius:100,marginBottom:18,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${(quizIdx/QUIZZES.length)*100}%`,background:T.emerald,borderRadius:100,transition:"width .4s ease"}}/>
            </div>
            <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:20,marginBottom:14}}>
              <p style={{fontSize:15,fontWeight:700,color:T.text,lineHeight:1.5}}>{QUIZZES[quizIdx].q}</p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {QUIZZES[quizIdx].choices.map((c,i)=>{
                let bg=T.surface,border=`1px solid ${T.border}`,color=T.text,weight:number=500;
                if(quizAns!==null){
                  if(i===QUIZZES[quizIdx].correct){bg=T.greenBg;border=`2px solid ${T.emerald}60`;color=T.emerald;weight=700;}
                  else if(i===quizAns){bg=T.redBg;border=`2px solid #A32D2D60`;color="#A32D2D";}
                }
                return(
                  <button key={i} onClick={()=>handleQuizAnswer(i)} disabled={quizAns!==null}
                    style={{padding:"13px 16px",background:bg,border,borderRadius:12,textAlign:"left",cursor:quizAns!==null?"default":"pointer",fontFamily:"inherit",color,fontSize:13,fontWeight:weight,transition:"all .2s",display:"flex",gap:10,alignItems:"center"}}>
                    <span style={{width:22,height:22,borderRadius:6,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,flexShrink:0}}>{["A","B","C","D"][i]}</span>
                    {c}
                  </button>
                );
              })}
            </div>
            {quizAns!==null&&(
              <div style={{marginTop:14,padding:"12px 14px",background:quizAns===QUIZZES[quizIdx].correct?T.greenBg:T.redBg,borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                <span style={{fontSize:13,fontWeight:700,color:quizAns===QUIZZES[quizIdx].correct?T.emerald:T.red,flex:1}}>
                  {quizAns===QUIZZES[quizIdx].correct?`Bonne réponse ! +${QUIZZES[quizIdx].xp} XP ✓`:`Mauvaise — bonne réponse : ${QUIZZES[quizIdx].choices[QUIZZES[quizIdx].correct]}`}
                </span>
                <button onClick={nextQuiz} style={{height:34,padding:"0 14px",background:T.forest,border:"none",borderRadius:9,color:"#E8F0EB",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                  {quizIdx<QUIZZES.length-1?"Suivant →":"Terminer"}
                </button>
              </div>
            )}
          </>
        )}
      </div>}

      {/* ── Fiches ── */}
      {tab==="learn"&&<div style={{padding:"0 20px"}}>
        <p style={{fontSize:12,color:T.textMuted,marginBottom:14}}>Chaque fiche vous rapporte +10 XP</p>
        {LEARN_CARDS.map((card,i)=>{
          const isRead=readCards.has(i);
          return(
            <div key={i} style={{background:T.surface,border:`1px solid ${isRead?T.emerald+"30":T.border}`,borderRadius:14,padding:16,marginBottom:10}}>
              <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{width:40,height:40,borderRadius:11,background:T.greenBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{card.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:2}}>{card.title}</div>
                      <span style={{fontSize:10,background:T.surface2,color:T.textMuted,padding:"2px 7px",borderRadius:6}}>{card.cat}</span>
                    </div>
                    <button onClick={()=>handleLearn(i)} style={{height:28,padding:"0 12px",background:isRead?T.greenBg:T.forest,border:"none",borderRadius:8,color:isRead?T.emerald:"#E8F0EB",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0,marginLeft:8}}>
                      {isRead?"Lu ✓":"Lire"}
                    </button>
                  </div>
                </div>
              </div>
              {isRead&&<p style={{fontSize:12,color:T.textSub,lineHeight:1.75,marginTop:12}}>{card.content}</p>}
              {isRead&&<div style={{marginTop:8,display:"inline-flex",alignItems:"center",gap:5,background:T.greenBg,borderRadius:7,padding:"3px 9px"}}><span style={{fontSize:10,color:T.emerald,fontWeight:700}}>+10 XP ✓</span></div>}
            </div>
          );
        })}
      </div>}

      {/* ── Badges ── */}
      {tab==="badges"&&<div style={{padding:"0 20px"}}>
        <p style={{fontSize:12,color:T.textMuted,marginBottom:14}}>{badges.length}/{BADGES.length} badges débloqués</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {BADGES.map(b=>{
            const unlocked=badges.includes(b.id);
            return(
              <div key={b.id} style={{background:unlocked?T.surface:T.surface2,border:`1px solid ${unlocked?T.emerald+"30":T.border}`,borderRadius:14,padding:14,opacity:unlocked?1:.55}}>
                <div style={{fontSize:26,marginBottom:8,filter:unlocked?"none":"grayscale(1)"}}>{b.icon}</div>
                <div style={{fontSize:12,fontWeight:700,color:unlocked?T.text:T.textMuted,marginBottom:3}}>{b.name}</div>
                <div style={{fontSize:10,color:T.textMuted,marginBottom:7,lineHeight:1.5}}>{b.desc}</div>
                <div style={{display:"inline-flex",alignItems:"center",gap:4,background:unlocked?T.greenBg:T.surface3,borderRadius:6,padding:"2px 7px"}}>
                  <span style={{fontSize:10,fontWeight:700,color:unlocked?T.emerald:T.textMuted}}>+{b.xp} XP {unlocked?"✓":""}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>}

      {/* ── Simulation ── */}
      {tab==="sim"&&<div style={{padding:"0 20px"}}>
        <div style={{background:T.greenBg,border:`1px solid ${T.emerald}20`,borderRadius:14,padding:16,marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:4}}>Portefeuille fictif</div>
          <div style={{fontSize:11,color:T.textSub,lineHeight:1.65}}>Simulez un portefeuille sans argent réel. Observez comment le score de conformité évolue selon vos choix. Aucun argent réel impliqué, aucun conseil financier.</div>
        </div>
        {gStore.simPortfolio.length>0&&(()=>{
          const avg=Math.round(gStore.simPortfolio.reduce((s,x)=>s+x.score,0)/gStore.simPortfolio.length);
          const color=avg>=75?T.emerald:avg>=40?T.amber:T.red;
          const label=avg>=75?"Conforme ✓":avg>=40?"À surveiller":"Non conforme";
          return(
            <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:16,marginBottom:14}}>
              <div style={{fontSize:10,color:T.textMuted,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Score moyen du portefeuille fictif</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:28,fontWeight:800,color}}>{avg}</span>
                <span style={{background:avg>=75?T.greenBg:avg>=40?T.amberBg:T.redBg,color,fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:100}}>{label}</span>
              </div>
              <div style={{height:8,background:T.surface2,borderRadius:100,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${avg}%`,background:color,borderRadius:100,transition:"width .6s ease"}}/>
              </div>
            </div>
          );
        })()}
        {gStore.simPortfolio.map(s=>{
          const color=s.score>=75?T.emerald:s.score>=40?T.amber:T.red;
          return(
            <div key={s.ticker} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <div style={{width:32,height:32,borderRadius:8,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:T.textSub}}>{s.ticker.slice(0,2)}</div>
                <div><div style={{fontSize:13,fontWeight:700,color:T.text}}>{s.ticker}</div><div style={{fontSize:10,color:T.textMuted}}>{s.name}</div></div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:14,fontWeight:800,color}}>{s.score}</span>
                <button onClick={()=>gStore.removeSimStock(s.ticker)} style={{width:24,height:24,borderRadius:6,background:T.redBg,border:"none",cursor:"pointer",fontSize:10,color:T.red,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>
            </div>
          );
        })}
        {gStore.simPortfolio.length===0&&(
          <div style={{textAlign:"center",padding:"32px 0",color:T.textMuted,background:T.surface,borderRadius:14,border:`1px solid ${T.border}`}}>
            <p style={{fontSize:24,marginBottom:8}}>🎮</p>
            <p style={{fontSize:13,fontWeight:700,color:T.textSub}}>Portefeuille fictif vide</p>
            <p style={{fontSize:11,marginTop:4}}>Analysez une action et ajoutez-la via le bouton "Simuler"</p>
          </div>
        )}
      </div>}
    </div>
  );
}
LEARNEOF

echo "✅ Stores et composants créés"

# ── Patch App.tsx — ajout des imports et du nouvel onglet ─────────
node << 'NODEOF'
const fs = require("fs");
let src = fs.readFileSync("src/components/App.tsx", "utf8");

// 1. Imports
if (!src.includes("useGamificationStore")) {
  src = src.replace(
    `"use client";`,
    `"use client";\nimport { useGamificationStore, computeLevel } from "@/store/useGamificationStore";\nimport LearnScreen from "@/components/LearnScreen";\nimport { InfoTooltip } from "@/components/ScoreTooltip";`
  );
}

// 2. Remplacer l'onglet watchlist dans TABS par "learn"
src = src.replace(
  `{id:"watchlist",label:"Watchlist",`,
  `{id:"learn",label:"Apprendre",`
);

// 3. Ajouter le rendu de l'onglet learn
if (!src.includes("tab===\"learn\"")) {
  src = src.replace(
    `{tab==="watchlist" &&<WatchlistScreen/>}`,
    `{tab==="watchlist" &&<WatchlistScreen/>}\n              {tab==="learn"      &&<LearnScreen/>}`
  );
}

// 4. Ajouter track dans doSearch du ScreeningScreen
// Cherche la définition de doSearch dans ScreeningScreen
src = src.replace(
  `const doSearch=(t:string)=>{if(!isPremium&&screenings>=FREEMIUM.SCREENINGS){setShowUp(true);return;}inc();setTicker(t);setQ(t);};`,
  `const gStore=useGamificationStore();\n  const doSearch=(t:string)=>{if(!isPremium&&screenings>=FREEMIUM.SCREENINGS){setShowUp(true);return;}inc();gStore.trackAnalysis();gStore.checkStreak();setTicker(t);setQ(t);};`
);

// 5. Ajouter InfoTooltip sur les score cards dans PortfolioScreen
// Modifier la structure pour inclure le tip
src = src.replace(
  `{l:"Score",v:m.conform,c:T.green,s:m.conform>=75?"Conforme":"Douteux"},`,
  `{l:"Score",v:m.conform,c:T.green,s:m.conform>=75?"Conforme":"Douteux",tip:"score"},`
);
src = src.replace(
  `{l:"Durabilité",v:m.esg,c:T.leaf,s:""},`,
  `{l:"Durabilité",v:m.esg,c:T.leaf,s:"",tip:"esg"},`
);
src = src.replace(
  `{l:"Diversif.",v:m.divers,c:T.amber,s:""},`,
  `{l:"Diversif.",v:m.divers,c:T.amber,s:"",tip:"divers"},`
);
src = src.replace(
  `{l:"Sécurité",v:m.risk,c:m.risk>=70?T.green:T.amber,s:""}`,
  `{l:"Sécurité",v:m.risk,c:m.risk>=70?T.green:T.amber,s:"",tip:"risque"}`
);

// 6. Remplacer le label dans les score cards pour inclure InfoTooltip
src = src.replace(
  `<p style={{fontSize:9,color:T.textMuted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.l}</p>`,
  `<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}><p style={{fontSize:9,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.l}</p>{(s as any).tip&&<InfoTooltip id={(s as any).tip}/>}</div>`
);

// 7. Ajouter trackWatchlist sur le toggle watchlist
// On cherche le pattern sans interpolation shell
const wlOld = src.indexOf("{wlToggle(asset);toast(isWatched?`Retiré`:`");
if (wlOld !== -1) {
  const wlEnd = src.indexOf("}}", wlOld) + 2;
  const oldChunk = src.slice(wlOld, wlEnd);
  const newChunk = oldChunk
    .replace("{wlToggle(asset);", "{const wasWl=isWatched;wlToggle(asset);if(!wasWl){useGamificationStore.getState().trackWatchlist();}")
    .replace("isWatched?`Retiré`:", "wasWl?`Retiré`:");
  src = src.slice(0, wlOld) + newChunk + src.slice(wlEnd);
}

// 8. Icône Apprendre dans TABS — remplacer l'icône watchlist
src = src.replace(
  `{id:"learn",label:"Apprendre",\n    icon:(active:boolean)=>(`,
  `{id:"learn",label:"Apprendre",\n    icon:(active:boolean)=>(`
);

// Fix icône watchlist remplacée par learn
src = src.replace(
  `{id:"learn",label:"Apprendre",
    icon:(active:boolean)=>(
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M5 3H15C15.5523 3 16 3.44772 16 4V18L10 15L4 18V4C4 3.44772 4.44772 3 5 3Z" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={active?T.greenBg:"none"}/>
      </svg>
    )},`,
  `{id:"learn",label:"Apprendre",
    icon:(active:boolean)=>(
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 5H17M3 10H17M3 15H11" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="15" cy="15" r="3" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5"/>
        <path d="M15 13.5V15L16 16" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )},`
);

fs.writeFileSync("src/components/App.tsx", src);
console.log("App.tsx patché avec succès");
NODEOF

echo ""
echo "✅ PUR v4 — Gamification complète !"
echo ""
echo "Fonctionnalités gamification :"
echo "  ✓ XP & niveaux (courbe progressive)"
echo "  ✓ Streak quotidien"
echo "  ✓ 16 badges débloquables"
echo "  ✓ 5 missions hebdomadaires auto-générées"
echo "  ✓ 12 questions FAQ contextuelles"
echo "  ✓ 10 quiz avec feedback XP immédiat"
echo "  ✓ 6 fiches éducatives"
echo "  ✓ Portefeuille fictif de simulation"
echo "  ✓ Notifications in-app XP/badges"
echo "  ✓ Tooltips ℹ sur Score, ESG, Diversif., Sécurité"
echo "  ✓ Onglet 'Apprendre' dans la navbar (remplace Watchlist)"
echo "     (Watchlist reste accessible dans Portfolio)"
echo ""
echo "Pour déployer : git add . && git commit -m 'PUR v4 — gamification' && git push"
echo ""
