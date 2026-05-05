import type { Strategy, RiskLevel, Diversif } from "./types";

// ── Sector → Ticker mapping ───────────────────────────────────────
export const SECTOR_TICKERS: Record<string, string[]> = {
  "Tech":                  ["AAPL","MSFT","GOOGL","META"],
  "Healthcare":            ["NOVO"],
  "Energy":                ["TTE"],
  "Luxury":                ["OR"],
  "Consumer Goods":        ["NKE"],
  "Industrials":           ["ASML"],
  "Real Estate":           [],
  "Commodities":           ["TTE"],
  "Artificial Intelligence":["NVDA","MSFT","GOOGL"],
  "Cybersecurity":         ["MSFT"],
  "Clean Energy":          ["TSLA"],
  "Dividend Stocks":       ["OR","NKE","TTE","NOVO","ASML"],
  "ETFs":                  [],
};

// ── Strategy weights: higher = more favored ───────────────────────
// Key: ticker → preference weight per strategy
export const STRATEGY_WEIGHTS: Record<Strategy, Record<string, number>> = {
  "growth":        { NVDA:10, TSLA:9, MSFT:8, AAPL:8, GOOGL:7, META:7, ASML:6, NOVO:5, NKE:4, OR:3, TTE:2 },
  "dividends":     { OR:10, NKE:9, TTE:9, NOVO:8, ASML:8, AAPL:6, MSFT:5, GOOGL:4, META:3, NVDA:2, TSLA:1 },
  "balanced":      { AAPL:8, MSFT:8, NOVO:8, OR:7, ASML:7, NKE:7, GOOGL:6, TTE:6, NVDA:5, META:5, TSLA:4 },
  "defensive":     { OR:10, NOVO:10, ASML:9, NKE:8, TTE:7, AAPL:6, MSFT:5, GOOGL:4, META:3, NVDA:2, TSLA:1 },
  "high-conviction":{ NVDA:10, MSFT:9, AAPL:8, NOVO:7, ASML:6, GOOGL:5, OR:4, TTE:3, NKE:2, META:1, TSLA:1 },
  "diversified":   { AAPL:5, MSFT:5, NVDA:5, NOVO:5, OR:5, NKE:5, ASML:5, GOOGL:5, TTE:5, META:4, TSLA:4 },
};

// ── Risk profile: volatility penalty ─────────────────────────────
// High-beta tickers penalized for conservative, rewarded for dynamic
export const RISK_BETA: Record<string, number> = {
  AAPL:1.12, MSFT:0.90, TSLA:2.15, NKE:0.88, NOVO:0.65, OR:0.72,
  ASML:1.05, GOOGL:1.05, META:1.28, NVDA:1.68, TTE:0.82,
};

export function applyRiskFilter(ticker: string, risk: RiskLevel, weight: number): number {
  const beta = RISK_BETA[ticker] ?? 1;
  if (risk === "Conservative") return weight * (beta > 1.3 ? 0.3 : beta > 1.0 ? 0.7 : 1.1);
  if (risk === "Dynamic")      return weight * (beta > 1.5 ? 1.4 : beta > 1.0 ? 1.1 : 0.8);
  return weight;
}

// ── Diversification → max holdings count ─────────────────────────
export function holdingCount(diversif: Diversif): number {
  return diversif === "concentrated" ? 4 : diversif === "balanced" ? 7 : 11;
}

// ── Normalize weights to percentages (sum = 100) ──────────────────
export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  if (!total) return weights;
  return Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, Math.round((v / total) * 1000) / 10]));
}

// ── Region filter ─────────────────────────────────────────────────
const EU_TICKERS  = new Set(["NOVO","OR","ASML","TTE"]);
const US_TICKERS  = new Set(["AAPL","MSFT","TSLA","NKE","GOOGL","META","NVDA"]);

export function matchesRegion(ticker: string, region: string): boolean {
  if (region === "us")     return US_TICKERS.has(ticker);
  if (region === "europe") return EU_TICKERS.has(ticker);
  return true; // global
}
