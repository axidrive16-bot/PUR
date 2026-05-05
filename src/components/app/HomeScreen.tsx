"use client";
import { useState, useMemo } from "react";
import { useUserStore } from "@/store/usePortfolioStore";
import { usePortfolios } from "@/hooks/usePortfolios";
import { T } from "@/components/ui/tokens";
import { PurLogo } from "@/components/ui/PurLogo";
import { Chart } from "@/components/ui/Chart";
import { UpgradeModal } from "./UpgradeModal";
import { MarketInsights } from "./MarketInsights";
import { MOCK_DATA } from "@/services/market/mock";
import { calcScore, scoreToStatus } from "@/domain/aaoifi";

// ── Sector → ticker mapping for personalized suggestions ─────────
const SECTOR_PICKS: Record<string, string[]> = {
  "Tech":                  ["AAPL","MSFT","GOOGL"],
  "Healthcare":            ["NOVO"],
  "Energy":                ["TTE"],
  "Luxury":                ["OR"],
  "Consumer Goods":        ["NKE"],
  "Industrials":           ["ASML"],
  "Artificial Intelligence":["NVDA","MSFT"],
  "Cybersecurity":         ["MSFT"],
  "Clean Energy":          ["TSLA"],
  "Dividend Stocks":       ["OR","NKE","TTE"],
  "ETFs":                  ["AAPL","MSFT"],
  "Commodities":           ["TTE"],
  "Real Estate":           ["OR","NKE"],
};

function getSuggested(sectors: string[]): string[] {
  if (!sectors.length) return ["AAPL","MSFT","NOVO","NKE"];
  const pool: string[] = [];
  sectors.forEach(s => (SECTOR_PICKS[s] ?? []).forEach(t => { if (!pool.includes(t)) pool.push(t); }));
  return pool.slice(0, 4).length ? pool.slice(0, 4) : ["AAPL","MSFT","NOVO","NKE"];
}

function SuggestionCard({ ticker, onReport }: { ticker: string; onReport: (t: string) => void }) {
  const d = MOCK_DATA[ticker];
  if (!d) return null;
  const score  = calcScore(d.ratioDebt, d.ratioRevHaram, d.ratioCash);
  const status = scoreToStatus(score);
  const cc = d.change >= 0 ? T.green : T.red;
  const statusColor = status === "halal" ? T.green : status === "douteux" ? T.amber : T.red;
  const statusBg    = status === "halal" ? T.greenBg : status === "douteux" ? T.amberBg : "#FCEBEB";
  const statusLabel = status === "halal" ? "Conforme" : status === "douteux" ? "À surveiller" : "Non conforme";

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 14px", minWidth: 185, flexShrink: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{ticker}</div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{d.sector}</div>
        </div>
        <span style={{ fontSize: 10, background: statusBg, color: statusColor, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>{statusLabel}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{d.price}$</div>
          <div style={{ fontSize: 11, color: cc, fontWeight: 700 }}>{d.change >= 0 ? "+" : ""}{d.change}%</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 20, fontWeight: 800, color: statusColor }}>{score}</div>
          <div style={{ fontSize: 9, color: T.textMuted, letterSpacing: "0.05em" }}>SCORE</div>
        </div>
      </div>
      <button onClick={() => onReport(ticker)} style={{ width: "100%", height: 32, background: T.greenBg, border: `1px solid ${T.mint}`, borderRadius: 8, fontSize: 12, fontWeight: 700, color: T.forest, cursor: "pointer", fontFamily: "inherit" }}>
        Analyser →
      </button>
    </div>
  );
}

