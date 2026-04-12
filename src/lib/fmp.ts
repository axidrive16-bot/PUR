import type { ChartPeriod, ChartPoint } from "@/domain/types";
import { parseAAOIFIFromFMP } from "@/domain/aaoifi";

const FMP_BASE = "https://financialmodelingprep.com/stable";
const FMP_KEY  = process.env.FMP_API_KEY ?? "";

const cache = new Map<string, { data: unknown; expiresAt: number }>();

async function fmpFetch<T>(path: string, ttlMs = 300_000): Promise<T | null> {
  if (!FMP_KEY) {
    console.warn("[FMP] FMP_API_KEY manquante — mode démo actif");
    return null;
  }
  const cached = cache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.data as T;
  try {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${FMP_BASE}${path}${sep}apikey=${FMP_KEY}`;
    const res  = await fetch(url, { next: { revalidate: Math.floor(ttlMs / 1000) } });
    if (!res.ok) { console.error(`[FMP] ${res.status} — ${path}`); return null; }
    const data = await res.json();
    if (data?.["Error Message"]) { console.error(`[FMP] Erreur API:`, data["Error Message"]); return null; }
    cache.set(path, { data, expiresAt: Date.now() + ttlMs });
    return data as T;
  } catch (err) {
    console.error("[FMP] erreur réseau:", err);
    return null;
  }
}

export const fmpService = {
  // Prix temps réel (cache 1 min)
  async getQuote(ticker: string) {
    const d = await fmpFetch<Array<{
      symbol: string; price: number; changesPercentage: number;
      marketCap: number; beta: number;
    }>>(`/quote?symbol=${ticker}`, 60_000);
    return d?.[0] ?? null;
  },

  // Profil entreprise (cache 24h)
  async getProfile(ticker: string) {
    const d = await fmpFetch<Array<{
      companyName: string; description: string; ceo: string;
      fullTimeEmployees: number; sector: string; country: string;
      exchangeShortName: string; dividendYield: number;
      lastDiv: number; beta: number;
    }>>(`/profile?symbol=${ticker}`, 86_400_000);
    return d?.[0] ?? null;
  },

  // Bilans (cache 6h)
  async getBalanceSheets(ticker: string) {
    return fmpFetch<Array<{
      date: string; calendarYear: string; period: string;
      totalAssets: number; shortTermDebt: number;
      longTermDebt: number; cashAndCashEquivalents: number;
    }>>(`/balance-sheet-statement?symbol=${ticker}&period=quarter&limit=8`, 6 * 3_600_000);
  },

  // Comptes de résultat (cache 6h)
  async getIncomeStatements(ticker: string) {
    return fmpFetch<Array<{
      date: string; calendarYear: string; period: string;
      revenue: number; netIncome: number; interestIncome: number;
    }>>(`/income-statement?symbol=${ticker}&period=quarter&limit=8`, 6 * 3_600_000);
  },

  // Historique prix
  async getPriceHistory(ticker: string, period: ChartPeriod): Promise<ChartPoint[]> {
    const now  = new Date();
    const from = (days: number) =>
      new Date(now.getTime() - days * 86_400_000).toISOString().split("T")[0];

    const cfg = {
      "1D": { path: `/historical-chart/5min?symbol=${ticker}&from=${from(1)}`,   ttl: 60_000     },
      "1S": { path: `/historical-chart/1hour?symbol=${ticker}&from=${from(7)}`,  ttl: 300_000    },
      "1M": { path: `/historical-price-full?symbol=${ticker}&from=${from(30)}`,  ttl: 3_600_000  },
      "1A": { path: `/historical-price-full?symbol=${ticker}&from=${from(365)}`, ttl: 3_600_000  },
    };

    const { path, ttl } = cfg[period];
    const raw = await fmpFetch<any>(path, ttl);
    const pts  = Array.isArray(raw) ? raw : (raw?.historical ?? []);
    return (pts as any[])
      .reverse()
      .map((p: any) => ({ t: new Date(p.date ?? p.datetime).getTime(), v: p.close }));
  },

  // Calcul AAOIFI depuis les bilans réels
  async getAAOIFIRatios(ticker: string) {
    const [balances, incomes] = await Promise.all([
      this.getBalanceSheets(ticker),
      this.getIncomeStatements(ticker),
    ]);
    if (!balances || !incomes) return null;
    return parseAAOIFIFromFMP(balances, incomes);
  },

  // Rapports SEC
  async getSecFilings(ticker: string) {
    return fmpFetch<Array<{ type: string; filingDate: string; finalLink: string }>>(
      `/sec-filings?symbol=${ticker}&type=10-K&limit=5`,
      86_400_000
    );
  },

  // Recherche
  async search(query: string) {
    return fmpFetch<Array<{ symbol: string; name: string; exchangeShortName: string }>>(
      `/search?query=${encodeURIComponent(query)}&limit=10`,
      30_000
    );
  },
};
