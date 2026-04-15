#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# PUR — Setup 7 : Rebrand + Design system + Score explicite + Graphiques
# ═══════════════════════════════════════════════════════════════════
set -e
echo "🌿 PUR — Mise à jour design system..."

# ── globals.css ───────────────────────────────────────────────────
cat > src/app/globals.css << 'EOF'
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Cabinet+Grotesk:wght@400;500;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  /* ── Brand ── */
  --pur-forest:      #1A3A2A;
  --pur-emerald:     #208640;
  --pur-leaf:        #639922;
  --pur-gold:        #C9A84C;

  /* ── Backgrounds ── */
  --pur-bg:          #F7F5F0;
  --pur-surface:     #FFFFFF;
  --pur-surface-2:   #F2F0EB;

  /* ── Text ── */
  --pur-text:        #1A1A16;
  --pur-text-sub:    #6B6960;
  --pur-text-muted:  #A8A49C;

  /* ── Semantic ── */
  --pur-halal:       #208640;
  --pur-halal-bg:    #EAF3DE;
  --pur-halal-mid:   #639922;
  --pur-doubtful:    #B07D2A;
  --pur-doubtful-bg: #FDF3E0;
  --pur-haram:       #A32D2D;
  --pur-haram-bg:    #FCEBEB;

  /* ── Border ── */
  --pur-border:      rgba(0,0,0,0.08);
}

body {
  font-family: 'Cabinet Grotesk', system-ui, sans-serif;
  background: var(--pur-bg);
  color: var(--pur-text);
  -webkit-font-smoothing: antialiased;
}

input, button, textarea { font-family: 'Cabinet Grotesk', system-ui, sans-serif !important; }
::-webkit-scrollbar { display: none; }
* { -ms-overflow-style: none; scrollbar-width: none; }

@keyframes fadeUp    { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeOut   { from { opacity:1 } to { opacity:0; transform:scale(.97) } }
@keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
@keyframes screenIn  { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
@keyframes sheetUp   { from { transform:translateY(100%) } to { transform:translateY(0) } }
@keyframes toastIn   { from { opacity:0; transform:translateY(-10px) } to { opacity:1; transform:translateY(0) } }
@keyframes blink     { from { opacity:.2 } to { opacity:1 } }
@keyframes shimmer   { 0% { background-position:200% 0 } 100% { background-position:-200% 0 } }
@keyframes spin      { to { transform:rotate(360deg) } }

button:focus-visible, input:focus-visible { outline: 2px solid var(--pur-emerald); outline-offset: 2px; }
button:active { transform: scale(.97); }
EOF

# ── src/components/App.tsx — mise à jour complète ─────────────────
cat > src/components/App.tsx << 'APPEOF'
"use client";
import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { usePortfolioStore, useWatchlistStore, useUserStore } from "@/store/usePortfolioStore";
import { AAOIFI_RULES, calcScore, scoreToStatus, calcPurification, computePortfolioMetrics } from "@/domain/aaoifi";
import type { Asset, PortfolioItem, ChartPeriod, ChartPoint } from "@/domain/types";

// ── Design Tokens PUR ──────────────────────────────────────────────
const T = {
  bg:"#F7F5F0", surface:"#FFFFFF", surface2:"#F2F0EB",
  border:"rgba(0,0,0,0.08)", borderStrong:"rgba(0,0,0,0.14)",
  forest:"#1A3A2A", emerald:"#208640", leaf:"#639922", gold:"#C9A84C",
  text:"#1A1A16", textSub:"#6B6960", textMuted:"#A8A49C",
  halal:"#208640", halalBg:"#EAF3DE", halalMid:"#639922",
  doubtful:"#B07D2A", doubtfulBg:"#FDF3E0",
  haram:"#A32D2D", haramBg:"#FCEBEB",
  // Dark mode surfaces
  darkBg:"#111A14", darkSurface:"#1A2A20", darkSurface2:"#1F3025",
  darkBorder:"rgba(255,255,255,0.07)", darkText:"#E8F0EB",
};

const STATUS_CFG: Record<string,{color:string;bg:string;label:string;icon:string;meaning:string}> = {
  halal:       {color:T.halal,    bg:T.halalBg,    label:"Halal",        icon:"✓", meaning:"Conforme à la charia"},
  douteux:     {color:T.doubtful, bg:T.doubtfulBg, label:"Douteux",      icon:"!", meaning:"À surveiller — par précaution"},
  "non-halal": {color:T.haram,    bg:T.haramBg,    label:"Non conforme", icon:"✕", meaning:"Ne pas investir"},
};

const FREEMIUM = { SCREENINGS: 3 };
const SUBSCRIPTION = { PRICE_EUR: 9.99, TRIAL_DAYS: 7 };
const SECTOR_COLORS = [T.emerald,T.leaf,"#639922","#C9A84C","#B07D2A","#8B6914"];

// ── Score → label lisible ─────────────────────────────────────────
function scoreLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= AAOIFI_RULES.HALAL_MIN)   return { label: "Halal ✓",       color: T.halal,    bg: T.halalBg    };
  if (score >= AAOIFI_RULES.DOUTEUX_MIN) return { label: "Douteux",       color: T.doubtful, bg: T.doubtfulBg };
  return                                          { label: "Non conforme", color: T.haram,    bg: T.haramBg    };
}

// ── Génère des points simulés avec timestamps réels ───────────────
function genPts(base: number, vol: number, n: number, tr: number): ChartPoint[] {
  let p = base * (1 - tr * .5);
  const now = Date.now();
  const pts: ChartPoint[] = Array.from({ length: n }, (_, i) => {
    p *= (1 + (Math.random() - .48) * vol + tr / n);
    return { t: now - (n - i) * (86400000 / n) * n, v: parseFloat(p.toFixed(2)) };
  });
  pts[pts.length - 1].v = base;
  return pts;
}
function mkPeriods(b: number, vol: number, tr: number): Record<ChartPeriod, ChartPoint[]> {
  const now = Date.now();
  return {
    "1D": genPts(b, vol * .3, 48,  tr * .02),
    "1S": genPts(b, vol * .5, 56,  tr * .05),
    "1M": genPts(b, vol,      60,  tr * .15),
    "1A": genPts(b, vol * 1.5, 52, tr),
  };
}

