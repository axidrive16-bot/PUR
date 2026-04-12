import type { AAOIFIRatios, ComplianceStatus, PortfolioItem } from "./types";

export const AAOIFI_RULES = {
  DEBT_MAX:          33,
  HARAM_REVENUE_MAX:  5,
  CASH_MAX:          33,
  DEBT_PENALTY:     1.5,
  HARAM_PENALTY:    8.0,
  CASH_PENALTY:     0.5,
  HALAL_MIN:         75,
  DOUTEUX_MIN:       40,
  VERSION:    "AAOIFI-2024",
} as const;

export function calcScore(rDebt: number, rHaram: number, rCash: number): number {
  const pen =
    Math.max(0, rDebt  - AAOIFI_RULES.DEBT_MAX)         * AAOIFI_RULES.DEBT_PENALTY  +
    Math.max(0, rHaram - AAOIFI_RULES.HARAM_REVENUE_MAX) * AAOIFI_RULES.HARAM_PENALTY +
    Math.max(0, rCash  - AAOIFI_RULES.CASH_MAX)          * AAOIFI_RULES.CASH_PENALTY;
  return Math.max(0, Math.min(100, Math.round(100 - pen)));
}

export function scoreToStatus(score: number): ComplianceStatus {
  return score >= AAOIFI_RULES.HALAL_MIN   ? "halal"
       : score >= AAOIFI_RULES.DOUTEUX_MIN ? "douteux"
       : "non-halal";
}

export function calcPurification(divAmount: number, haramPct: number): number {
  return divAmount * (haramPct / 100);
}

export function parseAAOIFIFromFMP(
  balances: Array<{
    date: string; calendarYear: string; period: string;
    totalAssets: number; shortTermDebt: number;
    longTermDebt: number; cashAndCashEquivalents: number;
  }>,
  incomes: Array<{
    date: string; calendarYear: string; period: string;
    revenue: number; netIncome: number; interestIncome: number;
  }>
): AAOIFIRatios[] | null {
  if (!balances?.length || !incomes?.length) return null;
  return balances.slice(0, 8).map((bs, i): AAOIFIRatios => {
    const is      = incomes[i] ?? incomes[0];
    const assets  = bs.totalAssets || 1;
    const debt    = (bs.shortTermDebt || 0) + (bs.longTermDebt || 0);
    const cash    = bs.cashAndCashEquivalents || 0;
    const intIncome = Math.abs(is.interestIncome || 0);
    const revenue   = Math.abs(is.revenue || 1);
    const rDebt  = +((debt / assets) * 100).toFixed(1);
    const rHaram = +((intIncome / revenue) * 100).toFixed(2);
    const rCash  = +((cash / assets) * 100).toFixed(1);
    const score  = calcScore(rDebt, rHaram, rCash);
    return {
      rDebt, rHaram, rCash,
      pass:   rDebt < AAOIFI_RULES.DEBT_MAX &&
              rHaram < AAOIFI_RULES.HARAM_REVENUE_MAX &&
              rCash  < AAOIFI_RULES.CASH_MAX,
      score,
      period: `${bs.calendarYear}${bs.period}`,
      date:   bs.date,
      assets, debt, cash, intIncome, revenue,
    };
  });
}

export function computePortfolioMetrics(portfolio: PortfolioItem[]) {
  if (!portfolio.length) return {
    value:0, invested:0, gain:0, gainPct:0,
    conform:0, divers:0, risk:100, esg:0,
    divTot:0, divHar:0, sectors:{},
  };
  const value    = portfolio.reduce((s,h) => s + h.price * h.qty, 0);
  const invested = portfolio.reduce((s,h) => s + h.paidPrice * h.qty, 0);
  const gain     = value - invested;
  const conform  = !value ? 0 : Math.round(
    portfolio.reduce((s,h) => s + h.score * (h.price * h.qty), 0) / value
  );
  const sects = new Set(portfolio.map(h=>h.sector)).size;
  const maxW  = Math.max(...portfolio.map(h => (h.price*h.qty)/value));
  const divers = Math.min(100, Math.max(0, Math.round(
    (sects/6)*50 + Math.min(portfolio.length/8,1)*30 + 20 - Math.max(0,(maxW-0.4)*100)
  )));
  const betaW = portfolio.reduce((s,h) => s + ((h.beta??1)*(h.price*h.qty))/value, 0);
  const risk  = Math.max(0, Math.round(100 - betaW * 20));
  const esg   = !value ? 0 : Math.round(
    portfolio.reduce((s,h) => s + (h.esgScore??70)*(h.price*h.qty), 0) / value
  );
  const divTot = portfolio.reduce((s,h) => s + (h.divAnnual??0)*h.qty, 0);
  const divHar = portfolio.reduce((s,h) => s + calcPurification((h.divAnnual??0)*h.qty, h.divHaramPct??0), 0);
  const sectors = portfolio.reduce<Record<string,number>>((a,h) => {
    a[h.sector] = (a[h.sector]||0) + h.price*h.qty; return a;
  }, {});
  return { value, invested, gain, gainPct:(invested?(gain/invested)*100:0), conform, divers, risk, esg, divTot, divHar, sectors };
}
