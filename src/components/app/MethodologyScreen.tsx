"use client";
import { T, BS } from "@/components/ui/tokens";

const CRITERIA = [
  {
    icon: "📊",
    label: "Ratio d'endettement",
    threshold: "≤ 33 %",
    color: T.green,
    bg: T.greenBg,
    detail: "La dette totale de l'entreprise (incluant dettes financières et obligations portant intérêt) ne doit pas dépasser 33 % de ses actifs totaux moyens sur les 24 derniers mois. Ce plafond protège contre le recours excessif à des instruments d'emprunt basés sur l'intérêt (ribâ).",
    calc: "Dette totale ÷ Actifs totaux × 100",
  },
  {
    icon: "🚫",
    label: "Revenus non conformes",
    threshold: "≤ 5 %",
    color: T.amber,
    bg: T.amberBg,
    detail: "Les revenus provenant d'activités non conformes (intérêts bancaires, alcool, tabac, jeux d'argent, armement, pornographie) ne doivent pas dépasser 5 % du chiffre d'affaires total. Ce seuil de tolérance reconnaît qu'il est impossible d'éviter totalement la contamination dans les grandes entreprises diversifiées.",
    calc: "Revenus sensibles ÷ CA total × 100",
  },
  {
    icon: "💰",
    label: "Liquidités et placements",
    threshold: "≤ 33 %",
    color: T.green,
    bg: T.greenBg,
    detail: "Les dépôts monétaires et placements à intérêts (comptes à terme, obligations, bons du trésor) ne doivent pas dépasser 33 % des actifs totaux. Un niveau excessif de liquidités rémunérées indique une dépendance structurelle à des instruments financiers basés sur le ribâ.",
    calc: "Liquidités + placements ÷ Actifs totaux × 100",
  },
];

const SCORE_LEVELS = [
  { min: 75, max: 100, label: "Conforme ✓",      color: T.green, bg: T.greenBg,   desc: "L'entreprise respecte les 3 critères AAOIFI. Vous pouvez y investir en conformité avec les principes de la finance islamique." },
  { min: 40, max: 74,  label: "À surveiller",     color: T.amber, bg: T.amberBg,   desc: "Un ou plusieurs ratios sont proches des seuils. L'investissement est possible avec prudence ; la purification des dividendes est recommandée." },
  { min: 0,  max: 39,  label: "Non conforme ✕",   color: T.red,   bg: "#FCEBEB",   desc: "L'entreprise dépasse au moins un seuil critique. Investir dans ce titre n'est pas recommandé selon les standards AAOIFI." },
];

const PURIFICATION_STEPS = [
  "PUR identifie le pourcentage de revenus non conformes de l'entreprise (ex. 2 %).",
  "Ce même pourcentage s'applique aux dividendes que vous recevez.",
  "Le montant correspondant doit être donné à une œuvre caritative de votre choix.",
  "Exemple : dividende de 100 € × 2 % = 2 € à purifier.",
];

const SOURCES = [
  { label: "AAOIFI Shari'a Standard n°21", desc: "Actions et obligations — critères de sélection des entreprises cotées." },
  { label: "AAOIFI Shari'a Standard n°59", desc: "Fonds d'investissement islamiques." },
  { label: "Conseil Européen de la Fatwa (ECFR)", desc: "Résolution n°2/2 sur l'investissement en actions." },
  { label: "Dow Jones Islamic Market Index", desc: "Méthodologie de screening (référence sectorielle)." },
  { label: "MSCI Islamic Index Series", desc: "Critères de sélection complémentaires pour ETF conformes." },
];

