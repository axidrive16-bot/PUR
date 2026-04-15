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
