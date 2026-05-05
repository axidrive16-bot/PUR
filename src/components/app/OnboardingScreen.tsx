"use client";
import { useState, useCallback } from "react";
import { useUserStore } from "@/store/usePortfolioStore";
import { preferencesDB } from "@/lib/db";
import { T, BS } from "@/components/ui/tokens";

const SECTORS = ["Tech","Healthcare","Energy","Luxury","Consumer Goods","Industrials","Real Estate","Commodities","Artificial Intelligence","Cybersecurity","Clean Energy","Dividend Stocks","ETFs"];
const STYLES  = ["Growth","Dividends","Balanced","Low Risk","Long-Term","High Conviction","Diversified"];
const GOALS   = ["Maximum halal score","Growth potential","Regular dividends","Low volatility","Global diversification","US stocks","European stocks","ETFs"];
const RISKS   = [
  { id:"Conservative", label:"Conservateur",  icon:"🛡️", desc:"Je privilégie la stabilité et les pertes limitées." },
  { id:"Balanced",     label:"Équilibré",      icon:"⚖️", desc:"Un bon équilibre entre croissance et sécurité." },
  { id:"Dynamic",      label:"Dynamique",      icon:"🚀", desc:"J'accepte plus de risque pour plus de rendement." },
];

interface OnboardingState {
  sectors: string[];
  styles:  string[];
  goals:   string[];
  risk:    string;
}