export function MethodologyScreen({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80, animation: "screenIn .28s ease", background: T.bg }}>
      {/* Header */}
      <header style={{ padding: "52px 20px 16px", display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, background: T.surface, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, cursor: "pointer", color: T.text, flexShrink: 0 }}>←</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: "-.4px" }}>Méthodologie AAOIFI</h1>
          <p style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Standards de finance islamique</p>
        </div>
      </header>

      {/* Intro */}
      <section style={{ padding: "0 20px 20px" }}>
        <div style={{ background: T.forest, borderRadius: 18, padding: 20 }}>
          <p style={{ fontSize: 11, color: "rgba(200,230,201,0.55)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Qu'est-ce que l'AAOIFI ?</p>
          <p style={{ fontSize: 14, color: "#E8F0EB", lineHeight: 1.75 }}>
            L'<strong style={{ color: "#A5D6A7" }}>Accounting and Auditing Organization for Islamic Financial Institutions</strong> (Bahreïn, 1991) est l'organisme de référence mondial pour les standards de la finance islamique. Ses normes Shari'a sont adoptées par plus de 45 pays.
          </p>
          <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(255,255,255,0.07)", borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: "rgba(200,230,201,0.65)", lineHeight: 1.7 }}>
              PUR applique les <strong style={{ color: "rgba(200,230,201,0.9)" }}>Shari'a Standards n°21 et n°59</strong> pour calculer le score de conformité de chaque entreprise cotée en bourse.
            </p>
          </div>
        </div>
      </section>

      {/* Criteria */}
      <section style={{ padding: "0 20px 20px" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Les 3 critères de sélection</p>
        {CRITERIA.map((c, i) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{c.icon}</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{c.label}</p>
                  <p style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>Seuil maximum</p>
                </div>
              </div>
              <div style={{ background: c.bg, borderRadius: 10, padding: "6px 12px", textAlign: "center" }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.threshold}</p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: T.textSub, lineHeight: 1.75, marginBottom: 10 }}>{c.detail}</p>
            <div style={{ background: T.surface2, borderRadius: 8, padding: "8px 12px", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: T.textMuted }}>Formule :</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.text, fontFamily: "monospace" }}>{c.calc}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Score */}
      <section style={{ padding: "0 20px 20px" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Calcul du score (0–100)</p>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18, marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: T.textSub, lineHeight: 1.75, marginBottom: 14 }}>
            Le score PUR est une synthèse pondérée des 3 ratios. Chaque ratio contribue au score selon son écart par rapport au seuil. Un ratio parfaitement à 0 % contribue au maximum ; un ratio au-dessus du seuil fait chuter le score proportionnellement.
          </p>
          <div style={{ background: T.surface2, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: T.textMuted, marginBottom: 4 }}>Pondération indicative</p>
            {[["Dette / actifs", "40 %"], ["Revenus non conformes", "40 %"], ["Liquidités", "20 %"]].map(([label, pct]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 12, color: T.textSub }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{pct}</span>
              </div>
            ))}
          </div>
          {SCORE_LEVELS.map(s => (
            <div key={s.label} style={{ display: "flex", gap: 12, marginBottom: 10, padding: 12, background: s.bg, borderRadius: 10 }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: s.color }}>{s.min}–{s.max}</div>
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 3 }}>{s.label}</p>
                <p style={{ fontSize: 11, color: T.textSub, lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Purification */}
      <section style={{ padding: "0 20px 20px" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Purification des dividendes</p>
        <div style={{ background: "#FDF8EF", border: `1px solid ${T.gold}30`, borderRadius: 16, padding: 18 }}>
          <p style={{ fontSize: 12, color: T.textSub, lineHeight: 1.75, marginBottom: 14 }}>
            Même une entreprise conforme peut percevoir une petite fraction de revenus non conformes (ex. intérêts sur trésorerie). La purification consiste à reverser la même proportion de vos dividendes à une œuvre caritative.
          </p>
          {PURIFICATION_STEPS.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: T.amberBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: T.amber, flexShrink: 0 }}>{i + 1}</div>
              <p style={{ fontSize: 12, color: T.textSub, lineHeight: 1.65 }}>{step}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sources */}
      <section style={{ padding: "0 20px 24px" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Sources et références</p>
        {SOURCES.map((s, i) => (
          <div key={i} style={{ padding: "11px 0", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: T.emerald, flexShrink: 0, marginTop: 5 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{s.label}</p>
              <p style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{s.desc}</p>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 16, padding: 14, background: T.surface2, borderRadius: 12 }}>
          <p style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.7 }}>
            Les données financières sont issues des rapports trimestriels publiés par les entreprises. PUR ne garantit pas leur exactitude et décline toute responsabilité pour les décisions d'investissement prises sur la base de ces informations. Ce service est fourni à titre informatif uniquement.
          </p>
        </div>
      </section>
    </div>
  );
}
