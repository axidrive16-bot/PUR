"use client";
import { useState } from "react";
import { usePortfolios } from "@/hooks/usePortfolios";
import { useToast } from "@/components/ui/Toast";
import { T } from "@/components/ui/tokens";
import { buildPortfolio } from "./portfolioBuilderEngine";
import { PortfolioBuilderForm } from "./PortfolioBuilderForm";
import { PortfolioProposal } from "./PortfolioProposal";
import type { BuilderInput, PortfolioProposal as Proposal } from "./types";
import type { Asset } from "@/domain/types";
import { MOCK_DATA } from "@/services/market/mock";
import { calcScore, scoreToStatus } from "@/domain/aaoifi";

interface Props { onBack: () => void; openReport: (ticker: string) => void; }

export function PortfolioBuilderScreen({ onBack, openReport }: Props) {
  const [phase, setPhase]       = useState<"form" | "generating" | "proposal">("form");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [lastInput, setLast]    = useState<BuilderInput | null>(null);
  const pfCtx = usePortfolios();
  const toast = useToast();

  const handleGenerate = (input: BuilderInput) => {
    setLast(input);
    setPhase("generating");
    // Deterministic engine — simulate a brief async feel
    setTimeout(() => {
      setProposal(buildPortfolio(input));
      setPhase("proposal");
    }, 900);
  };

  const handleSave = () => {
    if (!proposal) return;
    const pfName = proposal.name.slice(0, 40);
    pfCtx.createPf(pfName);
    // Add each allocation as a holding with qty=1 at current price
    proposal.allocations.forEach(a => {
      const d = MOCK_DATA[a.ticker];
      if (!d) return;
      const score  = calcScore(d.ratioDebt, d.ratioRevHaram, d.ratioCash);
      const status = scoreToStatus(score);
      const asset: Asset = {
        ticker: a.ticker, name: d.name, type: "stock", sector: d.sector,
        country: d.country, mktCap: d.mktCap, price: d.price, change: d.change,
        divYield: d.divYield, divAnnual: d.divAnnual, divHaramPct: d.divHaramPct,
        esgScore: d.esgScore, beta: d.beta, volatility: d.volatility,
        ratioDebt: d.ratioDebt, ratioRevHaram: d.ratioRevHaram, ratioCash: d.ratioCash,
        score, status, scoreHistory: [], periods: { "1D":[], "1S":[], "1M":[], "1A":[] },
        opportunities: false, newlyHalal: false, whyHalal: [],
      };
      pfCtx.addToActive(asset, Math.max(1, Math.round(a.amount / d.price)));
    });
    toast(`"${pfName}" sauvegardé`);
    onBack();
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80, animation: "screenIn .28s ease", background: T.bg }}>
      {/* Header */}
      <header style={{ padding: "52px 20px 14px", display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, background: T.surface, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, cursor: "pointer", color: T.text, flexShrink: 0 }}>←</button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: T.text }}>AI Halal Portfolio Builder</h1>
          <p style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Simulation éducative · Pas un conseil en investissement</p>
        </div>
      </header>

      <div style={{ padding: "0 20px" }}>
        {phase === "generating" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 18 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: T.forest, display: "flex", alignItems: "center", justifyContent: "center", animation: "spin 1.2s linear infinite" }}>
              <span style={{ fontSize: 24 }}>✦</span>
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Génération du portfolio…</p>
            <p style={{ fontSize: 13, color: T.textMuted, textAlign: "center" }}>Analyse des actifs conformes AAOIFI selon vos préférences</p>
          </div>
        )}

        {phase === "form" && (
          <PortfolioBuilderForm onGenerate={handleGenerate} loading={false} />
        )}

        {phase === "proposal" && proposal && (
          <PortfolioProposal
            proposal={proposal}
            onRegenerate={() => setPhase("form")}
            onSave={handleSave}
            onScreen={openReport}
          />
        )}
      </div>
    </div>
  );
}