function Pill({ label, selected, onToggle, delay = 0 }: { label: string; selected: boolean; onToggle: () => void; delay?: number }) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: "9px 16px",
        borderRadius: 999,
        border: `1.5px solid ${selected ? T.forest : T.mint}`,
        background: selected ? T.forest : T.greenBg,
        color: selected ? "#E8F0EB" : T.forest,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all .18s ease",
        display: "flex",
        alignItems: "center",
        gap: 6,
        animation: `float ${2.4 + delay * 0.3}s ${delay * 0.15}s ease-in-out infinite`,
        boxShadow: selected ? "0 4px 16px rgba(26,58,42,0.18)" : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      {selected && <span style={{ fontSize: 10 }}>✓</span>}
      {label}
    </button>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < step ? T.forest : T.borderMid, transition: "background .25s" }} />
      ))}
    </div>
  );
}

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [prefs, setPrefs] = useState<OnboardingState>({ sectors: [], styles: [], goals: [], risk: "" });
  const [saving, setSaving] = useState(false);
  const userId = useUserStore(s => s.id);
  const setOnboardingCompleted = useUserStore(s => s.setOnboardingCompleted);
  const setPreferences = useUserStore(s => s.setPreferences);

  const saveAndComplete = useCallback(async (partial?: Partial<OnboardingState>) => {
    const final = { ...prefs, ...partial };
    setSaving(true);
    const payload = {
      onboarding_completed: true,
      preferred_sectors:    final.sectors,
      investment_styles:    final.styles,
      investment_goals:     final.goals,
      risk_profile:         final.risk || null,
    };
    if (userId !== "guest") {
      await preferencesDB.save(userId, payload).catch(() => {});
    }
    setPreferences({ sectors: final.sectors, investmentStyles: final.styles, investmentGoals: final.goals, riskProfile: final.risk || null });
    setOnboardingCompleted(true);
    setSaving(false);
    onComplete();
  }, [prefs, userId, setPreferences, setOnboardingCompleted, onComplete]);

  const skipAll = () => saveAndComplete({ sectors: [], styles: [], goals: [], risk: "" });

  const toggleSector = (s: string) => setPrefs(p => ({ ...p, sectors: p.sectors.includes(s) ? p.sectors.filter(x => x !== s) : [...p.sectors, s] }));
  const toggleStyle  = (s: string) => setPrefs(p => ({ ...p, styles:  p.styles.includes(s)  ? p.styles.filter(x => x !== s)  : [...p.styles, s]  }));
  const toggleGoal   = (s: string) => setPrefs(p => ({ ...p, goals:   p.goals.includes(s)   ? p.goals.filter(x => x !== s)   : [...p.goals, s]   }));
  const setRisk      = (r: string) => setPrefs(p => ({ ...p, risk: r }));

  const hdr = (title: string, sub: string) => (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-.4px", marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 14, color: T.textSub, lineHeight: 1.65 }}>{sub}</p>
    </div>
  );

  const topBar = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 17, fontWeight: 800, color: T.forest }}>PUR</div>
      <button onClick={skipAll} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: T.textMuted, fontFamily: "inherit", padding: "4px 8px" }}>
        Ignorer →
      </button>
    </div>
  );

  const wrap = (children: React.ReactNode) => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg, minHeight: "100vh", padding: "52px 22px 32px", animation: "slideUp .3s ease", overflowY: "auto" }}>
      {topBar}
      <ProgressBar step={step} total={5} />
      {children}
    </div>
  );

  // ── Step 1: Sectors ─────────────────────────────────────────────
  if (step === 1) return wrap(<>
    {hdr("Choisissez vos secteurs", "Sélectionnez les secteurs qui vous intéressent. PUR personnalisera votre tableau de bord.")}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, flex: 1 }}>
      {SECTORS.map((s, i) => <Pill key={s} label={s} selected={prefs.sectors.includes(s)} onToggle={() => toggleSector(s)} delay={i} />)}
    </div>
    <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
      <button onClick={() => { if (prefs.sectors.length > 0) setStep(2); }} disabled={prefs.sectors.length === 0} style={{ ...BS.btnPrimary, height: 52, fontSize: 15, borderRadius: 16, opacity: prefs.sectors.length === 0 ? 0.45 : 1, cursor: prefs.sectors.length === 0 ? "not-allowed" : "pointer" }}>
        Continuer ({prefs.sectors.length} sélectionné{prefs.sectors.length > 1 ? "s" : ""})
      </button>
      <button onClick={() => setStep(2)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.textMuted, fontFamily: "inherit" }}>
        Passer cette étape
      </button>
    </div>
  </>);

  // ── Step 2: Investment styles ────────────────────────────────────
  if (step === 2) return wrap(<>
    {hdr("Votre style d'investissement", "Comment aimez-vous investir ? Vous pouvez sélectionner plusieurs approches.")}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, flex: 1 }}>
      {STYLES.map((s, i) => <Pill key={s} label={s} selected={prefs.styles.includes(s)} onToggle={() => toggleStyle(s)} delay={i} />)}
    </div>
    <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
      <button onClick={() => { if (prefs.styles.length > 0) setStep(3); }} disabled={prefs.styles.length === 0} style={{ ...BS.btnPrimary, height: 52, fontSize: 15, borderRadius: 16, opacity: prefs.styles.length === 0 ? 0.45 : 1, cursor: prefs.styles.length === 0 ? "not-allowed" : "pointer" }}>
        Continuer
      </button>
      <button onClick={() => setStep(3)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.textMuted, fontFamily: "inherit" }}>
        Passer cette étape
      </button>
    </div>
  </>);

  // ── Step 3: Goals ────────────────────────────────────────────────
  if (step === 3) return wrap(<>
    {hdr("Ce qui compte pour vous", "Qu'est-ce qui guide vos décisions d'investissement ?")}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, flex: 1 }}>
      {GOALS.map((g, i) => <Pill key={g} label={g} selected={prefs.goals.includes(g)} onToggle={() => toggleGoal(g)} delay={i} />)}
    </div>
    <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
      <button onClick={() => { if (prefs.goals.length > 0) setStep(4); }} disabled={prefs.goals.length === 0} style={{ ...BS.btnPrimary, height: 52, fontSize: 15, borderRadius: 16, opacity: prefs.goals.length === 0 ? 0.45 : 1, cursor: prefs.goals.length === 0 ? "not-allowed" : "pointer" }}>
        Continuer
      </button>
      <button onClick={() => setStep(4)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.textMuted, fontFamily: "inherit" }}>
        Passer cette étape
      </button>
    </div>
  </>);

  // ── Step 4: Risk profile ─────────────────────────────────────────
  if (step === 4) return wrap(<>
    {hdr("Votre profil de risque", "Quel niveau de risque êtes-vous prêt à accepter ?")}
    <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
      {RISKS.map(r => (
        <button key={r.id} onClick={() => setRisk(r.id)} style={{ padding: "16px 18px", borderRadius: 16, border: `1.5px solid ${prefs.risk === r.id ? T.forest : T.border}`, background: prefs.risk === r.id ? T.greenBg : T.surface, cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all .18s", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <span style={{ fontSize: 24, lineHeight: 1 }}>{r.icon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: prefs.risk === r.id ? T.forest : T.text, marginBottom: 3 }}>{r.label}</div>
            <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6 }}>{r.desc}</div>
          </div>
          {prefs.risk === r.id && <div style={{ marginLeft: "auto", width: 20, height: 20, borderRadius: 10, background: T.forest, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ color: "#fff", fontSize: 11 }}>✓</span></div>}
        </button>
      ))}
    </div>
    <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
      <button onClick={() => { if (prefs.risk) setStep(5); }} disabled={!prefs.risk} style={{ ...BS.btnPrimary, height: 52, fontSize: 15, borderRadius: 16, opacity: !prefs.risk ? 0.45 : 1, cursor: !prefs.risk ? "not-allowed" : "pointer" }}>
        Continuer
      </button>
      <button onClick={() => setStep(5)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.textMuted, fontFamily: "inherit" }}>
        Passer cette étape
      </button>
    </div>
  </>);

  // ── Step 5: Completion ──────────────────────────────────────────
  return wrap(<>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "20px 0" }}>
      <div style={{ width: 80, height: 80, borderRadius: 24, background: T.forest, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 16px 48px rgba(26,58,42,0.20)" }}>
        <span style={{ fontSize: 36 }}>✦</span>
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 12 }}>Votre profil halal est prêt</h2>
      <p style={{ fontSize: 14, color: T.textSub, lineHeight: 1.75, maxWidth: 300, marginBottom: 36 }}>
        PUR va maintenant personnaliser votre tableau de bord et vous suggérer des actifs à analyser selon vos préférences.
      </p>
      {prefs.sectors.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", marginBottom: 32, maxWidth: 320 }}>
          {[...prefs.sectors.slice(0, 4), ...(prefs.risk ? [prefs.risk] : [])].map(tag => (
            <span key={tag} style={{ background: T.greenBg, color: T.forest, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, border: `1px solid ${T.mint}` }}>{tag}</span>
          ))}
          {prefs.sectors.length > 4 && <span style={{ background: T.greenBg, color: T.forest, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, border: `1px solid ${T.mint}` }}>+{prefs.sectors.length - 4}</span>}
        </div>
      )}
    </div>
    <button onClick={() => saveAndComplete()} disabled={saving} style={{ ...BS.btnPrimary, height: 52, fontSize: 15, borderRadius: 16, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
      {saving ? "Chargement…" : "Accéder au tableau de bord →"}
    </button>
  </>);
}
