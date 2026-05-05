import { MOCK_DATA } from "@/services/market/mock";
import { calcScore, scoreToStatus, calcPurification, AAOIFI_RULES } from "@/domain/aaoifi";
import type { BuilderInput, PortfolioProposal, AssetAllocation, ProposalMetrics } from "./types";
import { SECTOR_TICKERS, STRATEGY_WEIGHTS, applyRiskFilter, holdingCount, normalizeWeights, matchesRegion } from "./allocationUtils";

// Conforme-only pool (score ≥ 75)
const COMPLIANT_TICKERS = Object.entries(MOCK_DATA)
  .filter(([, d]) => calcScore(d.ratioDebt, d.ratioRevHaram, d.ratioCash) >= AAOIFI_RULES.HALAL_MIN)
  .map(([t]) => t);

function nameFor(strategy: BuilderInput["strategy"], sectors: string[], risk: BuilderInput["risk"]): string {
  const sectorPart = sectors.length ? sectors.slice(0, 2).join(" & ") : "Global";
  const stratMap: Record<string, string> = {
    growth:"Croissance", dividends:"Dividendes", balanced:"Équilibré",
    defensive:"Défensif", "high-conviction":"High Conviction", diversified:"Diversifié",
  };
  const riskMap: Record<string, string> = { Conservative:"Prudent", Balanced:"Modéré", Dynamic:"Dynamique" };
  return `Portfolio ${stratMap[strategy]} ${sectorPart} — ${riskMap[risk]}`;
}

function divOrientation(avgYield: number): ProposalMetrics["dividendOrientation"] {
  if (avgYield >= 2) return "Élevée";
  if (avgYield >= 0.8) return "Modérée";
  return "Faible";
}

function diversLabel(n: number): string {
  if (n <= 4) return "Concentré";
  if (n <= 7) return "Équilibré";
  return "Très diversifié";
}

export function buildPortfolio(input: BuilderInput): PortfolioProposal {
  const { amount, strategy, risk, sectors, diversif, region } = input;

  // 1. Candidate pool: conforme + region filter
  let pool = COMPLIANT_TICKERS.filter(t => matchesRegion(t, region));

  // 2. Sector preference boost (if sectors selected)
  const sectorFavored = new Set<string>();
  if (sectors.length) {
    sectors.forEach(s => (SECTOR_TICKERS[s] ?? []).forEach(t => sectorFavored.add(t)));
  }

  // 3. Strategy weights + risk adjustment
  const stratW = STRATEGY_WEIGHTS[strategy];
  const scored: Record<string, number> = {};
  pool.forEach(t => {
    let w = stratW[t] ?? 3;
    if (sectorFavored.size && sectorFavored.has(t)) w *= 1.5;
    scored[t] = applyRiskFilter(t, risk, w);
  });

  // 4. Sort by score, take top N
  const maxN = holdingCount(diversif);
  const selected = Object.entries(scored)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxN)
    .map(([t]) => t);

  if (!selected.length) {
    // Fallback: take first 5 global conforme assets
    selected.push(...COMPLIANT_TICKERS.slice(0, 5));
  }

  // 5. Normalize allocation weights
  const selWeights: Record<string, number> = {};
  selected.forEach(t => { selWeights[t] = scored[t] ?? 3; });
  const pcts = normalizeWeights(selWeights);

  // 6. Build allocations
  const allocations: AssetAllocation[] = selected.map(ticker => {
    const d = MOCK_DATA[ticker]!;
    const score = calcScore(d.ratioDebt, d.ratioRevHaram, d.ratioCash);
    const status = scoreToStatus(score);
    const pct = pcts[ticker] ?? (100 / selected.length);
    const amt = Math.round((amount * pct) / 100);

    const isSectorFav = sectorFavored.has(ticker);
    const stratLabel: Record<string, string> = {
      growth:"potentiel de croissance", dividends:"rendement en dividendes",
      balanced:"équilibre risque/rendement", defensive:"stabilité défensive",
      "high-conviction":"conviction élevée", diversified:"diversification",
    };
    const reason = isSectorFav
      ? `Correspond à vos secteurs favoris — bon ${stratLabel[strategy] ?? "profil"}.`
      : `Sélectionné pour son ${stratLabel[strategy] ?? "profil"} et sa conformité AAOIFI.`;

    const riskNote = d.beta > 1.5 ? `Beta ${d.beta} — actif volatile.` : d.beta < 0.8 ? `Beta ${d.beta} — actif défensif.` : undefined;

    return { ticker, name: d.name, sector: d.sector, country: d.country, allocationPct: pct, amount: amt, score, status, divYield: d.divYield, beta: d.beta, reason, riskNote };
  });

  // 7. Portfolio metrics
  const avgScore    = Math.round(allocations.reduce((s, a) => s + a.score * a.allocationPct, 0) / 100);
  const avgDivYield = allocations.reduce((s, a) => s + a.divYield * (a.allocationPct / 100), 0);
  const purif       = allocations.reduce((s, a) => {
    const d = MOCK_DATA[a.ticker]!;
    return s + calcPurification((d.divAnnual * (amount * a.allocationPct / 100 / d.price)), d.divHaramPct);
  }, 0);
  const zakat = amount * 0.025;

  const metrics: ProposalMetrics = {
    halalScore:           avgScore,
    diversificationLevel: diversLabel(allocations.length),
    dividendOrientation:  divOrientation(avgDivYield),
    purificationEstimate: parseFloat(purif.toFixed(2)),
    zakatEstimate:        parseFloat(zakat.toFixed(2)),
  };

  return {
    name:        nameFor(strategy, sectors, risk),
    totalAmount: amount,
    allocations,
    metrics,
  };
}
