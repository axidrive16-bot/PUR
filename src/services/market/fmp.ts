/**
 * FMP (Financial Modeling Prep) — service côté serveur uniquement.
 * Toutes les requêtes passent par les API routes Next.js ; ce fichier
 * ne doit jamais être importé dans un composant client.
 */
import type { ChartPeriod, ChartPoint, AAOIFIRatios } from "@/domain/types";
import { parseAAOIFIFromFMP } from "@/domain/aaoifi";

export const FMP_BASE = "https://financialmodelingprep.com/stable";
const FMP_KEY = process.env.FMP_API_KEY ?? "";

/** True si la clé API est configurée */
export const FMP_AVAILABLE = !!FMP_KEY;

// ── Cache en mémoire (valable pendant la durée de vie du worker) ──
const cache = new Map<string, { data: unknown; expiresAt: number }>();

async function fmpFetch<T>(path: string, ttlMs = 300_000): Promise<T | null> {
  if (!FMP_KEY) return null;

  const key = path;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data as T;

  try {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${FMP_BASE}${path}${sep}apikey=${FMP_KEY}`;
    const res = await fetch(url, { next: { revalidate: Math.floor(ttlMs / 1000) } });
    if (!res.ok) {
      console.error(`[FMP] ${res.status} ${res.statusText} — ${path}`);
      return null;
    }
    const data: unknown = await res.json();
    if (data && typeof data === "object" && "Error Message" in data) {
      console.error("[FMP] Erreur API:", (data as { "Error Message": string })["Error Message"]);
      return null;
    }
    cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data as T;
  } catch (err) {
    console.error("[FMP] erreur réseau:", err);
    return null;
  }
}

// ── Types réponses FMP ────────────────────────────────────────────
export interface FmpQuote {
  symbol:             string;
  price:              number;
  changePercentage:   number;  // e.g. 0.09517 = +0.09%
  change:             number;  // absolute price change
  marketCap:          number;
  beta:               number;
  volume:             number;
  previousClose:      number;
}

export interface FmpProfile {
  companyName:        string;
  description:        string;
  ceo:                string;
  fullTimeEmployees:  number;
  sector:             string;
  country:            string;
  exchange:           string;
  lastDividend:       number;  // annual dividend amount
  price:              number;  // used to compute divYield
  beta:               number;
}

export interface FmpBalanceSheet {
  date:                       string;
  calendarYear:                string;
  period:                      string;
  totalAssets:                 number;
  shortTermDebt:               number;
  longTermDebt:                number;
  cashAndCashEquivalents:      number;
}

export interface FmpIncomeStatement {
  date:            string;
  calendarYear:    string;
  period:          string;
  revenue:         number;
  netIncome:       number;
  interestIncome:  number;
}

export interface FmpSearchResult {
  symbol:   string;
  name:     string;
  exchange: string;
}

// ── Service ───────────────────────────────────────────────────────
export const fmpService = {
  /** Cours temps réel — cache 1 min */
  async getQuote(ticker: string): Promise<FmpQuote | null> {
    const d = await fmpFetch<FmpQuote[]>(`/quote?symbol=${ticker}`, 60_000);
    return d?.[0] ?? null;
  },

  /** Profil entreprise — cache 24h */
  async getProfile(ticker: string): Promise<FmpProfile | null> {
    const d = await fmpFetch<FmpProfile[]>(`/profile?symbol=${ticker}`, 86_400_000);
    return d?.[0] ?? null;
  },

  /** Bilans trimestriels — cache 6h (limit=4 : compatible plan gratuit FMP) */
  async getBalanceSheets(ticker: string): Promise<FmpBalanceSheet[] | null> {
    return fmpFetch<FmpBalanceSheet[]>(
      `/balance-sheet-statement?symbol=${ticker}&period=quarter&limit=4`,
      6 * 3_600_000
    );
  },

  /** Comptes de résultat trimestriels — cache 6h (limit=4 : compatible plan gratuit FMP) */
  async getIncomeStatements(ticker: string): Promise<FmpIncomeStatement[] | null> {
    return fmpFetch<FmpIncomeStatement[]>(
      `/income-statement?symbol=${ticker}&period=quarter&limit=4`,
      6 * 3_600_000
    );
  },

  /** Ratios AAOIFI calculés depuis les bilans réels */
  async getAAOIFIRatios(ticker: string): Promise<AAOIFIRatios[] | null> {
    const [balances, incomes] = await Promise.all([
      this.getBalanceSheets(ticker),
      this.getIncomeStatements(ticker),
    ]);
    if (!balances || !incomes) return null;
    return parseAAOIFIFromFMP(balances, incomes);
  },

  /** Historique de prix pour le chart — TTL variable selon la période */
  async getPriceHistory(ticker: string, period: ChartPeriod): Promise<ChartPoint[]> {
    const now = new Date();
    const fromDate = (days: number) =>
      new Date(now.getTime() - days * 86_400_000).toISOString().split("T")[0];

    const cfg: Record<ChartPeriod, { path: string; ttl: number }> = {
      "1D": { path: `/historical-chart/5min?symbol=${ticker}&from=${fromDate(1)}`,   ttl: 60_000      },
      "1S": { path: `/historical-chart/1hour?symbol=${ticker}&from=${fromDate(7)}`,  ttl: 300_000     },
      "1M": { path: `/historical-price-full?symbol=${ticker}&from=${fromDate(30)}`,  ttl: 3_600_000   },
      "1A": { path: `/historical-price-full?symbol=${ticker}&from=${fromDate(365)}`, ttl: 3_600_000   },
    };

    const { path, ttl } = cfg[period];
    const raw = await fmpFetch<unknown>(path, ttl);
    const pts: Array<{ date?: string; datetime?: string; close: number }> =
      Array.isArray(raw) ? raw : (raw as { historical?: unknown[] } | null)?.historical ?? [];

    return pts
      .reverse()
      .map(p => ({ t: new Date(p.date ?? p.datetime ?? "").getTime(), v: p.close }))
      .filter(p => !isNaN(p.t) && p.v > 0);
  },

  /** Recherche de tickers — utilise search-symbol si ticker exact, sinon search-name */
  async search(query: string): Promise<FmpSearchResult[]> {
    const q = encodeURIComponent(query);
    const [bySymbol, byName] = await Promise.all([
      fmpFetch<FmpSearchResult[]>(`/search-symbol?query=${q}&limit=8`, 30_000),
      fmpFetch<FmpSearchResult[]>(`/search-name?query=${q}&limit=8`, 30_000),
    ]);
    // Merge, déduplique par symbol, garde NASDAQ/NYSE en premier
    const seen = new Set<string>();
    const merged: FmpSearchResult[] = [];
    for (const r of [...(bySymbol ?? []), ...(byName ?? [])]) {
      if (!seen.has(r.symbol)) { seen.add(r.symbol); merged.push(r); }
    }
    return merged.slice(0, 12);
  },
};
