"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatedHero } from "@/components/ui/animated-hero";
import { AnimatedGroup } from "@/components/ui/animated-group";
import ShaderBackground from "@/components/ui/shader-background";

// ── PUR Logo ──────────────────────────────────────────────────────────
// SVG has black paths; CSS filter shifts it to forest green (default) or white (light).
// Forest green filter ≈ #1A3A2A:  invert → green hue rotation
// White filter: brightness(0) invert(1)
function PurLogo({ size = 34, light }: { size?: number; light?: boolean }) {
  return (
    <img
      src="/logo-PUR-sans-fond.svg"
      alt="PUR logo"
      width={size}
      height={size}
      style={{
        display: "block",
        objectFit: "contain",
        filter: light
          ? "brightness(0) invert(1)"
          : "brightness(0) saturate(100%) invert(18%) sepia(28%) saturate(900%) hue-rotate(110deg) brightness(82%) contrast(92%)",
      }}
    />
  );
}

// ── Design Tokens ─────────────────────────────────────────────────────
const C = {
  bg: "#F8F6F1", surface: "#FFFFFF", surface2: "#F2F0EB",
  border: "rgba(0,0,0,0.07)", borderMid: "rgba(0,0,0,0.13)",
  forest: "#1A3A2A", forestDark: "#112618", forestMid: "#243F2F",
  emerald: "#208640", leaf: "#4A8C35",
  gold: "#C9A84C", goldBg: "rgba(201,168,76,0.15)",
  text: "#0E1A12", textSub: "#48534C", textMuted: "#8A9490",
  greenBg: "#EAF3DE", amber: "#B07D2A", amberBg: "#FDF3E0",
  red: "#A32D2D", redBg: "#FCEBEB",
};