// ── Hooks ─────────────────────────────────────────────────────────
function useAsync<T>(fn: () => Promise<T>, deps: any[] = []) {
  const [state, set] = useState<{data:T|null;isLoading:boolean;error:string|null}>
    ({data:null, isLoading:true, error:null});
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    set(s => ({...s, isLoading:true, error:null}));
    fn()
      .then(d  => { if (mounted.current) set({data:d, isLoading:false, error:null}); })
      .catch(e => { if (mounted.current) set({data:null, isLoading:false, error:e.message}); });
    return () => { mounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

function useStock(ticker: string | null, period: ChartPeriod = "1M") {
  return useAsync(
    () => ticker
      ? fetch(`/api/stock/${ticker}?period=${period}`).then(r => {
          if (!r.ok) throw new Error("Ticker introuvable");
          return r.json();
        })
      : Promise.resolve(null),
    [ticker, period]
  );
}

function useSearch(query: string) {
  return useAsync(
    () => query.length >= 2
      ? fetch(`/api/search?q=${encodeURIComponent(query)}`).then(r => r.json())
      : Promise.resolve({ results: [] }),
    [query]
  );
}

function useDebounce<T>(v: T, d: number): T {
  const [db, set] = useState(v);
  useEffect(() => { const h = setTimeout(() => set(v), d); return () => clearTimeout(h); }, [v, d]);
  return db;
}

// ── Toast ─────────────────────────────────────────────────────────
let _toast: ((msg: string, type?: string) => void) | null = null;
const useToast = () => _toast ?? ((m: string) => console.log(m));

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, set] = useState<{id:number;msg:string;type:string}[]>([]);
  const add = useCallback((msg: string, type = "success") => {
    const id = Date.now();
    set(t => [...t, {id, msg, type}]);
    setTimeout(() => set(t => t.filter(x => x.id !== id)), 3000);
  }, []);
  _toast = add;
  return (
    <>
      {children}
      <div style={{position:"fixed",top:54,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 32px)",maxWidth:394,zIndex:999,display:"flex",flexDirection:"column",gap:7,pointerEvents:"none"}}>
        {toasts.map(t => (
          <div key={t.id} role="alert" style={{background:T.surface,border:`1px solid ${t.type==="success"?T.emerald+"44":T.borderStrong}`,borderRadius:12,padding:"11px 15px",display:"flex",gap:10,alignItems:"center",animation:"toastIn .3s ease",boxShadow:"0 4px 20px rgba(0,0,0,0.12)"}}>
            <span style={{fontSize:16}}>{t.type==="success"?"✅":t.type==="error"?"❌":"ℹ️"}</span>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>{t.msg}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────
function Skeleton({ w="100%", h=14, r=7 }: { w?:string|number; h?:number; r?:number }) {
  return <div style={{width:w,height:h,borderRadius:r,background:`linear-gradient(90deg,${T.surface2} 25%,${T.surface} 50%,${T.surface2} 75%)`,backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite"}}/>;
}
function LoadingCard() {
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:20,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
        <div style={{flex:1,marginRight:16}}><Skeleton h={22} w="55%" r={4}/><div style={{marginTop:8}}><Skeleton h={14} w="35%" r={4}/></div></div>
        <Skeleton w={56} h={56} r={28}/>
      </div>
      <Skeleton h={64} r={8}/><div style={{marginTop:10}}><Skeleton h={8} r={4}/></div>
    </div>
  );
}

// ── PUR Logo ──────────────────────────────────────────────────────
function PurLogo({ size=32, showName=true }: { size?:number; showName?:boolean }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:size,height:size,borderRadius:size*0.28,background:T.forest,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <svg width={size*0.55} height={size*0.55} viewBox="0 0 20 20" fill="none">
          <path d="M4 10.5L8.5 15L16 6" stroke="#E8F0EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="10" cy="10" r="8.5" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
        </svg>
      </div>
      {showName && (
        <div>
          <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:size*0.56,fontWeight:800,color:T.text,letterSpacing:"-0.02em",lineHeight:1}}>PUR</div>
          <div style={{fontSize:9,color:T.textMuted,letterSpacing:"0.06em",lineHeight:1,marginTop:1}}>AAOIFI · Finance islamique</div>
        </div>
      )}
    </div>
  );
}

// ── Score Ring — avec label de statut ────────────────────────────
const ScoreRing = memo(({ score, size=68 }: { score:number; size?:number }) => {
  const sl = scoreLabel(score);
  const r  = size * .37, c = 2 * Math.PI * r;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${score}/100 — ${sl.label}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.surface2} strokeWidth="5"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={sl.color} strokeWidth="5"
          strokeDasharray={`${(score/100)*c} ${c}`} strokeDashoffset={c*.25} strokeLinecap="round"
          style={{transition:"stroke-dasharray .9s ease"}}/>
        <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
          fill={sl.color} fontSize={size*.24} fontWeight="800"
          fontFamily="'Cabinet Grotesk',sans-serif">{score}</text>
      </svg>
      {/* Label explicite sous le score */}
      <div style={{background:sl.bg,color:sl.color,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:100,letterSpacing:"0.04em",whiteSpace:"nowrap"}}>
        {sl.label}
      </div>
    </div>
  );
});
ScoreRing.displayName = "ScoreRing";

// ── Ratio Bar ─────────────────────────────────────────────────────
const RatioBar = memo(({ label, value, limitKey, detail }: {
  label: string; value: number;
  limitKey: keyof typeof AAOIFI_RULES; detail: string;
}) => {
  const [open, setOpen] = useState(false);
  const limit = AAOIFI_RULES[limitKey] as number ?? 33;
  const ok    = value < limit;
  const pct   = Math.min((value / limit) * 100, 100);
  const color = ok ? T.emerald : T.haram;
  return (
    <div style={{marginBottom:13}}>
      <button onClick={() => setOpen(o => !o)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,fontFamily:"inherit"}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{width:18,height:18,borderRadius:5,background:ok?T.halalBg:T.haramBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color,fontWeight:800,flexShrink:0}}>{ok?"✓":"✕"}</div>
          <span style={{fontSize:13,color:T.textSub}}>{label}</span>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:700,color}}>{value}%</span>
          <span style={{fontSize:11,color:T.textMuted}}>/ {limit}%</span>
          <span style={{fontSize:10,color:T.textMuted}}>{open?"▲":"▼"}</span>
        </div>
      </button>
      <div style={{height:5,background:T.surface2,borderRadius:100,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:100,transition:"width .8s ease"}}/>
      </div>
      {open && (
        <div style={{fontSize:12,color:T.textSub,marginTop:8,padding:"10px 12px",background:T.surface2,borderRadius:8,lineHeight:1.7}}>
          {detail}
          <br/><span style={{color:T.textMuted,fontSize:11}}>Standard : {AAOIFI_RULES.VERSION} · Seuil max : {limit}%</span>
        </div>
      )}
    </div>
  );
});
RatioBar.displayName = "RatioBar";

