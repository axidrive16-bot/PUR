"use client";
import { T, BS, scoreInfo } from "@/components/ui/tokens";
import type { PortfolioProposal as Proposal } from "./types";

function ScoreBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 5, background: T.surface2, borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color, borderRadius: 3, transition: "width .5s ease" }} />
    </div>
  );
}

interface Props {
  proposal: Proposal;
  onRegenerate: () => void;
  onSave: () => void;
  onScreen: (ticker: string) => void;
}

export function PortfolioProposal({ proposal, onRegenerate, onSave, onScreen }: Props) {
  const { name, totalAmount, allocations, metrics } = proposal;
  const si = scoreInfo(metrics.halalScore);

  const fmtEur = (v: number) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ background: T.forest, borderRadius: 18, padding: "18px 18px", marginBottom: 18 }}>
        <p style={{ fontSize: 10, color: "rgba(200,230,201,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Portfolio proposal</p>
        <p style={{ fontSize: 15, fontWeight: 800, color: "#E8F0EB", marginBottom: 4, lineHeight: 1.3 }}>{name}</p>
        <p style={{ fontFamily: "'DM Serif Display',serif", fontSize: 30, color: "#E8F0EB", marginBottom: 14 }}>{fmtEur(totalAmount)}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Score halal", value: `${metrics.halalScore}/100`, color: si.color },
            { label: "Diversification", value: metrics.diversificationLevel, color: "#A5D6A7" },
            { label: "Dividendes", value: metrics.dividendOrientation, color: "#A5D6A7" },
            { label: "Actifs", value: `${allocations.length} positions`, color: "#A5D6A7" },
          ].map(m => (
            <div key={m.label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 12px" }}>
              <p style={{ fontSize: 10, color: "rgba(200,230,201,0.4)", marginBottom: 2 }}>{m.label}</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ background: T.amberBg, border: `1px solid ${T.amber}30`, borderRadius: 12, padding: "10px 14px", marginBottom: 18, fontSize: 11, color: T.amber, lineHeight: 1.6 }}>
        ⚠️ Simulation éducative uniquement · Pas un conseil en investissement · Données indicatives
      </div>

      {/* Allocation bar chart */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Répartition du portfolio</p>
        {allocations.map((a, i) => {
          const si2 = scoreInfo(a.score);
          const barColors = ["#208640","#1A3A2A","#4A7C3F","#639922","#A5D6A7","#C8E6C9","#2563EB","#EA580C","#D97706","#7C3AED","#0891B2"];
          return (
            <div key={a.ticker} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{a.ticker}</span>
                  <span style={{ fontSize: 11, color: T.textMuted }}>{a.sector}</span>
                  <span style={{ fontSize: 10, color: si2.color, fontWeight: 700, background: si2.bg, padding: "2px 6px", borderRadius: 5 }}>{a.score}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{a.allocationPct}%</span>
              </div>
              <ScoreBar pct={a.allocationPct} color={barColors[i % barColors.length]} />
              <p style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{fmtEur(a.amount)}</p>
            </div>
          );
        })}
      </div>

      {/* Asset cards */}
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Détail des positions</p>
        {allocations.map(a => {
          const si2 = scoreInfo(a.score);
          return (
            <div key={a.ticker} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{a.ticker}</span>
                    <span style={{ fontSize: 10, background: si2.bg, color: si2.color, fontWeight: 700, padding: "2px 7px", borderRadius: 6 }}>{a.score} · {a.status === "halal" ? "Conforme" : a.status}</span>
                  </div>
                  <p style={{ fontSize: 12, color: T.textSub }}>{a.name}</p>
                  <p style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{a.sector} · {a.country}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 17, fontWeight: 800, color: T.text }}>{a.allocationPct}%</p>
                  <p style={{ fontSize: 12, color: T.textMuted }}>{fmtEur(a.amount)}</p>
                </div>
              </div>
              <p style={{ fontSize: 12, color: T.textSub, lineHeight: 1.55, marginBottom: 6 }}>{a.reason}</p>
              {a.riskNote && <p style={{ fontSize: 11, color: T.amber, lineHeight: 1.5 }}>⚠️ {a.riskNote}</p>}
              {a.divYield > 0 && <p style={{ fontSize: 11, color: T.green, marginTop: 4 }}>Div. {a.divYield}%/an</p>}
              <button onClick={() => onScreen(a.ticker)} style={{ marginTop: 10, height: 32, padding: "0 14px", background: T.greenBg, border: `1px solid ${T.mint}`, borderRadius: 8, fontSize: 12, fontWeight: 700, color: T.forest, cursor: "pointer", fontFamily: "inherit" }}>
                Analyser →
              </button>
            </div>
          );
        })}
      </div>

      {/* Zakat & Purification */}
      {(metrics.zakatEstimate > 0 || metrics.purificationEstimate > 0) && (
        <div style={{ background: T.goldLight, border: `1px solid ${T.gold}30`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.amber, marginBottom: 10 }}>Estimations religieuses</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><p style={{ fontSize: 10, color: T.textMuted, marginBottom: 2 }}>Zakat estimée/an</p><p style={{ fontSize: 14, fontWeight: 800, color: T.amber }}>{metrics.zakatEstimate.toFixed(0)} €</p></div>
            {metrics.purificationEstimate > 0 && <div><p style={{ fontSize: 10, color: T.textMuted, marginBottom: 2 }}>Purification dividendes</p><p style={{ fontSize: 14, fontWeight: 800, color: T.amber }}>{metrics.purificationEstimate.toFixed(2)} €</p></div>}
          </div>
          <p style={{ fontSize: 10, color: T.textMuted, marginTop: 8, lineHeight: 1.6 }}>Estimations simplifiées. Consultez un spécialiste pour un calcul précis.</p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={onSave} style={{ ...BS.btnPrimary, height: 50, fontSize: 14, borderRadius: 14 }}>
          Sauvegarder comme portefeuille virtuel
        </button>
        <button onClick={onRegenerate} style={{ height: 46, border: `1px solid ${T.border}`, background: T.surface, borderRadius: 13, fontSize: 14, fontWeight: 700, color: T.text, cursor: "pointer", fontFamily: "inherit" }}>
          Modifier et regénérer
        </button>
      </div>
    </div>
  );
}