// ── Responsive CSS ────────────────────────────────────────────────────
const CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{overflow-x:hidden;font-family:'Cabinet Grotesk',system-ui,sans-serif}
  button{font-family:inherit;cursor:pointer}
  .wrap{max-width:1200px;margin:0 auto;padding:0 64px}
  .hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center;padding:100px 0 88px}
  .stats-grid{display:grid;grid-template-columns:repeat(4,1fr)}
  .compare-grid{display:grid;grid-template-columns:1.15fr 1fr;gap:56px;align-items:start}
  .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
  .steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  .price-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:840px;margin:0 auto}
  .testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
  .faq-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 80px}
  .footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px}
  .nav-links{display:flex;gap:32px;align-items:center}
  .section{padding:96px 0}
  .section-sm{padding:72px 0}
  @media(max-width:1024px){
    .wrap{padding:0 32px}
    .hero-grid{grid-template-columns:1fr;gap:48px;padding:72px 0 64px}
    .compare-grid{grid-template-columns:1fr}
    .feat-grid{grid-template-columns:repeat(2,1fr)}
    .faq-grid{grid-template-columns:1fr}
    .footer-grid{grid-template-columns:1fr 1fr;gap:32px}
    .partner-benefits{grid-template-columns:1fr!important}
    .partner-split{grid-template-columns:1fr!important}
  }
  @media(max-width:768px){
    .wrap{padding:0 20px}
    .phone-ctx{display:none!important}
    .nav-links{display:none}
    .stats-grid{grid-template-columns:repeat(2,1fr)}
    .feat-grid{grid-template-columns:1fr}
    .steps-grid{grid-template-columns:1fr}
    .price-grid{grid-template-columns:1fr;max-width:480px}
    .testi-grid{grid-template-columns:1fr}
    .footer-grid{grid-template-columns:1fr}
    .hero-grid{padding:56px 0 48px}
    .section{padding:64px 0}
    .section-sm{padding:48px 0}
  }
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;transition-duration:0.01ms!important}}
`;

// ── SVG Icons ─────────────────────────────────────────────────────────
const Ic = {
  Shield: ({ s = 18, c = "#C8E6C9" }: { s?: number; c?: string }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L4 7v5c0 5 4 9.5 8 11 4-1.5 8-6 8-11V7L12 3z" fill={c} fillOpacity={.18} />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  Search: () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth={2} strokeLinecap="round"><circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" /></svg>,
  Chart: () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth={2} strokeLinecap="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>,
  Portfolio: () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth={2} strokeLinecap="round"><rect x={2} y={7} width={20} height={14} rx={2} /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>,
  Calc: () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth={2} strokeLinecap="round"><rect x={4} y={2} width={16} height={20} rx={2} /><path d="M8 10h8M8 14h4M8 18h2" /><rect x={14} y={13} width={3} height={6} rx={1} /></svg>,
  Bell: () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth={2} strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  Lock: () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth={2} strokeLinecap="round"><rect x={3} y={11} width={18} height={11} rx={2} /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  Check: ({ c = C.emerald }: { c?: string }) => <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.5} strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>,
  X: () => <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth={2} strokeLinecap="round"><line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} /></svg>,
  Arrow: ({ c = "#fff" }: { c?: string }) => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.5} strokeLinecap="round"><line x1={5} y1={12} x2={19} y2={12} /><polyline points="12 5 19 12 12 19" /></svg>,
  Star: () => <svg width={14} height={14} viewBox="0 0 24 24" fill={C.gold} stroke={C.gold} strokeWidth={1}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  TrendUp: () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>,
  Layers: () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
  Activity: () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
};

// ── Small reusables ───────────────────────────────────────────────────
function Pill({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 99,
      padding: "5px 14px", fontSize: 12, fontWeight: 700, letterSpacing: ".04em",
      background: dark ? "rgba(255,255,255,0.1)" : C.greenBg,
      color: dark ? "#A8D5A2" : C.emerald,
      border: dark ? "1px solid rgba(255,255,255,0.12)" : "none",
    }}>{children}</span>
  );
}

function Eyebrow({ text, dark }: { text: string; dark?: boolean }) {
  return <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: dark ? "#7BBE8A" : C.textMuted, marginBottom: 14 }}>{text}</p>;
}

function Btn({ label, onClick, variant = "primary", full }: { label: string; onClick: () => void; variant?: "primary" | "ghost" | "outline-dark"; full?: boolean }) {
  const [h, setH] = useState(false);
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: h ? C.leaf : C.emerald, color: "#fff", border: "none", boxShadow: h ? "0 8px 32px rgba(32,134,64,.45)" : "0 4px 18px rgba(32,134,64,.3)" },
    ghost: { background: h ? C.surface2 : C.surface, color: C.text, border: `1.5px solid ${C.borderMid}` },
    "outline-dark": { background: h ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.2)" },
  };
  return (
    <button onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick}
      style={{ ...styles[variant], borderRadius: 14, padding: "14px 26px", fontWeight: 700, fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8, transition: "all 180ms ease", transform: h ? "translateY(-1px)" : "none", width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined }}>
      {label}{variant === "primary" && <Ic.Arrow />}
    </button>
  );
}

// ── Data viz: Compliance bar chart ────────────────────────────────────
const STOCKS = [
  { t: "NOVO", n: "Novo Nordisk", s: 93, sec: "Santé" },
  { t: "AAPL", n: "Apple", s: 91, sec: "Tech" },
  { t: "MSFT", n: "Microsoft", s: 87, sec: "Tech" },
  { t: "NKE",  n: "Nike", s: 84, sec: "Sport" },
  { t: "AMZN", n: "Amazon", s: 71, sec: "E-comm" },
  { t: "TSLA", n: "Tesla", s: 58, sec: "Auto" },
  { t: "META", n: "Meta", s: 31, sec: "Tech" },
  { t: "JPM",  n: "JP Morgan", s: 12, sec: "Finance" },
];

function ComplianceChart() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 4 }}>
        {[["Conforme (≥75)", C.emerald], ["Douteux (40–74)", C.amber], ["Non conforme (<40)", C.red]].map(([l, c]) => (
          <div key={l as string} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: c as string }} />
            <span style={{ fontSize: 11, color: C.textMuted }}>{l}</span>
          </div>
        ))}
      </div>
      {STOCKS.map(({ t, n, s }) => {
        const col = s >= 75 ? C.emerald : s >= 40 ? C.amber : C.red;
        const bgCol = s >= 75 ? C.greenBg : s >= 40 ? C.amberBg : C.redBg;
        const label = s >= 75 ? "Conforme" : s >= 40 ? "Douteux" : "Non conforme";
        return (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 44, fontSize: 11, fontWeight: 700, color: C.textMuted, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{t}</span>
            <div style={{ flex: 1, height: 32, background: C.surface2, borderRadius: 8, overflow: "hidden", position: "relative" }}>
              <div style={{ width: `${s}%`, height: "100%", background: `linear-gradient(90deg,${col}30,${col}90)`, borderRadius: 8, display: "flex", alignItems: "center", paddingLeft: 10, transition: "width 1.2s cubic-bezier(.16,1,.3,1)" }}>
                <span style={{ fontSize: 11, color: C.text, fontWeight: 600, whiteSpace: "nowrap", opacity: s > 25 ? 1 : 0 }}>{n}</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: col, width: 26, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{s}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: col, background: bgCol, padding: "2px 8px", borderRadius: 99, width: 86, textAlign: "center" }}>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Data viz: AAOIFI criteria breakdown ───────────────────────────────
function CriteriaBreakdown() {
  const criteria = [
    { label: "Ratio d'endettement", value: 12, threshold: 33, unit: "%" },
    { label: "Revenus non-conformes", value: 0.3, threshold: 5, unit: "%" },
    { label: "Ratio de trésorerie", value: 28, threshold: 33, unit: "%" },
  ];
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: "28px 24px", boxShadow: "0 4px 32px rgba(0,0,0,0.06)" }}>
      {/* Stock header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: C.textSub }}>AAPL</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Apple Inc.</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>NASDAQ · Tech · 260,50 $</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.emerald, lineHeight: 1 }}>91</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Score</div>
        </div>
      </div>
      {/* Criteria bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {criteria.map(({ label, value, threshold, unit }) => {
          const pct = Math.min((value / threshold) * 100, 100);
          const pass = value <= threshold;
          return (
            <div key={label}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>{value}{unit} <span style={{ color: C.textMuted }}>/ {threshold}{unit}</span></span>
                  <div style={{ width: 18, height: 18, borderRadius: 99, background: pass ? C.greenBg : C.redBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {pass ? <Ic.Check c={C.emerald} /> : <Ic.X />}
                  </div>
                </div>
              </div>
              <div style={{ height: 8, background: C.surface2, borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: pass ? C.emerald : C.red, borderRadius: 99, transition: "width 1s ease" }} />
              </div>
            </div>
          );
        })}
      </div>
      {/* Result */}
      <div style={{ marginTop: 22, padding: "14px 16px", background: C.greenBg, borderRadius: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <Ic.Shield c={C.emerald} s={20} />
        <span style={{ fontWeight: 700, fontSize: 14, color: C.emerald }}>Conforme aux standards AAOIFI</span>
      </div>
    </div>
  );
}

// ── Phone Mockup — iPhone-style screening result for AAPL ─────────────
function PhoneMockup() {
  const score = 91;
  const criteria = [
    { l: "Endettement", v: 12, thr: 33 },
    { l: "Revenus NC", v: 0.3, thr: 5 },
    { l: "Trésorerie", v: 28, thr: 33 },
  ];

  return (
    <div style={{
      width: 300,
      background: "#101010",
      borderRadius: 54,
      padding: "10px 7px 6px",
      boxShadow: "0 56px 120px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07), inset 0 0 0 1px rgba(255,255,255,0.04)",
      position: "relative",
      flexShrink: 0,
    }}>
      {/* Dynamic island */}
      <div style={{ height: 32, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
        <div style={{ width: 118, height: 28, background: "#000", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#1C1C1E" }} />
          <div style={{ width: 32, height: 10, borderRadius: 6, background: "#1C1C1E" }} />
        </div>
      </div>

      {/* Screen */}
      <div style={{ background: C.bg, borderRadius: 46, overflow: "hidden", height: 596 }}>
        {/* Status bar */}
        <div style={{ height: 30, background: C.surface, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.text, fontVariantNumeric: "tabular-nums" }}>9:41</span>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <svg width={14} height={10} viewBox="0 0 14 10"><rect x={0} y={3} width={3} height={7} rx={0.5} fill={C.text} /><rect x={4} y={2} width={3} height={8} rx={0.5} fill={C.text} /><rect x={8} y={0.5} width={3} height={9.5} rx={0.5} fill={C.text} /><rect x={12} y={0} width={2} height={10} rx={0.5} fill={C.textMuted} opacity={0.4} /></svg>
            <svg width={16} height={10} viewBox="0 0 16 10"><rect x={0} y={1} width={14} height={8} rx={2} stroke={C.text} strokeWidth={1.2} fill="none" /><rect x={14.5} y={3.5} width={1} height={3} rx={0.5} fill={C.text} /><rect x={1.2} y={2.2} width={9} height={5.6} rx={1} fill={C.emerald} /></svg>
          </div>
        </div>

        {/* App header */}
        <div style={{ background: C.surface, padding: "10px 16px 11px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth={2.5} strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, letterSpacing: ".04em" }}>Analyse</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>Apple Inc.</div>
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, background: C.surface2, borderRadius: 8, padding: "4px 9px" }}>AAPL</span>
        </div>

        {/* Price row */}
        <div style={{ padding: "12px 16px 10px", background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-.02em" }}>260,50 $</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.emerald, background: C.greenBg, borderRadius: 8, padding: "3px 10px" }}>+1,59 %</span>
        </div>

        {/* Score section */}
        <div style={{ padding: "18px 16px 16px", textAlign: "center", background: C.bg }}>
          <div style={{
            width: 90, height: 90, borderRadius: "50%",
            background: C.surface,
            border: `3px solid ${C.emerald}`,
            boxShadow: `0 0 0 6px ${C.greenBg}`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
          }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: C.emerald, lineHeight: 1, letterSpacing: "-.03em" }}>{score}</div>
            <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 600 }}>/ 100</div>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.greenBg, borderRadius: 10, padding: "7px 14px" }}>
            <Ic.Shield c={C.emerald} s={14} />
            <span style={{ fontSize: 12, fontWeight: 800, color: C.emerald }}>Conforme aux standards AAOIFI</span>
          </div>
        </div>

        {/* Criteria */}
        <div style={{ margin: "0 12px 10px", background: C.surface, borderRadius: 16, padding: "14px 14px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: C.textMuted, marginBottom: 13 }}>Critères AAOIFI</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {criteria.map(({ l, v, thr }) => {
              const pass = v <= thr;
              const pct = Math.min((v / thr) * 100, 100);
              return (
                <div key={l}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{l}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 10, color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>{v}% / {thr}%</span>
                      <div style={{ width: 14, height: 14, borderRadius: 99, background: pass ? C.greenBg : C.redBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {pass ? <Ic.Check c={C.emerald} /> : <Ic.X />}
                      </div>
                    </div>
                  </div>
                  <div style={{ height: 5, background: C.surface2, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: pass ? C.emerald : C.red, borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add to portfolio CTA */}
        <div style={{ padding: "0 12px 10px" }}>
          <div style={{ background: C.emerald, borderRadius: 13, padding: "13px", textAlign: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>
            Ajouter au portefeuille
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ height: 52, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 8px" }}>
          {[
            <svg key="home" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth={2} strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
            <svg key="search" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth={2} strokeLinecap="round"><circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" /></svg>,
            <svg key="portfolio" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth={2} strokeLinecap="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>,
            <svg key="bell" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth={2} strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
            <svg key="user" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth={2} strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx={12} cy={7} r={4} /></svg>,
          ].map((icon, i) => (
            <div key={i} style={{ padding: "6px 10px" }}>{icon}</div>
          ))}
        </div>
      </div>

      {/* Home indicator */}
      <div style={{ height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 100, height: 5, background: "rgba(255,255,255,0.2)", borderRadius: 3 }} />
      </div>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────
function FeatCard({ icon, title, desc, badge }: { icon: React.ReactNode; title: string; desc: string; badge?: string }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      background: C.surface, border: `1px solid ${h ? C.borderMid : C.border}`, borderRadius: 20,
      padding: "24px 22px", transition: "all 200ms ease",
      transform: h ? "translateY(-3px)" : "none",
      boxShadow: h ? "0 12px 40px rgba(0,0,0,0.08)" : "0 2px 8px rgba(0,0,0,0.03)",
      position: "relative", overflow: "hidden",
    }}>
      {badge && (
        <span style={{ position: "absolute", top: 14, right: 14, background: C.goldBg, color: C.amber, borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 800, letterSpacing: ".04em" }}>{badge}</span>
      )}
      <div style={{ width: 44, height: 44, borderRadius: 13, background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: C.textSub, lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

// ── Pricing card ──────────────────────────────────────────────────────
function PriceCard({ plan, price, sub, savingNote, tag, features, cta, dark, onCta }: { plan: string; price: string; sub: string; savingNote?: string; tag?: string; features: { ok: boolean; label: string }[]; cta: string; dark?: boolean; onCta: () => void }) {
  const [h, setH] = useState(false);
  return (
    <div style={{ background: dark ? C.forest : C.surface, border: `1.5px solid ${dark ? C.emerald : C.border}`, borderRadius: 24, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 24, position: "relative", overflow: "hidden" }}>
      {dark && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${C.emerald},${C.leaf})` }} />}
      {tag && <span style={{ position: "absolute", top: 20, right: 20, background: C.gold, color: C.forest, borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>{tag}</span>}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: dark ? "#7BBE8A" : C.textMuted, marginBottom: 10 }}>{plan}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 40, fontWeight: 800, color: dark ? "#fff" : C.text, letterSpacing: "-.02em" }}>{price}</span>
          {sub && <span style={{ fontSize: 14, color: dark ? "#7BBE8A" : C.textMuted }}>{sub}</span>}
        </div>
        {savingNote && <div style={{ fontSize: 12, color: dark ? "#A8D5A2" : C.textMuted, marginTop: 4 }}>{savingNote}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 20, height: 20, borderRadius: 99, background: f.ok ? (dark ? "rgba(32,134,64,.25)" : C.greenBg) : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {f.ok ? <Ic.Check c={dark ? "#8AE0A2" : C.emerald} /> : <Ic.X />}
            </div>
            <span style={{ fontSize: 14, color: dark ? (f.ok ? "#D4EED4" : "#5A7A5A") : (f.ok ? C.text : C.textMuted) }}>{f.label}</span>
          </div>
        ))}
      </div>
      <button onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onCta}
        style={{ marginTop: "auto", background: dark ? C.emerald : C.surface2, color: dark ? "#fff" : C.text, border: dark ? "none" : `1.5px solid ${C.borderMid}`, borderRadius: 14, padding: "15px 20px", fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 170ms ease", transform: h ? "scale(1.02)" : "scale(1)", boxShadow: dark && h ? "0 6px 24px rgba(32,134,64,.4)" : "none" }}>
        {cta}{dark && <Ic.Arrow />}
      </button>
    </div>
  );
}

