"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useUserStore, useWatchlistStore } from "@/store/usePortfolioStore";
import { auth } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { usePortfolios } from "@/hooks/usePortfolios";
import { portfolioDB } from "@/lib/db";
import type { PortfolioItem } from "@/domain/types";
import { T, EUR_USD, CurrCtx } from "@/components/ui/tokens";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { StockCard } from "@/components/app/StockCard";
import { HomeScreen } from "@/components/app/HomeScreen";
import { ScreeningScreen } from "@/components/app/ScreeningScreen";
import { PortfolioScreen } from "@/components/app/PortfolioScreen";
import { WatchlistScreen } from "@/components/app/WatchlistScreen";
import { ProfileScreen } from "@/components/app/ProfileScreen";
import { MethodologyScreen } from "@/components/app/MethodologyScreen";
import LearnScreen from "@/components/LearnScreen";

// ── Navigation tabs ───────────────────────────────────────────────
const TABS=[
  {id:"home",label:"Accueil",
    icon:(active:boolean)=>(
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 9.5L10 3L17 9.5V17H13V13H7V17H3V9.5Z" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={active?T.greenBg:"none"}/>
      </svg>
    )},
  {id:"screen",label:"Analyser",
    icon:(active:boolean)=>(
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="9" cy="9" r="5.5" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5"/>
        <path d="M13.5 13.5L17 17" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7 9L8.5 10.5L11.5 7.5" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )},
  {id:"portfolio",label:"Portfolios",
    icon:(active:boolean)=>(
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="10" width="3.5" height="7" rx="1" fill={active?T.forest:"#A8A49C"}/>
        <rect x="8.25" y="7" width="3.5" height="10" rx="1" fill={active?T.forest:"#A8A49C"} opacity={active?1:.7}/>
        <rect x="13.5" y="4" width="3.5" height="13" rx="1" fill={active?T.forest:"#A8A49C"} opacity={active?1:.5}/>
      </svg>
    )},
  {id:"learn",label:"Apprendre",
    icon:(active:boolean)=>(
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 5H17M3 10H17M3 15H11" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="15" cy="15" r="3" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5"/>
        <path d="M15 13.5V15L16 16" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )},
  {id:"profile",label:"Profil",
    icon:(active:boolean)=>(
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3.5" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5"/>
        <path d="M3 17C3 14.2386 6.13401 12 10 12C13.866 12 17 14.2386 17 17" stroke={active?T.forest:"#A8A49C"} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
];

// ── Checkout redirect toast (must live inside ToastProvider) ─────
function CheckoutToast(){
  const toast=useToast();
  useEffect(()=>{
    if(typeof window==="undefined")return;
    const p=new URLSearchParams(window.location.search);
    const status=p.get("checkout");
    if(!status)return;
    if(status==="success") toast("Bienvenue Premium ! Votre abonnement est actif.","success");
    if(status==="cancelled") toast("Paiement annulé — vous pouvez réessayer quand vous voulez.","info");
  },[toast]);
  return null;
}

// ── App Root ──────────────────────────────────────────────────────
export default function App(){
  const[phase,setPhase]=useState<"splash"|"app">("splash");
  const[splashOut,setSplashOut]=useState(false);
  const[tab,setTab]=useState("home");
  const[reportTicker,setReportTicker]=useState<string|null>(null);
  const pfCtx=usePortfolios();

  useAuth();
  const handleSignOut=useCallback(()=>{
    useUserStore.getState().reset();
    useWatchlistStore.getState().clear();
    pfCtx.syncFromDB([]);
    setTab("home");
    auth.signOut().catch(()=>{});
  },[pfCtx]);

  const userId=useUserStore(s=>s.id);
  const setIsPremium=useUserStore(s=>s.setIsPremium);

  useEffect(()=>{
    if(userId==="guest")return;
    auth.getSession().then(session=>{
      if(!session)return;
      fetch("/api/subscription/validate",{headers:{Authorization:`Bearer ${session.access_token}`}})
        .then(r=>r.ok?r.json():null)
        .then(d=>{if(d?.isPremium!==undefined)setIsPremium(d.isPremium);})
        .catch(()=>{});
    });
  },[userId,setIsPremium]);

  useEffect(()=>{
    if(userId==="guest"){pfCtx.syncFromDB([]);return;}
    portfolioDB.list(userId).then(rows=>{
      if(!rows.length)return;
      const holdings=rows.map(r=>({
        ticker:r.ticker,name:r.ticker,type:"stock" as const,
        qty:r.qty,paidPrice:r.paid_price,_id:r.id,
        price:0,change:0,score:0,esgScore:70,status:"halal" as const,
        ratioDebt:0,ratioRevHaram:0,ratioCash:0,
        divYield:0,divAnnual:0,divHaramPct:0,beta:1,
        sector:"N/A",country:"🌍",mktCap:"N/A",
        volatility:"Modérée" as const,scoreHistory:[],
        periods:{"1D":[],"1S":[],"1M":[],"1A":[]},
        opportunities:false,newlyHalal:false,whyHalal:[],
      })) as PortfolioItem[];
      pfCtx.syncFromDB(holdings);
    }).catch(()=>{});
  },[userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{
    const t1=setTimeout(()=>setSplashOut(true),1600);
    const t2=setTimeout(()=>setPhase("app"),1950);
    return()=>{clearTimeout(t1);clearTimeout(t2);};
  },[]);

  const openReport=useCallback((t:string)=>setReportTicker(t),[]);
  const closeReport=useCallback(()=>setReportTicker(null),[]);

  // Handle Stripe redirect back to /app?checkout=success|cancelled
  useEffect(()=>{
    if(typeof window==="undefined")return;
    const p=new URLSearchParams(window.location.search);
    const status=p.get("checkout");
    if(!status)return;
    // Strip the param from the URL without a reload
    const clean=window.location.pathname;
    window.history.replaceState({},"",clean);
    // Delay until ToastProvider is mounted (after splash)
    if(status==="success"){
      setTimeout(()=>{
        // Refresh premium status
        auth.getSession().then(session=>{
          if(!session)return;
          fetch("/api/subscription/validate",{headers:{Authorization:`Bearer ${session.access_token}`}})
            .then(r=>r.ok?r.json():null)
            .then(d=>{if(d?.isPremium!==undefined)setIsPremium(d.isPremium);})
            .catch(()=>{});
        });
      },2500);
    }
  },[setIsPremium]);

  const[cur,setCurState]=useState<"USD"|"EUR">(()=>{try{return(localStorage.getItem("pur_currency") as "USD"|"EUR")||"USD";}catch{return "USD";}});
  const setCur=useCallback((c:"USD"|"EUR")=>{setCurState(c);try{localStorage.setItem("pur_currency",c);}catch{};},[]);
  const fmtP=useCallback((v:number)=>cur==="EUR"?`${(v*EUR_USD).toFixed(2)}€`:`${v.toFixed(2)}$`,[cur]);
  const currValue=useMemo(()=>({cur,setCur,fmtP,sym:cur==="EUR"?"€":"$",rate:cur==="EUR"?EUR_USD:1}),[cur,setCur,fmtP]);

  return(
    <CurrCtx.Provider value={currValue}>
    <ToastProvider>
      <CheckoutToast/>
      <div style={{minHeight:"100vh",background:T.bg,display:"flex",justifyContent:"center"}}>
        <div style={{width:"100%",maxWidth:430,minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>

          {phase==="splash"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:28,animation:splashOut?"fadeOut .35s ease forwards":"none"}}>
              <div style={{animation:"fadeUp .5s ease forwards",opacity:0,textAlign:"center"}}>
                <div style={{width:100,height:100,borderRadius:30,background:T.forest,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",boxShadow:"0 24px 64px rgba(26,58,42,0.22)"}}>
                  <svg width="58" height="58" viewBox="0 0 24 24" fill="none">
                    <path d="M6 20V5C6 5 6 3 8 3C10 3 12 3 12 6C12 9 9 9 9 9" stroke="#C8E6C9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 9C9 9 10.5 11.5 12 12" stroke="#C8E6C9" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M12 12L18 6" stroke="#C8E6C9" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M14.5 6H18V9.5" stroke="#C8E6C9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:40,fontWeight:800,color:T.text,letterSpacing:"-1.5px",lineHeight:1,marginBottom:8}}>PUR</div>
                <div style={{fontSize:14,color:T.textSub,letterSpacing:"0.02em",lineHeight:1}}>The new way to invest</div>
              </div>
              <div style={{display:"flex",gap:7,animation:"fadeUp .5s .3s ease forwards",opacity:0}}>
                {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:2.5,background:T.emerald,animation:`blink 1.2s ${i*.2}s ease-in-out infinite alternate`}}/>)}
              </div>
            </div>
          )}

          {phase==="app"&&<>
            {reportTicker&&(
              <div style={{position:"fixed",inset:0,background:T.bg,zIndex:200,display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto",overflowY:"auto"}}>
                <div style={{padding:"52px 20px 20px"}}>
                  <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16}}>
                    <button onClick={closeReport} style={{width:38,height:38,borderRadius:11,background:"#FFFFFF",border:`1px solid rgba(0,0,0,0.07)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,cursor:"pointer",color:T.text}}>←</button>
                    <div><h1 style={{fontSize:18,fontWeight:800,color:T.text}}>{reportTicker}</h1><p style={{fontSize:11,color:T.textMuted}}>Rapport de conformité</p></div>
                  </div>
                  <StockCard ticker={reportTicker} onReport={()=>{}} pfCtx={pfCtx}/>
                </div>
              </div>
            )}
            {!reportTicker&&<>
              {tab==="home"        &&<HomeScreen      setTab={setTab} openReport={openReport}/>}
              {tab==="screen"      &&<ScreeningScreen openReport={openReport}/>}
              {tab==="portfolio"   &&<PortfolioScreen setTab={setTab}/>}
              {tab==="watchlist"   &&<WatchlistScreen/>}
              {tab==="learn"       &&<LearnScreen/>}
              {tab==="profile"     &&<ProfileScreen setTab={setTab} onSignOut={handleSignOut}/>}
              {tab==="methodology" &&<MethodologyScreen onBack={()=>setTab("profile")}/>}

              <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#FFFFFF",borderTop:`1px solid rgba(0,0,0,0.07)`,display:"flex",padding:"8px 0 24px",zIndex:100}}>
                {TABS.map(t=>(
                  <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"5px 0",fontFamily:"inherit"}}>
                    {t.icon(tab===t.id)}
                    <span style={{fontSize:9,fontWeight:tab===t.id?700:400,color:tab===t.id?T.forest:T.textMuted,letterSpacing:"0.02em"}}>{t.label}</span>
                    {tab===t.id&&<div style={{width:14,height:2,borderRadius:1,background:T.forest}}/>}
                  </button>
                ))}
              </nav>
            </>}
          </>}
        </div>
      </div>
    </ToastProvider>
    </CurrCtx.Provider>
  );
}