export function HomeScreen({setTab,openReport}:{setTab:(t:string)=>void;openReport:(t:string)=>void}){
  const pfCtx = usePortfolios();
  const isPremium   = useUserStore(s=>s.isPremium);
  const preferences = useUserStore(s=>s.preferences);
  const [showUp,setShowUp] = useState(false);
  const m = pfCtx.metrics;

  const [homePeriod,setHomePeriod]=useState<"1J"|"1M"|"YTD"|"1A"|"5A">("1M");
  const pfPts=useMemo(()=>{
    const now=Date.now();
    const cfgMap:{[k:string]:{n:number;span:number;vol:number;tr:number}}={
      "1J":{n:24,span:86400000,vol:.004,tr:.005},
      "1M":{n:30,span:30*86400000,vol:.012,tr:.04},
      "YTD":{n:Math.max(7,Math.floor((Date.now()-new Date(new Date().getFullYear(),0,1).getTime())/86400000)),span:Date.now()-new Date(new Date().getFullYear(),0,1).getTime(),vol:.015,tr:.09},
      "1A":{n:52,span:365*86400000,vol:.018,tr:.15},
      "5A":{n:60,span:5*365*86400000,vol:.025,tr:.65},
    };
    const cfg=cfgMap[homePeriod];
    if(!m.value)return Array.from({length:cfg.n},(_,i)=>({t:now-cfg.span+(i/(cfg.n-1||1))*cfg.span,v:0}));
    let v=m.value*(1-cfg.tr);
    return Array.from({length:cfg.n},(_,i)=>{v*=(1+(Math.random()-.44)*cfg.vol+cfg.tr/cfg.n);return{t:now-cfg.span+(i/(cfg.n-1||1))*cfg.span,v:parseFloat(v.toFixed(2))};});
  },[m.value,homePeriod]);

  const suggested = useMemo(() => getSuggested(preferences?.sectors ?? []), [preferences]);
  const hasPrefs  = (preferences?.sectors?.length ?? 0) > 0;
  const subtitle  = hasPrefs
    ? `Basé sur votre intérêt pour ${preferences!.sectors.slice(0,2).join(", ")}.`
    : "Explorez des actifs populaires à analyser.";

  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease",background:T.bg}}>
      <header style={{padding:"52px 20px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <PurLogo size={32}/>
        <button onClick={()=>!isPremium&&setShowUp(true)} style={{height:32,padding:"0 12px",background:isPremium?T.forest:T.greenBg,border:`1px solid ${isPremium?T.forest:T.green}30`,borderRadius:100,cursor:isPremium?"default":"pointer",display:"flex",alignItems:"center",gap:5}}>
          <span style={{fontSize:11,fontWeight:700,color:isPremium?"#E8F0EB":T.green}}>{isPremium?"Premium actif":"Essai gratuit 14j"}</span>
        </button>
      </header>

      {/* Portfolio card */}
      <section style={{padding:"0 20px 14px"}}>
        <div style={{background:T.forest,borderRadius:20,padding:"18px 18px 10px 18px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <p style={{fontSize:10,color:"rgba(200,230,201,0.5)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:3}}>{pfCtx.active.name}</p>
              <p style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color:"#E8F0EB",lineHeight:1}}>{m.value.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}</p>
              <p style={{fontSize:12,color:"rgba(200,230,201,0.5)",fontWeight:700,marginTop:3}}>{m.value>0?`${m.gain>=0?"+":""}${m.gain.toFixed(0)}€ · ${m.gain>=0?"+":""}${m.gainPct.toFixed(2)}%`:"Ajoutez vos actions"}</p>
            </div>
            <div style={{textAlign:"center",background:"rgba(255,255,255,0.07)",borderRadius:10,padding:"8px 12px"}}>
              <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:22,fontWeight:800,color:m.conform>=75?"#A5D6A7":"#FFE082"}}>{m.conform}</div>
              <div style={{fontSize:8,color:"rgba(200,230,201,0.4)",letterSpacing:"0.06em",marginTop:1}}>SCORE</div>
              <div style={{fontSize:9,color:m.conform>=75?"#A5D6A7":"#FFE082",fontWeight:700,marginTop:1}}>{m.conform>=75?"Conforme ✓":"À surveiller"}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:4,marginBottom:6}}>
            {(["1J","1M","YTD","1A","5A"] as const).map(p=>(
              <button key={p} onClick={()=>setHomePeriod(p)} style={{flex:1,height:24,background:homePeriod===p?"rgba(255,255,255,0.2)":"transparent",border:homePeriod===p?"1px solid rgba(255,255,255,0.25)":"1px solid transparent",borderRadius:6,color:homePeriod===p?"#E8F0EB":"rgba(200,230,201,0.45)",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{p}</button>
            ))}
          </div>
          <Chart data={pfPts} color="#6FCF97" height={110} showYAxis={true} label="Valeur du portefeuille"/>
        </div>
      </section>

      {/* Quick actions */}
      <section style={{padding:"0 20px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button onClick={()=>setTab("screen")} style={{display:"flex",flexDirection:"column",gap:4,padding:"14px 14px",borderRadius:14,border:`1px solid ${T.green}22`,background:T.greenBg,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none"><circle cx="10" cy="10" r="6" stroke={T.forest} strokeWidth="2"/><path d="M15 15L19 19" stroke={T.forest} strokeWidth="2" strokeLinecap="round"/><path d="M8 10L9.5 11.5L12.5 8.5" stroke={T.forest} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>Analyser une action</span>
          <span style={{fontSize:11,color:T.textSub}}>Conformité AAOIFI</span>
        </button>
        <button onClick={()=>setTab("portfolio")} style={{display:"flex",flexDirection:"column",gap:4,padding:"14px 14px",borderRadius:14,border:`1px solid ${T.border}`,background:T.surface,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none"><rect x="3" y="12" width="4" height="9" rx="1" fill={T.forest}/><rect x="10" y="8" width="4" height="13" rx="1" fill={T.forest} opacity=".75"/><rect x="17" y="4" width="4" height="17" rx="1" fill={T.forest} opacity=".5"/></svg>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>Portefeuilles</span>
          <span style={{fontSize:11,color:T.textSub}}>{pfCtx.portfolios.length} portefeuille{pfCtx.portfolios.length>1?"s":""}</span>
        </button>
      </section>

      {/* AI Portfolio Builder card */}
      <section style={{padding:"0 20px 14px"}}>
        <button onClick={()=>setTab("portfolio-builder")} style={{width:"100%",background:T.forest,border:"none",borderRadius:18,padding:"18px 18px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",display:"flex",gap:14,alignItems:"center"}}>
          <div style={{width:44,height:44,borderRadius:13,background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:22}}>✦</div>
          <div style={{flex:1}}>
            <p style={{fontSize:14,fontWeight:800,color:"#E8F0EB",marginBottom:3}}>Construire un portfolio halal avec l'IA</p>
            <p style={{fontSize:12,color:"rgba(200,230,201,0.6)",lineHeight:1.5}}>Générez une proposition virtuelle basée sur vos secteurs, objectifs et profil de risque.</p>
          </div>
          <span style={{fontSize:18,color:"rgba(200,230,201,0.6)"}}>→</span>
        </button>
      </section>

      {/* Suggested for screening */}
      <section style={{padding:"0 0 14px"}}>
        <div style={{padding:"0 20px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <p style={{fontSize:14,fontWeight:800,color:T.text}}>Suggérés pour analyse</p>
            <p style={{fontSize:11,color:T.textMuted,marginTop:2}}>{subtitle}</p>
          </div>
          <button onClick={()=>setTab("screen")} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:700,color:T.forest,fontFamily:"inherit"}}>Tout voir →</button>
        </div>
        <div style={{display:"flex",gap:12,overflowX:"auto",padding:"4px 20px 4px",scrollbarWidth:"none"}}>
          {suggested.map(t => <SuggestionCard key={t} ticker={t} onReport={openReport}/>)}
        </div>
      </section>

      <MarketInsights onSearch={()=>setTab("screen")}/>

      {showUp&&<UpgradeModal onClose={()=>setShowUp(false)}/>}
    </div>
  );
}
