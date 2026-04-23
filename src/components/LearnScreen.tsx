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

const GLOSSARY=[
  {term:"FCF",full:"Free Cash Flow",cat:"Fondamentaux",def:"Flux de trésorerie libre : ce qui reste à l'entreprise après avoir payé ses dépenses d'exploitation et ses investissements. Représente l'argent réellement disponible pour rembourser les dettes, verser des dividendes ou racheter des actions. Un FCF positif et croissant est un très bon signe."},
  {term:"BPA / EPS",full:"Bénéfice Par Action",cat:"Fondamentaux",def:"Le BPA (ou EPS en anglais) mesure la part des bénéfices qui revient à chaque action. Calculé en divisant le bénéfice net total par le nombre d'actions. Un BPA en hausse d'une année sur l'autre est généralement positif pour le cours de l'action."},
  {term:"P/E",full:"Price-to-Earnings",cat:"Valorisation",def:"Rapport cours/bénéfice. Si une action vaut 100€ et que l'entreprise gagne 5€ par action, le P/E est de 20. Plus il est élevé, plus les investisseurs paient cher pour chaque euro de bénéfice. Un P/E élevé peut signifier qu'on anticipe une forte croissance, ou que l'action est surévaluée."},
  {term:"P/B",full:"Price-to-Book",cat:"Valorisation",def:"Rapport cours/valeur comptable. Compare le prix de l'action à la valeur des actifs nets de l'entreprise. Un P/B inférieur à 1 signifie qu'on achète l'entreprise sous sa valeur d'actif, ce qui peut être une opportunité."},
  {term:"EV/EBITDA",full:"Enterprise Value / EBITDA",cat:"Valorisation",def:"Multiple qui compare la valeur totale d'une entreprise (dette incluse) à ses bénéfices avant intérêts, impôts, amortissements. Permet de comparer des entreprises avec des structures de capital différentes. Plus bas = potentiellement moins cher que les concurrents."},
  {term:"DCF",full:"Discounted Cash Flow",cat:"Valorisation",def:"Méthode d'évaluation qui calcule la valeur actuelle de tous les flux de trésorerie futurs attendus. En résumé : combien vaut aujourd'hui l'argent que l'entreprise va générer dans les prochaines années ? Si la valeur DCF est supérieure au cours actuel, l'action peut être sous-évaluée."},
  {term:"WACC",full:"Weighted Average Cost of Capital",cat:"Valorisation",def:"Coût moyen pondéré du capital. Taux qui représente ce que coûte le financement de l'entreprise (dette + capitaux propres). Utilisé comme taux d'actualisation dans le modèle DCF. Un WACC de 10% signifie qu'on actualise les flux futurs à 10% par an."},
  {term:"Marge de sécurité",full:"Margin of Safety",cat:"Valorisation",def:"Différence entre la valeur intrinsèque estimée d'une action et son cours actuel. Popularisé par Benjamin Graham. Une marge de sécurité de 30% signifie qu'on paie 30% moins cher que ce que l'entreprise vaut selon notre modèle — une protection contre nos propres erreurs d'estimation."},
  {term:"TWR",full:"Time-Weighted Return",cat:"Performance",def:"Rendement pondéré dans le temps. Mesure la performance réelle d'un portefeuille en neutralisant l'impact des dépôts et retraits. C'est la meilleure façon de comparer la performance d'un gestionnaire ou d'une stratégie, indépendamment des mouvements de liquidités."},
  {term:"EBITDA",full:"Earnings Before Interest, Taxes, Depreciation & Amortization",cat:"Fondamentaux",def:"Résultat opérationnel avant intérêts, impôts, dépréciation et amortissement. Donne une vision de la rentabilité opérationnelle brute d'une entreprise, sans tenir compte de sa structure de financement ou de ses choix comptables d'amortissement."},
  {term:"ROE",full:"Return on Equity",cat:"Fondamentaux",def:"Rendement des capitaux propres. Mesure l'efficacité d'une entreprise à générer des bénéfices avec les fonds de ses actionnaires. Un ROE de 20% signifie que pour 100€ investis par les actionnaires, l'entreprise génère 20€ de profit. Warren Buffett apprécie les entreprises avec un ROE stable et élevé."},
  {term:"Bêta (β)",full:"Mesure de volatilité relative",cat:"Risque",def:"Mesure la volatilité d'une action par rapport au marché global. Un bêta de 1 signifie que l'action suit le marché. Un bêta de 1.5 : l'action monte de 15% si le marché monte de 10%, mais chute de 15% si le marché baisse de 10%. Bêta < 1 : action moins volatile que le marché."},
  {term:"Div. Yield",full:"Rendement en dividende",cat:"Revenus",def:"Dividende annuel divisé par le cours de l'action, exprimé en %. Une action à 100€ versant 2€ de dividende a un rendement de 2%. Un rendement élevé peut être attractif, mais attention : il peut aussi signaler une action sous pression ou un dividende non durable."},
  {term:"Capitalisation",full:"Capitalisation boursière",cat:"Fondamentaux",def:"Valeur totale d'une entreprise en bourse = nombre d'actions × cours. Large cap (>10Md€), Mid cap (1-10Md€), Small cap (<1Md€). Les grandes capitalisations sont généralement plus stables ; les petites peuvent croître plus vite mais aussi baisser plus fort."},
  {term:"Purification",full:"Calcul de purification",cat:"AAOIFI",def:"Processus par lequel un investisseur donne en charité la part de ses dividendes provenant de revenus non conformes. Si 3% des revenus d'une entreprise viennent d'intérêts, 3% de vos dividendes reçus doivent être donnés. PUR calcule ce montant automatiquement."},
  {term:"Zakat",full:"Prélèvement annuel 2.5%",cat:"AAOIFI",def:"Obligation islamique de donner 2.5% de ses actifs éligibles dépassant le nisab (seuil minimal) après un an de détention. Pour les actions, la méthode simplifiée consiste à appliquer 2.5% à la valeur totale du portefeuille conforme. Consultez un érudit pour une décision précise à votre situation."},
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
  const{xp,streak,badges,missions}=gStore;
  const notifications:Array<{id:number;msg:string;read:boolean}>=Array.isArray(gStore.notifications)?gStore.notifications:[];
  const lvlInfo=computeLevel(xp);
  const[tab,setTab]=useState<"home"|"quiz"|"learn"|"glossary"|"badges"|"sim">("home");
  const[glossaryQ,setGlossaryQ]=useState("");
  const[glossaryCat,setGlossaryCat]=useState("Tous");
  const[quizIdx,setQuizIdx]=useState(0);
  const[quizAns,setQuizAns]=useState<number|null>(null);
  const[quizDone,setQuizDone]=useState(false);
  const[readCards,setReadCards]=useState<Set<number>>(new Set());
  const[mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);
  const unread=mounted?notifications.filter(n=>n&&!n.read).length:0;

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
        {tabBtn("quiz","🧠 Quiz")}
        {tabBtn("learn","📚 Fiches")}
        {tabBtn("glossary","📖 Glossaire")}
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
        {mounted&&notifications.length>0&&<>
          <p style={{fontSize:13,fontWeight:700,color:T.text,marginTop:18,marginBottom:10}}>Activité récente</p>
          {notifications.slice().reverse().slice(0,6).filter(n=>n&&n.id!=null).map((n,i)=>(
            <div key={String(n.id??i)} onClick={()=>gStore.readNotif(n.id)} style={{background:n.read?T.surface:T.greenBg,border:`1px solid ${n.read?T.border:"rgba(32,134,64,0.19)"}`,borderRadius:10,padding:"10px 13px",marginBottom:7,cursor:"pointer"}}>
              <span style={{fontSize:12,color:n.read?T.textSub:T.emerald,fontWeight:n.read?400:600}}>{String(n.msg??"")}</span>
            </div>
          ))}
        </>}
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

      {/* ── Glossaire ── */}
      {tab==="glossary"&&<div style={{padding:"0 20px"}}>
        <p style={{fontSize:12,color:T.textMuted,marginBottom:12}}>Toutes les abréviations et termes financiers expliqués simplement.</p>
        {/* Search */}
        <div style={{marginBottom:10}}>
          <input
            value={glossaryQ} onChange={e=>setGlossaryQ(e.target.value)}
            placeholder="Chercher un terme (FCF, BPA, DCF…)"
            style={{width:"100%",height:42,border:`1.5px solid ${T.border}`,borderRadius:11,padding:"0 14px",fontSize:13,outline:"none",background:T.surface,color:T.text,fontFamily:"inherit",boxSizing:"border-box"}}
          />
        </div>
        {/* Category filter */}
        <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:14,paddingBottom:2}}>
          {["Tous","Fondamentaux","Valorisation","Performance","Risque","Revenus","AAOIFI"].map(c=>(
            <button key={c} onClick={()=>setGlossaryCat(c)} style={{flexShrink:0,height:26,padding:"0 10px",background:glossaryCat===c?T.forest:T.surface2,color:glossaryCat===c?"#E8F0EB":T.textSub,border:"none",borderRadius:100,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{c}</button>
          ))}
        </div>
        {/* Entries */}
        {(() => {
          const entries=GLOSSARY.filter(g=>{
            const matchCat=glossaryCat==="Tous"||g.cat===glossaryCat;
            const matchQ=!glossaryQ||g.term.toLowerCase().includes(glossaryQ.toLowerCase())||g.full.toLowerCase().includes(glossaryQ.toLowerCase());
            return matchCat&&matchQ;
          });
          if(entries.length===0)return <p style={{fontSize:12,color:T.textMuted,textAlign:"center",padding:"24px 0"}}>Aucun terme trouvé</p>;
          return entries.map((g,i)=>(
            <div key={i} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:16,marginBottom:9}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div>
                  <span style={{fontSize:15,fontWeight:800,color:T.text,letterSpacing:"-.3px"}}>{g.term}</span>
                  <p style={{fontSize:11,color:T.emerald,fontWeight:600,marginTop:2}}>{g.full}</p>
                </div>
                <span style={{flexShrink:0,background:T.surface2,color:T.textMuted,fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:100,marginLeft:8}}>{g.cat}</span>
              </div>
              <p style={{fontSize:12,color:T.textSub,lineHeight:1.75}}>{g.def}</p>
            </div>
          ));
        })()}
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