// ── FAQ item ──────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ width: "100%", background: "none", border: "none", padding: "20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, textAlign: "left", minHeight: 60 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: C.text, lineHeight: 1.4 }}>{q}</span>
        <div style={{ width: 28, height: 28, borderRadius: 99, background: open ? C.greenBg : C.surface2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 220ms ease", transform: open ? "rotate(45deg)" : "none" }}>
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none"><line x1={6} y1={1} x2={6} y2={11} stroke={open ? C.emerald : C.textSub} strokeWidth={2} strokeLinecap="round" /><line x1={1} y1={6} x2={11} y2={6} stroke={open ? C.emerald : C.textSub} strokeWidth={2} strokeLinecap="round" /></svg>
        </div>
      </button>
      {open && <div style={{ paddingBottom: 20, fontSize: 14, color: C.textSub, lineHeight: 1.7, animation: "fadeUp .18s ease" }}>{a}</div>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const toApp = () => router.push("/app");
  const [isScrolled, setIsScrolled] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div style={{ background: C.bg, minHeight: "100dvh", color: C.text }}>

        {/* ── NAVBAR ─────────────────────────────── */}
        <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "0 8px", transition: "all 300ms ease" }}>
          <div style={{
            maxWidth: isScrolled ? 900 : 1200,
            margin: "0 auto",
            marginTop: isScrolled ? 8 : 0,
            background: isScrolled ? "rgba(248,246,241,0.96)" : "rgba(248,246,241,0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: isScrolled ? "none" : `1px solid ${C.border}`,
            border: isScrolled ? `1px solid ${C.borderMid}` : `0px solid transparent`,
            borderRadius: isScrolled ? 20 : 0,
            boxShadow: isScrolled ? "0 4px 32px rgba(0,0,0,0.08)" : "none",
            transition: "all 300ms cubic-bezier(0.4,0,0.2,1)",
            padding: isScrolled ? "0 24px" : "0 64px",
          }}>
            <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                style={{ fontWeight: 900, fontSize: 20, color: C.forest, letterSpacing: "-.02em", cursor: "pointer" }}
              >PUR</span>
              <nav className="nav-links">
                {["Fonctionnalités", "Données", "Tarifs", "Partenaire", "FAQ"].map(l => (
                  <a key={l} onClick={() => document.getElementById(l.toLowerCase())?.scrollIntoView({ behavior: "smooth" })}
                    style={{ fontSize: 14, fontWeight: 600, color: C.textSub, cursor: "pointer", transition: "color 150ms" }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = C.textSub)}>{l}</a>
                ))}
              </nav>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn label="Connexion" onClick={toApp} variant="ghost" />
                <Btn label="Essai gratuit" onClick={toApp} variant="primary" />
              </div>
            </div>
          </div>
        </header>
        {/* Spacer so content doesn't hide under fixed navbar */}
        <div style={{ height: 64 }} />

        {/* ── HERO — Animated Hero + ContainerScroll ─ */}
        <section style={{ background: C.forestDark }}>

          {/* 1. AnimatedHero — plain dark bg, no shader */}
          <div style={{ overflow: "hidden" }}>
            <AnimatedHero
              onAppStore={() => alert("App Store — bientôt disponible !")}
              onPlayStore={() => alert("Google Play — bientôt disponible !")}
              onScrollToDemo={() => document.getElementById("données")?.scrollIntoView({ behavior: "smooth" })}
            />
          </div>

          {/* 2. App preview — shader lives here, behind the card */}
          <div style={{ position: "relative", overflow: "hidden", padding: "48px 64px 80px" }}>
            {/* Shader fills the preview section */}
            <ShaderBackground style={{ zIndex: 0 }} />
            {/* Dark gradient overlay so shader blends with forest theme */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(17,38,24,0.55), rgba(10,24,16,0.72))", zIndex: 1, pointerEvents: "none" }} />

            {/* Content sits above shader */}
            <div style={{ position: "relative", zIndex: 2 }}>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(168,213,162,0.7)", marginBottom: 10 }}>
                  Aperçu de l'application
                </p>
                <p style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(24px,3vw,38px)", fontWeight: 400, color: "#FFFFFF", lineHeight: 1.2 }}>
                  Screenez, analysez,{" "}
                  <em style={{ color: "#7BE8A2" }}>investissez.</em>
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 32 }}>
                {/* Left context card */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 80, minWidth: 200 }} className="phone-ctx">
                  {[
                    { icon: <Ic.Shield c={C.emerald} s={18} />, label: "Score", value: "91 / 100", sub: "Apple Inc." },
                    { icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth={2} strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>, label: "Portefeuille", value: "+38,4 %", sub: "12 mois" },
                  ].map(({ icon, label, value, sub }) => (
                    <div key={label} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, padding: "16px 18px", backdropFilter: "blur(12px)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>{icon}<span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: ".04em", textTransform: "uppercase" }}>{label}</span></div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-.01em" }}>{value}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Phone */}
                <PhoneMockup />

                {/* Right context card */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 80, minWidth: 200 }} className="phone-ctx">
                  {[
                    { label: "Endettement", value: "12%", max: "33%", pass: true },
                    { label: "Revenus NC", value: "0,3%", max: "5%", pass: true },
                    { label: "Trésorerie", value: "28%", max: "33%", pass: true },
                  ].map(({ label, value, max, pass }) => (
                    <div key={label} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, padding: "14px 16px", backdropFilter: "blur(12px)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: ".03em" }}>{label}</span>
                        <div style={{ width: 16, height: 16, borderRadius: 99, background: pass ? "rgba(32,134,64,0.3)" : "rgba(163,45,45,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic.Check c="#6BCB77" /></div>
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "#7BE8A2" }}>{value} <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>/ {max}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </section>

        {/* ── STATS BAND ───────────────────────────── */}
        <section style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
          <div className="wrap">
            <AnimatedGroup preset="blur-slide" stagger={0.12}>
              <div className="stats-grid">
                {[["2 400+", "Actions & ETF analysés"], ["98 %", "Précision AAOIFI"], ["< 1 s", "Résultat en temps réel"], ["3 critères", "Vérifiés automatiquement"]].map(([v, l], i, arr) => (
                  <div key={l} style={{ padding: "36px 24px", textAlign: "center", borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: C.emerald, letterSpacing: "-.02em" }}>{v}</div>
                    <div style={{ fontSize: 13, color: C.textSub, marginTop: 5 }}>{l}</div>
                  </div>
                ))}
              </div>
            </AnimatedGroup>
          </div>
        </section>

        {/* ── DATA COMPARISON ──────────────────────── */}
        <section id="données" className="section">
          <div className="wrap">
            <AnimatedGroup preset="blur-slide" stagger={0.1} style={{ textAlign: "center", marginBottom: 56 }}>
              <Eyebrow text="Analyse en temps réel" />
              <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 400, color: C.text, lineHeight: 1.15 }}>
                Conforme ou non — en un coup d'œil
              </h2>
              <p style={{ fontSize: 16, color: C.textSub, marginTop: 14, maxWidth: 560, margin: "14px auto 0" }}>
                PUR analyse les bilans financiers en temps réel et classe chaque action selon les 3 critères AAOIFI.
              </p>
            </AnimatedGroup>
            <AnimatedGroup preset="blur-slide" stagger={0.14}>
              <div className="compare-grid">
                {/* Bar chart */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: "28px 28px", boxShadow: "0 4px 32px rgba(0,0,0,0.05)" }}>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: 17, color: C.text }}>Score de conformité</div>
                    <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>8 actions populaires · Trié par score</div>
                  </div>
                  <ComplianceChart />
                </div>
                {/* Criteria breakdown */}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: C.text, marginBottom: 6 }}>Détail AAOIFI par action</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>Les 3 ratios vérifiés pour chaque titre</div>
                  <CriteriaBreakdown />
                  <div style={{ marginTop: 16, padding: "16px 18px", background: C.surface2, borderRadius: 14, fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
                    <strong style={{ color: C.text }}>Pourquoi l'AAOIFI ?</strong><br />
                    L'AAOIFI (Accounting and Auditing Organization for Islamic Financial Institutions) définit les standards de référence mondiaux pour la finance islamique.
                  </div>
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────── */}
        <section id="fonctionnalités" className="section" style={{ background: C.surface }}>
          <div className="wrap">
            <AnimatedGroup preset="blur-slide" stagger={0.08} style={{ textAlign: "center", marginBottom: 56 }}>
              <Eyebrow text="Fonctionnalités" />
              <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 400, color: C.text }}>
                Tout ce dont vous avez besoin
              </h2>
            </AnimatedGroup>
            <AnimatedGroup preset="blur-slide" stagger={0.12}>
              <div className="feat-grid">
                <FeatCard icon={<Ic.Search />} title="Analyse AAOIFI instantanée" desc="Ratio dette, revenus non-conformes et trésorerie. Les 3 critères vérifiés en moins d'une seconde pour chaque action." />
                <FeatCard icon={<Ic.Portfolio />} title="Portefeuille conforme" desc="Construisez et suivez un portefeuille 100 % conforme. Valeur, performance et diversification sectorielle en temps réel." />
                <FeatCard icon={<Ic.Calc />} title="Calcul de purification" desc="Calculez automatiquement le montant à reverser en charité pour purifier vos revenus issus de titres douteux." />
              </div>
            </AnimatedGroup>
          </div>
        </section>

        {/* ── PRICING ──────────────────────────────── */}
        <section id="tarifs" className="section" style={{ background: C.surface }}>
          <div className="wrap">
            <AnimatedGroup preset="blur-slide" stagger={0.08} style={{ textAlign: "center", marginBottom: 40 }}>
              <Eyebrow text="Tarification" />
              <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 400, color: C.text }}>Simple et transparent</h2>
              <p style={{ fontSize: 15, color: C.textSub, marginTop: 12 }}>14 jours d'essai gratuit. Sans engagement.</p>
            </AnimatedGroup>

            {/* Billing toggle */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 44 }}>
              <div style={{ display: "inline-flex", alignItems: "center", background: C.surface2, borderRadius: 99, padding: 4, gap: 2 }}>
                <button onClick={() => setBilling("monthly")} style={{ borderRadius: 99, padding: "9px 22px", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", transition: "all 180ms ease", background: billing === "monthly" ? C.surface : "transparent", color: billing === "monthly" ? C.text : C.textMuted, boxShadow: billing === "monthly" ? "0 2px 10px rgba(0,0,0,0.1)" : "none" }}>
                  Mensuel
                </button>
                <button onClick={() => setBilling("annual")} style={{ borderRadius: 99, padding: "9px 22px", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", transition: "all 180ms ease", background: billing === "annual" ? C.surface : "transparent", color: billing === "annual" ? C.text : C.textMuted, boxShadow: billing === "annual" ? "0 2px 10px rgba(0,0,0,0.1)" : "none", display: "flex", alignItems: "center", gap: 8 }}>
                  Annuel
                  <span style={{ background: C.goldBg, color: C.amber, borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: ".03em" }}>−25 %</span>
                </button>
              </div>
            </div>

            <AnimatedGroup preset="blur-slide" stagger={0.16}>
              <div style={{ maxWidth: 480, margin: "0 auto" }}>
                <PriceCard
                  plan="Premium"
                  price={billing === "monthly" ? "9,99 €" : "7,49 €"}
                  sub="/ mois"
                  savingNote={billing === "annual" ? "Facturé 89,88 € / an — économisez 29,99 €" : undefined}
                  tag={billing === "annual" ? "Recommandé" : undefined}
                  features={[
                    { ok: true, label: "Analyses illimitées" },
                    { ok: true, label: "Score de conformité avancé" },
                    { ok: true, label: "Portefeuille conforme complet" },
                    { ok: true, label: "Calcul de purification" },
                    { ok: true, label: "Alertes de conformité" },
                    { ok: true, label: "Analyse fondamentale complète" },
                  ]}
                  cta="Essai gratuit 14 jours"
                  dark
                  onCta={toApp}
                />
              </div>
            </AnimatedGroup>

            {/* Assurance client */}
            <div style={{ maxWidth: 480, margin: "20px auto 0", background: C.surface2, borderRadius: 16, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L4 7v5c0 5 4 9.5 8 11 4-1.5 8-6 8-11V7L12 3z" /><polyline points="9 12 11 14 15 10" /></svg>
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 2 }}>Tarif garanti à vie</div>
                  <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.55 }}>Tant que votre abonnement reste actif, votre tarif ne changera jamais — même si nous augmentons nos prix.</div>
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth={2} strokeLinecap="round"><rect x={3} y={11} width={18} height={11} rx={2} /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <span style={{ fontSize: 12, color: C.textMuted }}>Paiements sécurisés par Stripe · Visa, Mastercard, CB · Résiliation en un clic depuis votre compte</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ─────────────────────────── */}
        <section className="section">
          <div className="wrap">
            <AnimatedGroup preset="blur-slide" stagger={0.08} style={{ textAlign: "center", marginBottom: 48 }}>
              <Eyebrow text="Témoignages" />
              <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 400, color: C.text }}>Ils nous font confiance</h2>
            </AnimatedGroup>
            <AnimatedGroup preset="blur-slide" stagger={0.14}>
              <div className="testi-grid">
                {[
                  { n: "Yassine B.", c: "Paris · Investisseur", q: "Enfin un outil sérieux qui applique vraiment les critères AAOIFI. Le score de purification est un vrai plus." },
                  { n: "Amira K.", c: "Lyon · Étudiante en finance", q: "Interface claire, résultats rapides. J'ai reconstruit mon portefeuille en 20 minutes. Indispensable." },
                  { n: "Omar L.", c: "Bruxelles · Trader", q: "Le meilleur screener de conformité disponible. Je l'utilise chaque semaine avant d'investir. Données fiables et à jour." },
                ].map(({ n, c, q }) => (
                  <div key={n} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "28px 24px" }}>
                    <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>{Array(5).fill(0).map((_, i) => <Ic.Star key={i} />)}</div>
                    <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7, fontStyle: "italic", marginBottom: 20 }}>&ldquo;{q}&rdquo;</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 99, background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: C.emerald }}>{n[0]}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{n}</div>
                        <div style={{ fontSize: 12, color: C.textMuted }}>{c}</div>
                      </div>
                      <div style={{ marginLeft: "auto" }}><Pill><Ic.Check c={C.emerald} /> Vérifié</Pill></div>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedGroup>
          </div>
        </section>

        {/* ── PARTNER ──────────────────────────────── */}
        <section id="partenaire" className="section" style={{ background: `linear-gradient(160deg,${C.forestDark},${C.forestMid})`, position: "relative", overflow: "hidden" }}>
          {/* Decorative */}
          <div style={{ position: "absolute", top: -100, right: -100, width: 440, height: 440, borderRadius: "50%", background: "rgba(201,168,76,.06)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -80, left: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(32,134,64,.08)", pointerEvents: "none" }} />
          <div className="wrap" style={{ position: "relative" }}>
            <AnimatedGroup preset="blur-slide" stagger={0.1} style={{ textAlign: "center", marginBottom: 56 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.22)", borderRadius: 99, padding: "5px 14px", fontSize: 11, fontWeight: 800, color: C.gold, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 16 }}>Programme partenaire</span>
              <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 400, color: "#fff", lineHeight: 1.15, marginBottom: 14 }}>
                Devenez partenaire <em style={{ color: "#7BE8A2" }}>PUR</em>
              </h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", maxWidth: 540, margin: "0 auto" }}>
                Rejoignez notre réseau de partenaires et générez des revenus récurrents en recommandant PUR à votre communauté.
              </p>
            </AnimatedGroup>

            {/* Benefits grid */}
            <AnimatedGroup preset="blur-slide" stagger={0.12}>
              <div className="partner-benefits" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginBottom: 56 }}>
                {[
                  {
                    icon: <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#7BE8A2" strokeWidth={1.8} strokeLinecap="round"><circle cx={12} cy={12} r={10} /><path d="M12 6v6l4 2" /></svg>,
                    title: "Commission récurrente",
                    desc: "Percevez une commission mensuelle sur chaque abonné que vous parrainez, tant que son abonnement reste actif.",
                    highlight: "Jusqu'à 30 %",
                  },
                  {
                    icon: <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#7BE8A2" strokeWidth={1.8} strokeLinecap="round"><rect x={3} y={3} width={18} height={18} rx={3} /><path d="M3 9h18M9 21V9" /></svg>,
                    title: "Tableau de bord dédié",
                    desc: "Suivez vos filleuls, vos commissions et vos performances en temps réel depuis votre espace partenaire.",
                    highlight: "Accès prioritaire",
                  },
                  {
                    icon: <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#7BE8A2" strokeWidth={1.8} strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
                    title: "Support prioritaire",
                    desc: "Un interlocuteur dédié, des ressources marketing prêtes à l'emploi et un accès Premium inclus.",
                    highlight: "Réponse < 24 h",
                  },
                ].map(({ icon, title, desc, highlight }) => (
                  <div key={title} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "28px 24px" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(32,134,64,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>{icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>{highlight}</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#fff", marginBottom: 10 }}>{title}</div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.65 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </AnimatedGroup>

            {/* Who it's for */}
            <AnimatedGroup preset="blur-slide" stagger={0.1}>
              <div className="partner-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center", marginBottom: 56 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#7BBE8A", marginBottom: 14 }}>Pour qui ?</p>
                  <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(22px,2.5vw,30px)", fontWeight: 400, color: "#fff", lineHeight: 1.25, marginBottom: 20 }}>
                    Idéal si vous avez une audience engagée
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      "Créateurs de contenu finance & investissement",
                      "Conseillers financiers indépendants",
                      "Associations et mosquées",
                      "Formateurs et coachs patrimoniaux",
                      "Influenceurs et blogueurs",
                    ].map(item => (
                      <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 99, background: "rgba(32,134,64,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Ic.Check c="#6BCB77" />
                        </div>
                        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "32px 28px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#7BBE8A", marginBottom: 14 }}>Comment ça marche</p>
                  {[
                    ["01", "Inscrivez-vous", "Remplissez le formulaire en 2 minutes. Nous validons votre candidature sous 48 h."],
                    ["02", "Partagez votre lien", "Obtenez votre lien de parrainage unique et intégrez-le à vos contenus."],
                    ["03", "Encaissez vos commissions", "Suivez vos gains en temps réel et recevez vos virements chaque mois."],
                  ].map(([n, t, d]) => (
                    <div key={n} style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 99, background: "rgba(32,134,64,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: "#7BE8A2", flexShrink: 0 }}>{n}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 4 }}>{t}</div>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.55 }}>{d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedGroup>

            {/* CTA */}
            <AnimatedGroup preset="blur-slide" stagger={0.1}>
              <div style={{ textAlign: "center" }}>
                <button onClick={() => window.open("mailto:partenaires@pur.app", "_blank")} style={{ background: C.gold, color: C.forestDark, border: "none", borderRadius: 14, padding: "16px 36px", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10 }}>
                  Devenir partenaire
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1={5} y1={12} x2={19} y2={12} /><polyline points="12 5 19 12 12 19" /></svg>
                </button>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 14 }}>Candidature gratuite · Réponse sous 48 h · partenaires@pur.app</p>
              </div>
            </AnimatedGroup>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────── */}
        <section id="faq" className="section" style={{ background: C.surface }}>
          <div className="wrap">
            <AnimatedGroup preset="blur-slide" stagger={0.08} style={{ textAlign: "center", marginBottom: 56 }}>
              <Eyebrow text="FAQ" />
              <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 400, color: C.text }}>Questions fréquentes</h2>
            </AnimatedGroup>
            <AnimatedGroup preset="fade" stagger={0.06}>
              <div className="faq-grid">
                {[
                  ["Quels critères AAOIFI sont vérifiés ?", "Nous vérifions les 3 ratios : endettement (< 33 %), revenus non-conformes (< 5 %) et trésorerie (< 33 % de la capitalisation). Ces seuils sont conformes aux standards AAOIFI."],
                  ["Les données sont-elles fiables ?", "Nos données financières sont issues de sources institutionnelles certifiées, mises à jour à chaque publication de bilan trimestriel. Précision de 98 %."],
                  ["Puis-je annuler à tout moment ?", "Oui, sans engagement. Annulez depuis votre espace personnel. Votre accès Premium reste actif jusqu'à la fin de la période facturée."],
                  ["Comment fonctionne la purification ?", "Notre méthode suit les recommandations de scholars islamiques et les standards AAOIFI. Nous recommandons de consulter un érudit pour les situations complexes."],
                  ["Quels marchés sont couverts ?", "Marchés US (NYSE, NASDAQ), Europe (Euronext, Xetra) et marchés internationaux. Plus de 2 400 titres analysés."],
                  ["Y a-t-il une application mobile ?", "PUR est optimisé pour mobile et desktop via navigateur. Une app native iOS et Android est en cours de développement."],
                  ["Quelle est la différence entre mensuel et annuel ?", "Le plan annuel est facturé en une fois (89,88 €/an) et revient à 7,49 €/mois — soit 25 % d'économie par rapport au mensuel (9,99 €/mois). Vous bénéficiez exactement des mêmes fonctionnalités."],
                  ["C'est quoi le calculateur DCF ?", "Le Discounted Cash Flow est une méthode d'évaluation qui estime la valeur intrinsèque d'une action en actualisant ses flux de trésorerie futurs. Notre outil vous guide pas à pas avec des paramètres adaptés aux titres conformes AAOIFI."],
                  ["C'est quoi le suivi TWR ?", "Le Time-Weighted Return (rendement pondéré dans le temps) mesure votre performance réelle en neutralisant l'effet des apports et retraits de capital. C'est la méthode standard des gérants de fonds professionnels pour évaluer une stratégie indépendamment de la taille du portefeuille."],
                ].map(([q, a]) => <FaqItem key={q} q={q} a={a} />)}
              </div>
            </AnimatedGroup>
          </div>
        </section>

        {/* ── CTA BANNER ───────────────────────────── */}
        <section style={{ background: `linear-gradient(135deg,${C.forestDark},${C.forestMid})`, position: "relative", overflow: "hidden" }}>
          {/* Decorative orbs */}
          <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(32,134,64,.15)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -80, left: -80, width: 360, height: 360, borderRadius: "50%", background: "rgba(201,168,76,.08)", pointerEvents: "none" }} />
          <div className="wrap" style={{ padding: "88px 64px", textAlign: "center", position: "relative" }}>
            <AnimatedGroup preset="blur-slide" stagger={0.1}>
              <Pill dark><Ic.Shield c="#A8D5A2" s={13} /> Commencez dès aujourd'hui</Pill>
              <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(32px,5vw,52px)", fontWeight: 400, color: "#fff", marginTop: 20, marginBottom: 18, lineHeight: 1.12 }}>
                Investissez en accord<br />avec <em style={{ color: "#7BE8A2" }}>votre foi</em>
              </h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,.65)", maxWidth: 480, margin: "0 auto 36px", lineHeight: 1.65 }}>
                Rejoignez des milliers d'investisseurs musulmans qui font confiance à PUR pour leurs décisions financières.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <Btn label="Essai gratuit 7 jours" onClick={toApp} variant="primary" />
                <Btn label="Voir les tarifs" onClick={() => document.getElementById("tarifs")?.scrollIntoView({ behavior: "smooth" })} variant="outline-dark" />
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 18 }}>Aucune carte requise · Annulation à tout moment</p>
            </AnimatedGroup>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────── */}
        <footer style={{ background: C.forestDark, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="wrap" style={{ padding: "64px 64px 48px" }}>
            <div className="footer-grid" style={{ marginBottom: 48 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <img
                    src="/logo-PUR-sans-fond.svg"
                    alt="PUR"
                    width={32}
                    height={32}
                    style={{ display: "block", objectFit: "contain", filter: "brightness(0) invert(1)" }}
                  />
                  <span style={{ fontWeight: 900, fontSize: 17, color: "#fff", letterSpacing: "-.02em" }}>PUR</span>
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", lineHeight: 1.65, maxWidth: 260 }}>Conformité AAOIFI · Investissement éthique</p>
              </div>
              {([
                ["Produit", [["Fonctionnalités", "#fonctionnalités"], ["Tarifs", "#tarifs"], ["FAQ", "#faq"], ["Roadmap", "#"]]],
                ["Légal", [["Conditions", "#"], ["Confidentialité", "/politique-confidentialite"], ["Cookies", "#"]]],
              ] as [string, [string, string][]][]).map(([title, links]) => (
                <div key={title}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.35)", marginBottom: 16 }}>{title}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {links.map(([label, href]) => (
                      <a key={label} href={href} style={{ fontSize: 13, color: "rgba(255,255,255,.5)", textDecoration: "none" }}>{label}</a>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.35)", marginBottom: 16 }}>Contact</div>
                <a href="mailto:contact@pur.app" style={{ fontSize: 13, color: "rgba(255,255,255,.5)", textDecoration: "none" }}>contact@pur.app</a>
              </div>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,.25)" }}>© {new Date().getFullYear()} PUR. Tous droits réservés.</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,.25)" }}>Données financières mises à jour en temps réel</p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