// ── Chart — avec axe X temporel ──────────────────────────────────
const Chart = memo(({ periods, currentPeriod, onPeriodChange, color=T.emerald, height=120 }: {
  periods: Record<ChartPeriod, ChartPoint[]>;
  currentPeriod: ChartPeriod;
  onPeriodChange: (p: ChartPeriod) => void;
  color?: string;
  height?: number;
}) => {
  const [hov, setHov] = useState<number|null>(null);
  const svgRef        = useRef<SVGSVGElement>(null);
  const data          = periods?.[currentPeriod] || [];
  const W=370, H=height, PB=28, PT=6, pH=H-PB-PT;
  const vals = data.map(d => d.v);
  const min  = vals.length ? Math.min(...vals) : 0;
  const max  = vals.length ? Math.max(...vals) : 1;
  const range = max - min || 1;
  const pts  = data.map((d, i) => ({
    x: (i / (data.length - 1 || 1)) * W,
    y: PT + pH - ((d.v - min) / range) * pH,
    v: d.v, t: d.t,
  }));
  const poly = pts.map(p => `${p.x},${p.y}`).join(" ");
  const area = `M${pts[0]?.x||0},${PT+pH} ${pts.map(p=>`L${p.x},${p.y}`).join(" ")} L${pts[pts.length-1]?.x||W},${PT+pH} Z`;
  const gid  = `g${color.replace(/[^a-z0-9]/gi,"")}${currentPeriod}`;
  const hovPt = hov !== null ? pts[hov] : null;

  // ── Formattage axe X temporel selon la période ───────────────
  const fmtAxisX = (ts: number, p: ChartPeriod): string => {
    const d = new Date(ts);
    if (p === "1D") return d.toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"});
    if (p === "1S") return ["Di","Lu","Ma","Me","Je","Ve","Sa"][d.getDay()];
    if (p === "1M") return d.toLocaleDateString("fr-FR", {day:"numeric", month:"short"});
    return d.toLocaleDateString("fr-FR", {month:"short", year:"2-digit"});
  };

  const fmtHover = (ts: number, p: ChartPeriod): string => {
    const d = new Date(ts);
    if (p === "1D") return d.toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"});
    if (p === "1S") return d.toLocaleDateString("fr-FR", {weekday:"long", day:"numeric", month:"short"});
    if (p === "1M") return d.toLocaleDateString("fr-FR", {day:"numeric", month:"long"});
    return d.toLocaleDateString("fr-FR", {month:"long", year:"numeric"});
  };

  // Indices des labels X — 5 points bien espacés
  const lblIdxs = data.length > 4
    ? [0, Math.floor(data.length*.25), Math.floor(data.length*.5), Math.floor(data.length*.75), data.length-1]
    : data.length > 1 ? [0, data.length-1] : [];

  const onMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx   = "touches" in e ? e.touches[0]?.clientX || 0 : e.clientX;
    const xS   = (cx - rect.left) * (W / rect.width);
    let ci = 0, md = Infinity;
    pts.forEach((p, i) => { const d = Math.abs(p.x - xS); if (d < md) { md = d; ci = i; } });
    setHov(ci);
  }, [pts]);

  const periodBtns = (["1D","1S","1M","1A"] as ChartPeriod[]);

  if (!data.length) return (
    <div>
      <div style={{display:"flex",gap:4,marginBottom:10}}>
        {periodBtns.map(p => (
          <button key={p} onClick={() => onPeriodChange(p)} style={{flex:1,height:28,background:currentPeriod===p?color:T.surface2,color:currentPeriod===p?"#fff":T.textSub,border:"none",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{p}</button>
        ))}
      </div>
      <div style={{height,background:T.surface2,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:12,color:T.textMuted}}>Graphique disponible avec la clé FMP</span>
      </div>
    </div>
  );

  return (
    <div>
      {/* Boutons période */}
      <div style={{display:"flex",gap:4,marginBottom:8}}>
        {periodBtns.map(p => (
          <button key={p} onClick={() => onPeriodChange(p)} style={{flex:1,height:28,background:currentPeriod===p?color:T.surface2,color:currentPeriod===p?"#fff":T.textSub,border:"none",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{p}</button>
        ))}
      </div>

      {/* Prix au survol */}
      <div style={{height:22,marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
        {hovPt ? (
          <>
            <span style={{fontSize:15,fontWeight:800,color:T.text,fontFamily:"'DM Serif Display',serif"}}>{hovPt.v.toFixed(2)}$</span>
            <span style={{fontSize:11,color:T.textMuted}}>{fmtHover(hovPt.t, currentPeriod)}</span>
          </>
        ) : (
          <span style={{fontSize:11,color:T.textMuted}}>Survolez pour le détail</span>
        )}
      </div>

      {/* SVG */}
      <div style={{cursor:"crosshair",marginLeft:-4,marginRight:-4}}
        onMouseMove={onMove} onMouseLeave={() => setHov(null)}
        onTouchMove={onMove} onTouchEnd={() => setHov(null)}>
        <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",overflow:"visible"}} role="img" aria-label={`Graphique ${currentPeriod}`}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity=".18"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </linearGradient>
          </defs>

          <path d={area} fill={`url(#${gid})`}/>
          <polyline points={poly} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>

          {/* Axe X — labels temporels */}
          <line x1="0" y1={PT+pH+1} x2={W} y2={PT+pH+1} stroke={T.border} strokeWidth="1"/>
          {lblIdxs.map((idx, i) => pts[idx] && (
            <text key={i} x={pts[idx].x} y={H-6}
              textAnchor={i===0?"start":i===lblIdxs.length-1?"end":"middle"}
              fill={T.textMuted} fontSize="9"
              fontFamily="'Cabinet Grotesk',sans-serif">
              {fmtAxisX(data[idx].t, currentPeriod)}
            </text>
          ))}

          {/* Crosshair */}
          {hovPt && (
            <>
              <line x1={hovPt.x} y1={PT} x2={hovPt.x} y2={PT+pH} stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity=".5"/>
              <circle cx={hovPt.x} cy={hovPt.y} r="4" fill={color} stroke={T.surface} strokeWidth="2"/>
            </>
          )}
        </svg>
      </div>
    </div>
  );
});
Chart.displayName = "Chart";

// ── Modal ─────────────────────────────────────────────────────────
const Modal = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div role="dialog" aria-modal="true" onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300,backdropFilter:"blur(6px)",animation:"fadeIn .2s ease"}}>
    <div onClick={e => e.stopPropagation()} style={{background:T.surface,width:"100%",maxWidth:430,borderRadius:"20px 20px 0 0",padding:"20px 22px 44px",maxHeight:"90vh",overflowY:"auto",animation:"sheetUp .32s cubic-bezier(.34,1.2,.64,1)"}}>
      <div style={{width:36,height:4,borderRadius:2,background:T.border,margin:"0 auto 20px"}}/>
      {children}
    </div>
  </div>
);

// ── Upgrade Modal ────────────────────────────────────────────────
function UpgradeModal({ onClose }: { onClose: () => void }) {
  const setIsPremium = useUserStore(s => s.setIsPremium);
  const toast = useToast();
  const feats = ["Screenings illimités","ETF islamiques certifiés","Rapports bilans complets","Alertes conformité","Historique score 2 ans","Score ESG","Purification automatisée","Support prioritaire"];
  return (
    <Modal onClose={onClose}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <PurLogo size={28}/>
      </div>
      <h2 style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:6}}>PUR Premium</h2>
      <p style={{fontSize:13,color:T.textSub,marginBottom:18,lineHeight:1.7}}>Investissez en accord avec vos valeurs, sans compromis.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:18}}>
        {feats.map(f => (
          <div key={f} style={{display:"flex",gap:7,alignItems:"center",fontSize:12,color:T.text}}>
            <div style={{width:14,height:14,borderRadius:4,background:T.halalBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:T.emerald,fontWeight:800,flexShrink:0}}>✓</div>
            {f}
          </div>
        ))}
      </div>
      <div style={{background:T.surface2,borderRadius:12,padding:18,textAlign:"center",marginBottom:14}}>
        <div style={{fontSize:32,fontWeight:800,color:T.text,fontFamily:"'DM Serif Display',serif"}}>{SUBSCRIPTION.PRICE_EUR}€<span style={{fontSize:14,fontWeight:400,color:T.textSub}}>/mois</span></div>
        <div style={{fontSize:12,color:T.textMuted,marginTop:2}}>{SUBSCRIPTION.TRIAL_DAYS} jours gratuits · Résiliable à tout moment</div>
      </div>
      <button style={{...BS.btnPrimary}} onClick={() => { setIsPremium(true); toast("Premium activé ✓"); onClose(); }}>
        Commencer — {SUBSCRIPTION.TRIAL_DAYS} jours gratuits
      </button>
      <button style={{...BS.btnGhost,width:"100%",marginTop:10}} onClick={onClose}>Pas maintenant</button>
    </Modal>
  );
}

// ── Auth Modal ───────────────────────────────────────────────────
function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode]   = useState<"signin"|"signup">("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw]       = useState("");
  const [pw2, setPw2]     = useState("");
  const [loading, setL]   = useState(false);
  const [err, setErr]     = useState("");
  const [ok, setOk]       = useState(false);
  const toast = useToast();

  const submit = async () => {
    setErr("");
    if (!email || !pw) { setErr("Tous les champs sont requis."); return; }
    if (mode === "signup" && pw !== pw2) { setErr("Les mots de passe ne correspondent pas."); return; }
    setL(true);
    try {
      const res  = await fetch(`/api/auth/${mode}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email, password:pw}) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Erreur"); setL(false); return; }
      if (data.needsConfirmation) { setOk(true); setL(false); return; }
      toast("Bienvenue ! 👋"); onClose(); window.location.reload();
    } catch { setErr("Erreur réseau"); }
    setL(false);
  };

  if (ok) return (
    <Modal onClose={onClose}>
      <div style={{textAlign:"center",padding:"20px 0"}}>
        <div style={{fontSize:48,marginBottom:14}}>📧</div>
        <h2 style={{fontSize:20,fontWeight:800,color:T.text,marginBottom:10}}>Vérifiez votre email</h2>
        <p style={{fontSize:13,color:T.textSub,lineHeight:1.7}}>Lien envoyé à <strong style={{color:T.text}}>{email}</strong></p>
        <button style={{...BS.btnGhost,marginTop:20,padding:"0 24px"}} onClick={onClose}>Fermer</button>
      </div>
    </Modal>
  );

  return (
    <Modal onClose={onClose}>
      <div style={{marginBottom:20,textAlign:"center"}}><PurLogo size={32}/></div>
      <div style={{...BS.segCtrl,marginBottom:16}}>
        {([["signin","Se connecter"],["signup","Créer un compte"]] as const).map(([id,lbl]) => (
          <button key={id} onClick={() => { setMode(id); setErr(""); }} style={{...BS.seg,...(mode===id?BS.segActive:{})}}>{lbl}</button>
        ))}
      </div>
      {err && <div style={{background:T.haramBg,border:`1px solid ${T.haram}30`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:T.haram}}>{err}</div>}
      <label style={{fontSize:12,color:T.textSub,marginBottom:5,display:"block"}}>Email</label>
      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="vous@email.com" style={{...BS.input,marginBottom:12}}/>
      <label style={{fontSize:12,color:T.textSub,marginBottom:5,display:"block"}}>Mot de passe</label>
      <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" style={{...BS.input,marginBottom:mode==="signup"?12:20}}/>
      {mode === "signup" && <>
        <label style={{fontSize:12,color:T.textSub,marginBottom:5,display:"block"}}>Confirmer</label>
        <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="••••••••" style={{...BS.input,marginBottom:20}}/>
      </>}
      <button style={{...BS.btnPrimary,opacity:loading?.7:1}} onClick={submit} disabled={loading}>
        {loading ? "Chargement…" : mode==="signin" ? "Se connecter" : "Créer mon compte"}
      </button>
    </Modal>
  );
}

// ── StockCard ────────────────────────────────────────────────────
function StockCard({ ticker, onReport }: { ticker: string; onReport: (t: string) => void }) {
  const pfAdd     = usePortfolioStore(s => s.add);
  const inPf      = usePortfolioStore(s => s.inPortfolio);
  const wlToggle  = useWatchlistStore(s => s.toggle);
  const inWl      = useWatchlistStore(s => s.inList);
  const isPremium = useUserStore(s => s.isPremium);
  const toast     = useToast();
  const [period, setPeriod]         = useState<ChartPeriod>("1M");
  const [showWhy, setShowWhy]       = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data, isLoading, error } = useStock(ticker, period);
  const asset = data?.asset;

  const enrichedPeriods = useMemo(() => {
    if (!asset) return {"1D":[],"1S":[],"1M":[],"1A":[]};
    const hist = data?.history?.[period] ?? [];
    if (hist.length > 0) return {...asset.periods, [period]: hist};
    return mkPeriods(asset.price, (asset.beta??1)*.015, (asset.change??0) > 0 ? .8 : -.3);
  }, [asset, data, period]);

  if (isLoading) return <LoadingCard/>;
  if (error || !asset) return (
    <div style={{background:T.haramBg,border:`1px solid ${T.haram}22`,borderRadius:16,padding:18,color:T.haram,fontSize:13}}>
      Ticker introuvable : {ticker}
    </div>
  );

  const cfg        = STATUS_CFG[asset.status] ?? STATUS_CFG.halal;
  const sl         = scoreLabel(asset.score);
  const isInPf     = inPf(ticker);
  const isWatched  = inWl(ticker);
  const chartColor = (asset.change ?? 0) >= 0 ? T.emerald : T.haram;

  return (
    <article aria-label={`Fiche ${ticker}`} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,overflow:"hidden"}}>
      {/* Banner statut */}
      <div style={{background:cfg.bg,padding:"8px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          <div style={{width:18,height:18,borderRadius:5,background:cfg.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff"}}>{cfg.icon}</div>
          <span style={{fontSize:12,fontWeight:700,color:cfg.color}}>{cfg.label}</span>
          <span style={{fontSize:11,color:cfg.color,opacity:.7}}>— {cfg.meaning}</span>
        </div>
        <span style={{fontSize:10,color:T.textMuted}}>{AAOIFI_RULES.VERSION}</span>
      </div>

      <div style={{padding:18}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <h2 style={{fontSize:22,fontWeight:800,color:T.text,letterSpacing:"-.5px",margin:0,fontFamily:"'Cabinet Grotesk',sans-serif"}}>{ticker}</h2>
            <p style={{fontSize:12,color:T.textSub,marginBottom:8}}>{asset.name}</p>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {[[asset.sector,"#208640"],["📍 "+asset.country,T.textMuted],[asset.mktCap,T.textMuted],[(asset.divYield??0)>0?`Div. ${asset.divYield}%`:null,T.doubtful],[asset.volatility,asset.volatility==="Faible"?T.emerald:asset.volatility==="Élevée"?T.haram:T.doubtful]].filter(([v])=>v).map(([v,c],i)=>(
                <span key={i} style={{fontSize:11,background:`${c}14`,color:c as string,padding:"3px 8px",borderRadius:100,fontWeight:600}}>{v}</span>
              ))}
            </div>
          </div>
          {/* Score ring avec label explicite */}
          <ScoreRing score={asset.score} size={64}/>
        </div>

        {/* Prix */}
        <div style={{marginBottom:14}}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color:T.text,lineHeight:1}}>{asset.price}$</div>
          <div style={{fontSize:12,color:chartColor,fontWeight:700,marginTop:3}}>{(asset.change??0)>=0?"+":""}{asset.change}% aujourd'hui</div>
        </div>

        {/* Graphique avec axe temporel */}
        <Chart periods={enrichedPeriods} currentPeriod={period} onPeriodChange={setPeriod} color={chartColor} height={120}/>

        {/* Ratios */}
        <div style={{background:T.surface2,borderRadius:12,padding:14,marginBottom:14,marginTop:14}}>
          <p style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textMuted,marginBottom:12}}>Ratios {AAOIFI_RULES.VERSION}</p>
          <RatioBar label="Dette / actifs totaux"  value={asset.ratioDebt}      limitKey="DEBT_MAX"          detail={`Mesure l'endettement de ${ticker}. Seuil : ${AAOIFI_RULES.DEBT_MAX}% des actifs.`}/>
          <RatioBar label="Revenus non conformes"  value={asset.ratioRevHaram}  limitKey="HARAM_REVENUE_MAX" detail={`Part des revenus illicites (intérêts, alcool…). Seuil : ${AAOIFI_RULES.HARAM_REVENUE_MAX}%.`}/>
          <RatioBar label="Liquidités / actifs"    value={asset.ratioCash}      limitKey="CASH_MAX"          detail={`Instruments monétaires basés sur l'intérêt. Seuil : ${AAOIFI_RULES.CASH_MAX}%.`}/>
        </div>

        {/* Historique score (Premium) */}
        {isPremium && asset.scoreHistory.length > 0 && (
          <div style={{background:T.surface2,borderRadius:12,padding:14,marginBottom:14}}>
            <p style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textMuted,marginBottom:10}}>Évolution HalalScore™ — {asset.scoreHistory.length} trimestres</p>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",height:44}}>
              {asset.scoreHistory.map((v, i) => {
                const sl2 = scoreLabel(v);
                return (
                  <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flex:1}}>
                    <span style={{fontSize:9,color:T.textMuted}}>{v}</span>
                    <div style={{width:"70%",borderRadius:"2px 2px 0 0",background:`${sl2.color}${i===asset.scoreHistory.length-1?"":"88"}`,height:`${(v/100)*36}px`,minHeight:3}}/>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {!isPremium && (
          <button onClick={() => setShowUpgrade(true)} style={{width:"100%",background:T.surface2,border:`1px solid ${T.doubtful}28`,borderRadius:12,padding:"11px 14px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",fontFamily:"inherit"}}>
            <div><div style={{fontSize:12,fontWeight:700,color:T.doubtful,marginBottom:2}}>Historique du score sur 2 ans</div><div style={{fontSize:11,color:T.textMuted}}>Évolution trimestrielle · Fonctionnalité Premium</div></div>
            <span style={{fontSize:12,color:T.doubtful,fontWeight:700}}>Voir →</span>
          </button>
        )}

        {/* Pourquoi */}
        <div style={{background:T.surface2,borderRadius:12,overflow:"hidden",marginBottom:14}}>
          <button onClick={() => setShowWhy(w=>!w)} style={{width:"100%",padding:"12px 14px",display:"flex",justifyContent:"space-between",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>Pourquoi {asset.status==="halal"?"conforme":asset.status==="douteux"?"douteuse":"non conforme"} ?</span>
            <span style={{color:T.textMuted,fontSize:12}}>{showWhy?"▲":"▼"}</span>
          </button>
          {showWhy && (
            <div style={{padding:"0 14px 14px"}}>
              {asset.whyHalal.map((w, i) => (
                <div key={i} style={{display:"flex",gap:9,marginBottom:11}}>
                  <div style={{width:18,height:18,borderRadius:5,background:w.ok?T.halalBg:T.haramBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:w.ok?T.emerald:T.haram,fontWeight:800,flexShrink:0,marginTop:1}}>{w.ok?"✓":"✕"}</div>
                  <div><p style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:2}}>{w.label}</p><p style={{fontSize:12,color:T.textSub,lineHeight:1.65}}>{w.detail}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purification */}
        {(asset.divAnnual ?? 0) > 0 && (
          <div style={{background:"linear-gradient(135deg,#FDF8EF,#FDF3E0)",border:`1px solid ${T.gold}30`,borderRadius:12,padding:14,marginBottom:14}}>
            <p style={{fontSize:12,fontWeight:700,color:T.doubtful,marginBottom:8}}>Purification des dividendes</p>
            <div style={{display:"flex",gap:16}}>
              <div><p style={{fontSize:10,color:T.textMuted,marginBottom:3}}>Dividende/an</p><p style={{fontSize:13,fontWeight:700,color:T.text}}>{asset.divAnnual}$</p></div>
              <div><p style={{fontSize:10,color:T.textMuted,marginBottom:3}}>Part non conforme</p><p style={{fontSize:13,fontWeight:700,color:T.doubtful}}>{asset.divHaramPct}%</p></div>
              <div><p style={{fontSize:10,color:T.textMuted,marginBottom:3}}>À purifier</p><p style={{fontSize:13,fontWeight:700,color:T.doubtful}}>{calcPurification(asset.divAnnual??0,asset.divHaramPct??0).toFixed(3)}$</p></div>
            </div>
          </div>
        )}

        {/* CTAs */}
        <div style={{display:"flex",gap:7}}>
          <button onClick={() => { pfAdd(asset); toast(isInPf?`${ticker} déjà dans le portefeuille`:`${ticker} ajouté ✓`, isInPf?"info":"success"); }} style={{flex:1,height:46,background:T.forest,border:"none",borderRadius:12,color:"#fff",fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}}>
            {isInPf?"Dans le portefeuille ✓":"+ Ajouter au portefeuille"}
          </button>
          <button onClick={() => { wlToggle(asset); toast(isWatched?`Retiré`:`${ticker} suivi 🔖`); }} style={{width:46,height:46,background:isWatched?T.halalBg:T.surface2,border:`1px solid ${isWatched?T.emerald:T.border}`,borderRadius:12,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>🔖</button>
          <button onClick={() => onReport(ticker)} style={{width:46,height:46,background:T.surface2,border:`1px solid ${T.border}`,borderRadius:12,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}} title="Rapport complet">📋</button>
        </div>
      </div>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)}/>}
    </article>
  );
}

// ── Screens ───────────────────────────────────────────────────────
function HomeScreen({ setTab, openReport }: { setTab:(t:string)=>void; openReport:(t:string)=>void }) {
  const metrics   = usePortfolioStore(s => s.metrics);
  const holdings  = usePortfolioStore(s => s.holdings);
  const isPremium = useUserStore(s => s.isPremium);
  const screenings= useUserStore(s => s.screenings);
  const toast     = useToast();
  const [q, setQ]          = useState("");
  const [ticker, setTicker]  = useState<string|null>(null);
  const [showUp, setShowUp]  = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const dq = useDebounce(q, 400);
  const { data: searchData } = useSearch(dq);
  const m = metrics;

  const pfData    = useMemo(() => [3050,3180,3120,3300,3280,3450,3420,m.value].map((v,i,a)=>({t:Date.now()-(a.length-i)*86400000*4,v})), [m.value]);
  const pfPeriods = useMemo(() => ({"1D":pfData,"1S":pfData,"1M":pfData,"1A":pfData}), [pfData]);
  const [pfPeriod, setPfPeriod] = useState<ChartPeriod>("1M");

  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease"}}>
      <header style={{padding:"52px 20px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <PurLogo size={32}/>
        <button onClick={() => isPremium?null:setShowAuth(true)} style={{...BS.iconBtn,background:isPremium?T.forest:T.surface,border:`1px solid ${isPremium?T.forest:T.border}`}}>
          <span style={{fontSize:16,color:isPremium?"#E8F0EB":T.textSub}}>{isPremium?"⭐":"👤"}</span>
        </button>
      </header>

      {/* Portfolio hero */}
      <section style={{padding:"0 20px 14px"}}>
        <div style={{background:T.forest,borderRadius:20,padding:"20px 20px 14px",overflow:"hidden",position:"relative"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div>
              <p style={{fontSize:10,color:"rgba(232,240,235,0.5)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Portefeuille</p>
              <p style={{fontFamily:"'DM Serif Display',serif",fontSize:30,color:"#E8F0EB",letterSpacing:"-1px",lineHeight:1}}>{m.value.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}</p>
              <p style={{fontSize:12,color:m.gain>=0?"#6FCF97":"#F09595",fontWeight:700,marginTop:4}}>{m.gain>=0?"+":""}{m.gain.toFixed(0)}€ · {m.gain>=0?"+":""}{m.gainPct.toFixed(2)}%</p>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color:"#E8F0EB",lineHeight:1}}>{m.conform}</div>
              <div style={{fontSize:9,color:"rgba(232,240,235,0.4)",letterSpacing:"0.08em",marginTop:3}}>AAOIFI</div>
              <div style={{fontSize:10,color:m.conform>=75?"#6FCF97":"#F5C475",fontWeight:700,marginTop:2}}>{m.conform>=75?"Halal ✓":"Douteux"}</div>
            </div>
          </div>
          <Chart periods={pfPeriods} currentPeriod={pfPeriod} onPeriodChange={setPfPeriod} color="#6FCF97" height={90}/>
        </div>
      </section>

      {/* Quick actions */}
      <section style={{padding:"0 20px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button onClick={()=>setTab("screen")} style={{display:"flex",flexDirection:"column",gap:4,padding:"16px 14px",borderRadius:14,border:`1px solid ${T.emerald}22`,background:T.halalBg,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
          <span style={{fontSize:18}}>🔍</span>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>Screening</span>
          <span style={{fontSize:11,color:T.textSub}}>{isPremium?"Illimité":`${FREEMIUM.SCREENINGS-screenings} restants`}</span>
        </button>
        <button onClick={()=>setTab("portfolio")} style={{display:"flex",flexDirection:"column",gap:4,padding:"16px 14px",borderRadius:14,border:`1px solid ${T.border}`,background:T.surface,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
          <span style={{fontSize:18}}>📊</span>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>Portefeuille</span>
          <span style={{fontSize:11,color:T.textSub}}>{holdings.length} positions</span>
        </button>
      </section>

      {/* Search */}
      <section style={{padding:"0 20px 14px"}}>
        <div style={{position:"relative"}}>
          <div style={{display:"flex",gap:8}}>
            <input style={BS.input} placeholder="Rechercher une action (ex: AAPL)" value={q} onChange={e=>{setQ(e.target.value);if(!e.target.value)setTicker(null);}} onKeyDown={e=>e.key==="Enter"&&searchData?.results?.[0]&&setTicker(searchData.results[0].ticker)}/>
            <button style={{width:48,height:50,background:T.forest,border:"none",borderRadius:12,color:"#fff",fontSize:18,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>searchData?.results?.[0]&&setTicker(searchData.results[0].ticker)}>→</button>
          </div>
          {searchData?.results?.length > 0 && q && !ticker && (
            <div style={{position:"absolute",top:56,left:0,right:56,background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,zIndex:10,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,0.1)"}}>
              {searchData.results.slice(0,5).map((r: any) => (
                <button key={r.ticker} onClick={()=>{setTicker(r.ticker);setQ(r.ticker);}} style={{width:"100%",padding:"12px 16px",display:"flex",justifyContent:"space-between",background:"none",border:"none",borderBottom:`1px solid ${T.border}`,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                  <div><div style={{fontSize:13,fontWeight:700,color:T.text}}>{r.ticker}</div><div style={{fontSize:11,color:T.textSub}}>{r.name}</div></div>
                  <span style={{fontSize:11,color:T.textMuted,background:T.surface2,padding:"2px 7px",borderRadius:6}}>{r.exchange}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {!isPremium && (
          <div style={{display:"flex",gap:5,marginTop:8,alignItems:"center"}}>
            {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:3.5,background:i<screenings?T.emerald:T.surface2}}/>)}
            <span style={{fontSize:11,color:T.textSub,marginLeft:4}}>{screenings}/{FREEMIUM.SCREENINGS} screenings aujourd'hui</span>
            <button style={{fontSize:11,color:T.emerald,background:"none",border:"none",cursor:"pointer",marginLeft:"auto",fontFamily:"inherit",fontWeight:700}} onClick={()=>setShowUp(true)}>Illimité →</button>
          </div>
        )}
        {ticker && <div style={{marginTop:12}}><StockCard ticker={ticker} onReport={openReport}/></div>}
      </section>

      {showUp   && <UpgradeModal onClose={()=>setShowUp(false)}/>}
      {showAuth && <AuthModal   onClose={()=>setShowAuth(false)}/>}
    </div>
  );
}

function ScreeningScreen({ openReport }: { openReport:(t:string)=>void }) {
  const isPremium    = useUserStore(s => s.isPremium);
  const screenings   = useUserStore(s => s.screenings);
  const incScreenings = useUserStore(s => s.incScreenings);
  const [q, setQ]          = useState("");
  const [ticker, setTicker]  = useState<string|null>(null);
  const [showUp, setShowUp]  = useState(false);
  const dq = useDebounce(q, 300);
  const { data: searchData } = useSearch(dq);

  const doSearch = (t: string) => {
    if (!isPremium && screenings >= FREEMIUM.SCREENINGS) { setShowUp(true); return; }
    incScreenings(); setTicker(t); setQ(t);
  };

  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease"}}>
      <header style={BS.pageHeader}>
        <h1 style={BS.pageTitle}>Screening</h1>
        {!isPremium && <div style={{fontSize:11,background:T.doubtfulBg,color:T.doubtful,padding:"4px 10px",borderRadius:100,fontWeight:700}}>{screenings}/{FREEMIUM.SCREENINGS}</div>}
      </header>
      <div style={{padding:"0 20px 14px"}}>
        <div style={{position:"relative"}}>
          <div style={{display:"flex",gap:8}}>
            <input style={BS.input} placeholder="Ticker ou nom (ex: Apple, AAPL)…" value={q} onChange={e=>{setQ(e.target.value);if(!e.target.value)setTicker(null);}}/>
            <button style={{width:48,height:50,background:T.forest,border:"none",borderRadius:12,color:"#fff",fontSize:18,cursor:"pointer",flexShrink:0}} onClick={()=>searchData?.results?.[0]&&doSearch(searchData.results[0].ticker)}>→</button>
          </div>
          {searchData?.results?.length > 0 && q && !ticker && (
            <div style={{position:"absolute",top:56,left:0,right:56,background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,zIndex:10,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,0.1)"}}>
              {searchData.results.slice(0,6).map((r: any) => (
                <button key={r.ticker} onClick={()=>doSearch(r.ticker)} style={{width:"100%",padding:"12px 16px",display:"flex",justifyContent:"space-between",background:"none",border:"none",borderBottom:`1px solid ${T.border}`,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                  <div><div style={{fontSize:13,fontWeight:700,color:T.text}}>{r.ticker}</div><div style={{fontSize:11,color:T.textSub}}>{r.name}</div></div>
                  <span style={{fontSize:11,color:T.textMuted,background:T.surface2,padding:"2px 7px",borderRadius:6}}>{r.exchange}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p style={{fontSize:11,color:T.textMuted,marginTop:7}}>Données réelles · Financial Modeling Prep · {AAOIFI_RULES.VERSION}</p>
      </div>
      {ticker && <div style={{padding:"0 20px 16px"}}><StockCard ticker={ticker} onReport={openReport}/></div>}
      {showUp && <UpgradeModal onClose={()=>setShowUp(false)}/>}
    </div>
  );
}

function PortfolioScreen({ setTab }: { setTab:(t:string)=>void }) {
  const { holdings, metrics: m, purified, markPurified, remove } = usePortfolioStore();
  const toast = useToast();
  const [pfPeriod, setPfPeriod] = useState<ChartPeriod>("1M");
  const pfData    = useMemo(()=>[3050,3180,3120,3300,3280,3450,3420,m.value].map((v,i,a)=>({t:Date.now()-(a.length-i)*86400000*4,v})),[m.value]);
  const pfPeriods = useMemo(()=>({"1D":pfData,"1S":pfData,"1M":pfData,"1A":pfData}),[pfData]);
  const sectorSegs = useMemo(()=>Object.entries(m.sectors).map(([k,v],i)=>({label:k,pct:(v/m.value)*100,color:SECTOR_COLORS[i%6]})),[m]);
  const yearPur = useMemo(()=>{const y=new Date().getFullYear().toString();return purified.filter(e=>e.date.startsWith(y)).reduce((s,e)=>s+e.amount,0);},[purified]);

  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease"}}>
      <header style={BS.pageHeader}>
        <h1 style={BS.pageTitle}>Portefeuille</h1>
        <button onClick={()=>setTab("screen")} style={{height:34,padding:"0 14px",background:T.halalBg,border:`1px solid ${T.emerald}30`,borderRadius:100,color:T.emerald,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ Ajouter</button>
      </header>

      <section style={{padding:"0 20px 14px"}}>
        <div style={{background:T.forest,borderRadius:18,padding:"18px 18px 4px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <div>
              <p style={{fontSize:10,color:"rgba(232,240,235,0.4)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>Valeur totale</p>
              <p style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color:"#E8F0EB",lineHeight:1}}>{m.value.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}</p>
              <p style={{fontSize:12,color:m.gain>=0?"#6FCF97":"#F09595",fontWeight:700,marginTop:3}}>{m.gain>=0?"+":""}{m.gain.toFixed(0)}€ ({m.gain>=0?"+":""}{m.gainPct.toFixed(2)}%)</p>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:800,color:"#E8F0EB"}}>{m.conform}</div>
              <div style={{fontSize:9,color:"rgba(232,240,235,0.4)",letterSpacing:"0.06em",marginTop:2}}>AAOIFI</div>
              <div style={{fontSize:10,color:m.conform>=75?"#6FCF97":"#F5C475",fontWeight:700,marginTop:1}}>{m.conform>=75?"Halal ✓":"Douteux"}</div>
            </div>
          </div>
          <Chart periods={pfPeriods} currentPeriod={pfPeriod} onPeriodChange={setPfPeriod} color="#6FCF97" height={90}/>
        </div>
      </section>

      <section style={{padding:"0 20px 14px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
        {[{l:"AAOIFI",v:m.conform,c:T.emerald,s:m.conform>=75?"Halal":"Douteux"},{l:"ESG",v:m.esg,c:T.leaf,s:""},{l:"Divers.",v:m.divers,c:T.doubtful,s:""},{l:"Risque",v:m.risk,c:m.risk>=70?T.emerald:T.doubtful,s:""}].map(s=>(
          <div key={s.l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"11px 9px"}}>
            <p style={{fontSize:9,color:T.textMuted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.l}</p>
            <p style={{fontSize:16,fontWeight:800,color:s.c,marginBottom:s.s?2:5,fontFamily:"'Cabinet Grotesk',sans-serif"}}>{s.v}</p>
            {s.s && <p style={{fontSize:9,color:s.c,fontWeight:700}}>{s.s}</p>}
            <div style={{height:3,background:T.surface2,borderRadius:100}}><div style={{height:"100%",width:`${s.v}%`,background:s.c,borderRadius:100}}/></div>
          </div>
        ))}
      </section>

      {sectorSegs.length > 0 && (
        <section style={{padding:"0 20px 14px"}}>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:18}}>
            <p style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:14}}>Répartition sectorielle</p>
            {sectorSegs.map(seg => (
              <div key={seg.label} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
                <div style={{width:8,height:8,borderRadius:4,background:seg.color,flexShrink:0}}/>
                <span style={{fontSize:12,color:T.textSub,flex:1}}>{seg.label}</span>
                <div style={{width:80,height:4,background:T.surface2,borderRadius:100,overflow:"hidden"}}><div style={{height:"100%",width:`${seg.pct}%`,background:seg.color,borderRadius:100}}/></div>
                <span style={{fontSize:12,fontWeight:700,color:T.text,width:30,textAlign:"right"}}>{seg.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {m.divTot > 0 && (
        <section style={{padding:"0 20px 14px"}}>
          <div style={{background:"linear-gradient(135deg,#FDF8EF,#FDF3E0)",border:`1px solid ${T.gold}30`,borderRadius:16,padding:18}}>
            <p style={{fontSize:13,fontWeight:700,color:T.doubtful,marginBottom:12}}>Purification des dividendes</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
              <div><p style={{fontSize:10,color:T.textMuted,marginBottom:3}}>Dividendes/an</p><p style={{fontSize:13,fontWeight:700,color:T.text}}>{m.divTot.toFixed(2)}€</p></div>
              <div><p style={{fontSize:10,color:T.textMuted,marginBottom:3}}>Part non conforme</p><p style={{fontSize:13,fontWeight:700,color:T.doubtful}}>{m.divTot?(m.divHar/m.divTot*100).toFixed(1):0}%</p></div>
              <div><p style={{fontSize:10,color:T.textMuted,marginBottom:3}}>À purifier</p><p style={{fontSize:13,fontWeight:700,color:T.doubtful}}>{m.divHar.toFixed(2)}€</p></div>
            </div>
            {yearPur > 0 && <p style={{fontSize:12,color:T.emerald,marginBottom:10}}>✓ {yearPur.toFixed(2)}€ purifiés cette année</p>}
            <div style={{display:"flex",gap:8}}>
              <button style={{flex:1,height:40,background:"rgba(176,125,42,0.12)",border:`1px solid ${T.doubtful}30`,borderRadius:10,color:T.doubtful,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}} onClick={()=>{markPurified(m.divHar);toast(`${m.divHar.toFixed(2)}€ marqués purifiés`);}}>Marquer purifié</button>
              <button style={{flex:1,height:40,background:T.halalBg,border:`1px solid ${T.emerald}30`,borderRadius:10,color:T.emerald,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}} onClick={()=>toast("Redirection vers LaunchGood…")}>Donner →</button>
            </div>
          </div>
        </section>
      )}

      <section style={{padding:"0 20px 24px"}}>
        <p style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:3}}>Mes positions</p>
        <p style={{fontSize:11,color:T.textMuted,marginBottom:12}}>{holdings.length} actifs</p>
        {holdings.length === 0 ? (
          <div style={{textAlign:"center",padding:"40px 0",color:T.textMuted}}>
            <p style={{fontSize:32,marginBottom:8}}>📊</p>
            <p style={{fontSize:13}}>Portefeuille vide — faites un screening</p>
          </div>
        ) : holdings.map(h => {
          const gain = (h.price-h.paidPrice)*h.qty;
          const gainPct = ((h.price-h.paidPrice)/h.paidPrice*100).toFixed(1);
          const sl2 = scoreLabel(h.score);
          const divH = calcPurification((h.divAnnual??0)*h.qty, h.divHaramPct??0);
          return (
            <article key={h.ticker} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:14,marginBottom:9}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{width:38,height:38,borderRadius:10,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:T.textSub,flexShrink:0}}>{h.ticker.slice(0,2)}</div>
                  <div><p style={{fontSize:13,fontWeight:700,color:T.text}}>{h.ticker}</p><p style={{fontSize:11,color:T.textMuted}}>{h.qty} action{h.qty>1?"s":""} · PR {h.paidPrice}$</p></div>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontSize:13,fontWeight:700,color:T.text}}>{(h.price*h.qty).toFixed(0)}€</p>
                  <p style={{fontSize:11,fontWeight:700,color:gain>=0?T.emerald:T.haram}}>{gain>=0?"+":""}{gain.toFixed(0)}€ ({gain>=0?"+":""}{gainPct}%)</p>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{background:sl2.bg,color:sl2.color,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:100}}>{sl2.label}</span>
                  <span style={{fontSize:11,color:T.textMuted}}>Score {h.score}/100</span>
                  {divH > 0 && <span style={{fontSize:11,color:T.doubtful}}>Purif. {divH.toFixed(2)}€/an</span>}
                </div>
                <button style={{...BS.microBtn,color:T.haram,borderColor:`${T.haram}22`}} onClick={()=>{remove(h.ticker);toast(`${h.ticker} retiré`,"info");}}>Retirer</button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function WatchlistScreen() {
  const { sorted, toggle } = useWatchlistStore();
  const toast = useToast();
  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease"}}>
      <header style={BS.pageHeader}><h1 style={BS.pageTitle}>Watchlist</h1></header>
      <section style={{padding:"0 20px 24px"}}>
        {sorted().length === 0 ? (
          <div style={{textAlign:"center",padding:"60px 0",color:T.textMuted}}>
            <p style={{fontSize:32,marginBottom:10}}>🔖</p>
            <p style={{fontSize:14,fontWeight:700,color:T.textSub}}>Aucune action suivie</p>
            <p style={{fontSize:12,marginTop:4}}>Faites un screening et ajoutez des actions</p>
          </div>
        ) : sorted().map(s => {
          const sl2 = scoreLabel(s.score);
          return (
            <div key={s.ticker} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:14,marginBottom:9}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{display:"flex",gap:9,alignItems:"center"}}>
                  <div style={{width:36,height:36,borderRadius:9,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:T.textSub}}>{s.ticker.slice(0,2)}</div>
                  <div><p style={{fontSize:13,fontWeight:700,color:T.text}}>{s.ticker}</p><p style={{fontSize:11,color:T.textMuted}}>{s.name}</p></div>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontSize:14,fontWeight:800,color:T.text,fontFamily:"'DM Serif Display',serif"}}>{s.price}$</p>
                  <span style={{background:sl2.bg,color:sl2.color,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:100}}>Score {s.score} — {sl2.label}</span>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <button style={{...BS.microBtn,color:T.haram,borderColor:`${T.haram}22`,fontSize:11}} onClick={()=>{toggle(s);toast(`${s.ticker} retiré`,"info");}}>Retirer</button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function ProfileScreen() {
  const { isPremium, screenings, setIsPremium } = useUserStore();
  const { purified } = usePortfolioStore();
  const toast = useToast();
  const [showUp, setShowUp]     = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const purTotal = useMemo(()=>purified.reduce((s,p)=>s+p.amount,0),[purified]);
  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:80,animation:"screenIn .28s ease"}}>
      <div style={{padding:"52px 20px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <PurLogo size={36}/>
          {isPremium && <span style={{background:T.halalBg,color:T.emerald,fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:100}}>Premium actif</span>}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:16}}>
            <p style={{fontSize:10,color:T.textMuted,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>Screenings</p>
            <p style={{fontSize:22,fontWeight:800,color:T.text,fontFamily:"'Cabinet Grotesk',sans-serif"}}>{screenings}</p>
          </div>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:16}}>
            <p style={{fontSize:10,color:T.textMuted,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>Purifiés</p>
            <p style={{fontSize:22,fontWeight:800,color:T.doubtful,fontFamily:"'Cabinet Grotesk',sans-serif"}}>{purTotal.toFixed(2)}€</p>
          </div>
        </div>

        {!isPremium && (
          <button onClick={()=>setShowUp(true)} style={{width:"100%",background:T.forest,borderRadius:16,padding:20,marginBottom:16,cursor:"pointer",textAlign:"left",fontFamily:"inherit",border:"none"}}>
            <p style={{fontSize:16,fontWeight:800,color:"#E8F0EB",marginBottom:5}}>Passer à PUR Premium</p>
            <p style={{fontSize:12,color:"rgba(232,240,235,0.6)",marginBottom:14,lineHeight:1.6}}>Screenings illimités · Rapports complets · ETF islamiques</p>
            <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:12}}>
              <span style={{fontFamily:"'DM Serif Display',serif",fontSize:24,color:"#E8F0EB"}}>{SUBSCRIPTION.PRICE_EUR}€</span>
              <span style={{fontSize:12,color:"rgba(232,240,235,0.5)"}}>/ mois · {SUBSCRIPTION.TRIAL_DAYS} jours gratuits</span>
            </div>
            <div style={{background:"#E8F0EB",borderRadius:10,padding:"11px",textAlign:"center",fontSize:13,fontWeight:700,color:T.forest}}>Commencer gratuitement</div>
          </button>
        )}

        <button onClick={()=>setShowAuth(true)} style={{width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:16,marginBottom:12,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit",textAlign:"left"}}>
          <div style={{display:"flex",gap:11,alignItems:"center"}}><span style={{fontSize:16}}>🔐</span><span style={{fontSize:13,color:T.text}}>Se connecter / Créer un compte</span></div>
          <span style={{color:T.textMuted}}>›</span>
        </button>

        {[{icon:"🌿",label:"Standard "+AAOIFI_RULES.VERSION},{icon:"🌙",label:"Purification dividendes"},{icon:"💬",label:"Support"}].map(item=>(
          <button key={item.label} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderTop:"none",borderLeft:"none",borderRight:"none",borderBottom:`1px solid ${T.border}`,cursor:"pointer",background:"none",fontFamily:"inherit",textAlign:"left"}}>
            <div style={{display:"flex",gap:11,alignItems:"center"}}><span style={{fontSize:16}}>{item.icon}</span><span style={{fontSize:13,color:T.text}}>{item.label}</span></div>
            <span style={{color:T.textMuted}}>›</span>
          </button>
        ))}

        {isPremium && <button style={{...BS.btnGhost,width:"100%",marginTop:18,color:T.haram,borderColor:`${T.haram}20`}} onClick={()=>{setIsPremium(false);toast("Abonnement annulé","info");}}>Annuler l'abonnement</button>}
      </div>
      {showUp   && <UpgradeModal onClose={()=>setShowUp(false)}/>}
      {showAuth && <AuthModal   onClose={()=>setShowAuth(false)}/>}
    </div>
  );
}

// ── Base Styles ──────────────────────────────────────────────────
const BS = {
  pageHeader: {padding:"52px 20px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"} as React.CSSProperties,
  pageTitle:  {fontSize:22,fontWeight:800,color:T.text,fontFamily:"'Cabinet Grotesk',sans-serif",letterSpacing:"-.5px"} as React.CSSProperties,
  input:      {flex:1,height:50,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"0 15px",fontSize:14,outline:"none",background:T.surface,color:T.text,fontFamily:"inherit",transition:"border-color .2s"} as React.CSSProperties,
  iconBtn:    {width:44,height:44,borderRadius:12,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"} as React.CSSProperties,
  btnPrimary: {width:"100%",height:50,background:T.forest,border:"none",borderRadius:13,color:"#E8F0EB",fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer"} as React.CSSProperties,
  btnGhost:   {height:44,background:"none",border:`1px solid ${T.border}`,borderRadius:11,color:T.textSub,fontFamily:"inherit",fontWeight:600,fontSize:13,cursor:"pointer"} as React.CSSProperties,
  microBtn:   {height:30,padding:"0 11px",background:"none",border:"1px solid",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"} as React.CSSProperties,
  segCtrl:    {display:"flex",background:T.surface2,borderRadius:11,padding:3} as React.CSSProperties,
  seg:        {flex:1,height:34,background:"none",border:"none",borderRadius:9,color:T.textSub,fontFamily:"inherit",fontWeight:600,fontSize:13,cursor:"pointer",transition:"all .15s"} as React.CSSProperties,
  segActive:  {background:T.surface,color:T.text,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"} as React.CSSProperties,
};

const TABS = [
  {id:"home",      icon:"⊞", label:"Accueil"},
  {id:"screen",    icon:"🔍", label:"Screening"},
  {id:"portfolio", icon:"📊", label:"Portefeuille"},
  {id:"watchlist", icon:"🔖", label:"Watchlist"},
  {id:"profile",   icon:"👤", label:"Profil"},
];

export default function App() {
  const [phase, setPhase]       = useState<"splash"|"app">("splash");
  const [splashOut, setSplashOut] = useState(false);
  const [tab, setTab]           = useState("home");
  const [reportTicker, setReportTicker] = useState<string|null>(null);

  useEffect(() => {
    const t1 = setTimeout(()=>setSplashOut(true), 1600);
    const t2 = setTimeout(()=>setPhase("app"),    1950);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const openReport  = useCallback((t:string)=>setReportTicker(t), []);
  const closeReport = useCallback(()=>setReportTicker(null), []);

  return (
    <ToastProvider>
      <div style={{minHeight:"100vh",background:T.bg,display:"flex",justifyContent:"center"}}>
        <div style={{width:"100%",maxWidth:430,minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>

          {phase==="splash" && (
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,animation:splashOut?"fadeOut .35s ease forwards":"none"}}>
              <div style={{animation:"fadeUp .5s ease forwards",opacity:0,textAlign:"center"}}>
                <div style={{width:88,height:88,borderRadius:26,background:T.forest,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",boxShadow:"0 20px 60px rgba(26,58,42,0.25)"}}>
                  <svg width="44" height="44" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10.5L8.5 15L16 6" stroke="#E8F0EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="10" cy="10" r="8.5" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
                  </svg>
                </div>
                <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:36,fontWeight:800,color:T.text,letterSpacing:"-1px"}}>PUR</div>
                <p style={{fontSize:12,color:T.textMuted,marginTop:6,letterSpacing:"0.06em"}}>{AAOIFI_RULES.VERSION} · Finance islamique</p>
              </div>
              <div style={{display:"flex",gap:6,animation:"fadeUp .5s .25s ease forwards",opacity:0}}>
                {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:2.5,background:T.emerald,animation:`blink 1.2s ${i*.2}s ease-in-out infinite alternate`}}/>)}
              </div>
            </div>
          )}

          {phase==="app" && (
            <>
              {reportTicker && (
                <div style={{position:"fixed",inset:0,background:T.bg,zIndex:200,display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto",overflowY:"auto"}}>
                  <div style={{padding:"52px 20px 20px"}}>
                    <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16}}>
                      <button onClick={closeReport} style={{width:38,height:38,borderRadius:11,background:T.surface,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,cursor:"pointer",color:T.text}}>←</button>
                      <div>
                        <h1 style={{fontSize:18,fontWeight:800,color:T.text,fontFamily:"'Cabinet Grotesk',sans-serif"}}>{reportTicker}</h1>
                        <p style={{fontSize:11,color:T.textMuted}}>Rapport de conformité complet</p>
                      </div>
                    </div>
                    <StockCard ticker={reportTicker} onReport={()=>{}}/>
                  </div>
                </div>
              )}
              {!reportTicker && (
                <>
                  {tab==="home"      && <HomeScreen      setTab={setTab} openReport={openReport}/>}
                  {tab==="screen"    && <ScreeningScreen openReport={openReport}/>}
                  {tab==="portfolio" && <PortfolioScreen setTab={setTab}/>}
                  {tab==="watchlist" && <WatchlistScreen/>}
                  {tab==="profile"   && <ProfileScreen/>}

                  <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:T.surface,borderTop:`1px solid ${T.border}`,display:"flex",padding:"8px 0 24px",zIndex:100}}>
                    {TABS.map(t => (
                      <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"6px 0",fontFamily:"inherit"}}>
                        <span style={{fontSize:18,filter:tab===t.id?"none":"grayscale(1) opacity(0.3)",transition:"filter .2s"}}>{t.icon}</span>
                        <span style={{fontSize:10,fontWeight:tab===t.id?700:400,color:tab===t.id?T.emerald:T.textMuted}}>{t.label}</span>
                        {tab===t.id && <div style={{width:14,height:2,borderRadius:1,background:T.emerald}}/>}
                      </button>
                    ))}
                  </nav>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </ToastProvider>
  );
}
APPEOF

echo ""
echo "✅ PUR — Rebrand + Design system appliqué !"
echo ""
echo "Vérifie que tu vois bien :"
echo "  ✓ Nom 'PUR' partout (splash, header, modals)"
echo "  ✓ Logo vert forêt avec checkmark"
echo "  ✓ Fond sable #F7F5F0 (plus de fond noir)"
echo "  ✓ Score 91 = 'Halal ✓' affiché sous le ring"
echo "  ✓ Axe X des graphiques avec heures/jours/mois"
echo "  ✓ Couleurs PUR : vert forêt, emerald, ambre, cramoisi"
echo ""
