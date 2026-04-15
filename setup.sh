#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# HalalScreen — Script de configuration automatique
# Lance ce script depuis la racine de ton projet Next.js
# ═══════════════════════════════════════════════════════════════════

set -e
echo "🕌 HalalScreen — Configuration en cours..."

# ── Dépendances ───────────────────────────────────────────────────
echo "📦 Installation des dépendances..."
npm install zustand immer swr @supabase/supabase-js

# ── Dossiers ──────────────────────────────────────────────────────
echo "📁 Création des dossiers..."
mkdir -p src/domain
mkdir -p src/lib
mkdir -p src/store
mkdir -p src/hooks
mkdir -p "src/app/api/stock/[ticker]"
mkdir -p src/app/api/search
mkdir -p "src/app/api/subscription/validate"
mkdir -p src/app/api/screening/increment

# ── src/domain/types.ts ───────────────────────────────────────────
cat > src/domain/types.ts << 'TYPES_EOF'
export type ComplianceStatus = "halal" | "douteux" | "non-halal";
export type AssetType        = "stock" | "etf";
export type ChartPeriod      = "1D" | "1S" | "1M" | "1A";

export interface ChartPoint { t: number; v: number; }

export interface AAOIFIRatios {
  rDebt:     number;
  rHaram:    number;
  rCash:     number;
  pass:      boolean;
  score:     number;
  period:    string;
  date:      string;
  assets:    number | null;
  debt:      number | null;
  cash:      number | null;
  intIncome: number | null;
  revenue:   number | null;
}

export interface Asset {
  ticker:        string;
  name:          string;
  type:          AssetType;
  sector:        string;
  country:       string;
  mktCap:        string;
  price:         number;
  change:        number;
  divYield:      number;
  divAnnual:     number;
  divHaramPct:   number;
  status:        ComplianceStatus;
  score:         number;
  esgScore:      number;
  ratioDebt:     number;
  ratioRevHaram: number;
  ratioCash:     number;
  scoreHistory:  number[];
  periods:       Record<ChartPeriod, ChartPoint[]>;
  volatility:    "Faible" | "Modérée" | "Élevée";
  beta:          number;
  description?:  string;
  ceo?:          string;
  employees?:    string;
  opportunities: boolean;
  newlyHalal:    boolean;
  whyHalal:      Array<{ ok: boolean; label: string; detail: string }>;
  provider?:     string;
  ter?:          string;
  positions?:    number;
  region?:       string;
  aum?:          string;
}

export interface PortfolioItem extends Asset {
  qty:       number;
  paidPrice: number;
  _id:       string | null;
}

export interface PortfolioMetrics {
  value:    number;
  invested: number;
  gain:     number;
  gainPct:  number;
  conform:  number;
  divers:   number;
  risk:     number;
  esg:      number;
  divTot:   number;
  divHar:   number;
  sectors:  Record<string, number>;
}

export interface StockApiResponse {
  asset:   Asset;
  history: Record<ChartPeriod, ChartPoint[]>;
  ratios:  AAOIFIRatios[] | null;
}
TYPES_EOF

# ── src/domain/aaoifi.ts ──────────────────────────────────────────
cat > src/domain/aaoifi.ts << 'AAOIFI_EOF'
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
AAOIFI_EOF

# ── src/lib/fmp.ts ────────────────────────────────────────────────
cat > src/lib/fmp.ts << 'FMP_EOF'
import type { ChartPeriod, ChartPoint } from "@/domain/types";
import { parseAAOIFIFromFMP } from "@/domain/aaoifi";

const FMP_BASE = "https://financialmodelingprep.com/api";
const FMP_KEY  = process.env.FMP_API_KEY ?? "";

const cache = new Map<string, { data: unknown; expiresAt: number }>();

async function fmpFetch<T>(path: string, ttlMs = 300_000): Promise<T | null> {
  if (!FMP_KEY) {
    console.warn("[FMP] FMP_API_KEY manquante — mode démo actif");
    return null;
  }
  const cacheKey = path;
  const cached   = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data as T;
  try {
    const url = `${FMP_BASE}${path}${path.includes("?")?"&":"?"}apikey=${FMP_KEY}`;
    const res = await fetch(url, { next: { revalidate: Math.floor(ttlMs/1000) } });
    if (!res.ok) { console.error(`[FMP] ${res.status} ${path}`); return null; }
    const data = await res.json();
    if (data?.["Error Message"]) return null;
    cache.set(cacheKey, { data, expiresAt: Date.now() + ttlMs });
    return data as T;
  } catch (err) {
    console.error("[FMP] erreur:", err);
    return null;
  }
}

export const fmpService = {
  async getQuote(ticker: string) {
    const d = await fmpFetch<Array<{ symbol:string; price:number; changesPercentage:number; marketCap:number; beta:number }>>(
      `/v3/quote/${ticker}`, 60_000
    );
    return d?.[0] ?? null;
  },
  async getProfile(ticker: string) {
    const d = await fmpFetch<Array<{ companyName:string; description:string; ceo:string; fullTimeEmployees:number; sector:string; country:string; exchangeShortName:string; dividendYield:number; lastDiv:number; beta:number }>>(
      `/v3/profile/${ticker}`, 86_400_000
    );
    return d?.[0] ?? null;
  },
  async getBalanceSheets(ticker: string) {
    return fmpFetch<Array<{ date:string; calendarYear:string; period:string; totalAssets:number; shortTermDebt:number; longTermDebt:number; cashAndCashEquivalents:number }>>(
      `/v3/balance-sheet-statement/${ticker}?period=quarter&limit=8`, 6*3_600_000
    );
  },
  async getIncomeStatements(ticker: string) {
    return fmpFetch<Array<{ date:string; calendarYear:string; period:string; revenue:number; netIncome:number; interestIncome:number }>>(
      `/v3/income-statement/${ticker}?period=quarter&limit=8`, 6*3_600_000
    );
  },
  async getPriceHistory(ticker: string, period: ChartPeriod): Promise<ChartPoint[]> {
    const now  = new Date();
    const from = (days: number) => new Date(now.getTime()-days*86_400_000).toISOString().split("T")[0];
    const cfg = {
      "1D": { intraday:true,  interval:"5min",  from:from(1),   ttl:60_000 },
      "1S": { intraday:true,  interval:"1hour", from:from(7),   ttl:300_000 },
      "1M": { intraday:false, interval:"",      from:from(30),  ttl:3_600_000 },
      "1A": { intraday:false, interval:"",      from:from(365), ttl:3_600_000 },
    };
    const { intraday, interval, from: fromDate, ttl } = cfg[period];
    const url = intraday
      ? `/v3/historical-chart/${interval}/${ticker}?from=${fromDate}`
      : `/v3/historical-price-full/${ticker}?from=${fromDate}`;
    const raw = await fmpFetch<any>(url, ttl);
    const pts = Array.isArray(raw) ? raw : (raw?.historical ?? []);
    return pts.reverse().map((p: any) => ({ t: new Date(p.date??p.datetime).getTime(), v: p.close }));
  },
  async getAAOIFIRatios(ticker: string) {
    const [balances, incomes] = await Promise.all([
      this.getBalanceSheets(ticker),
      this.getIncomeStatements(ticker),
    ]);
    if (!balances || !incomes) return null;
    return parseAAOIFIFromFMP(balances, incomes);
  },
  async getSecFilings(ticker: string) {
    return fmpFetch<Array<{ type:string; filingDate:string; finalLink:string }>>(
      `/v3/sec_filings/${ticker}?type=10-K&limit=5`, 86_400_000
    );
  },
  async search(query: string) {
    return fmpFetch<Array<{ symbol:string; name:string; exchangeShortName:string }>>(
      `/v3/search?query=${encodeURIComponent(query)}&limit=10&exchange=NASDAQ,NYSE,EURONEXT`, 30_000
    );
  },
};
FMP_EOF

# ── src/app/api/stock/[ticker]/route.ts ───────────────────────────
cat > "src/app/api/stock/[ticker]/route.ts" << 'ROUTE_EOF'
import { NextRequest, NextResponse } from "next/server";
import { fmpService } from "@/lib/fmp";
import { calcScore, scoreToStatus, AAOIFI_RULES } from "@/domain/aaoifi";
import type { Asset, ChartPeriod } from "@/domain/types";

// Données de démo — utilisées si FMP_API_KEY n'est pas définie
const DEMO: Record<string, Partial<Asset> & { ratioDebt:number; ratioRevHaram:number; ratioCash:number }> = {
  AAPL: { name:"Apple Inc.", sector:"Technologie", country:"🇺🇸", mktCap:"2.94T", price:189.50, change:1.24, divYield:0.51, divAnnual:0.96, divHaramPct:1.2, esgScore:78, beta:1.12, volatility:"Faible", description:"Apple conçoit smartphones, Mac et services numériques.", ceo:"Tim Cook", employees:"164 000", ratioDebt:18, ratioRevHaram:1.2, ratioCash:12 },
  MSFT: { name:"Microsoft Corp.", sector:"Technologie", country:"🇺🇸", mktCap:"3.08T", price:415.20, change:0.83, divYield:0.72, divAnnual:2.96, divHaramPct:0.8, esgScore:82, beta:0.90, volatility:"Faible", description:"Microsoft développe Azure, Office 365 et Teams.", ceo:"Satya Nadella", employees:"221 000", ratioDebt:14, ratioRevHaram:0.8, ratioCash:9 },
  TSLA: { name:"Tesla Inc.", sector:"Automobile", country:"🇺🇸", mktCap:"558B", price:175.30, change:-2.14, divYield:0, divAnnual:0, divHaramPct:0, esgScore:61, beta:2.15, volatility:"Élevée", description:"Tesla conçoit véhicules électriques et systèmes d'énergie.", ceo:"Elon Musk", employees:"127 855", ratioDebt:28, ratioRevHaram:0.5, ratioCash:22 },
  AMZN: { name:"Amazon.com Inc.", sector:"Commerce", country:"🇺🇸", mktCap:"2.01T", price:192.10, change:0.31, divYield:0, divAnnual:0, divHaramPct:8.2, esgScore:55, beta:1.35, volatility:"Modérée", description:"Amazon e-commerce et cloud AWS.", ceo:"Andy Jassy", employees:"1 541 000", ratioDebt:31, ratioRevHaram:8.2, ratioCash:18 },
  NKE:  { name:"Nike Inc.", sector:"Sport & Lifestyle", country:"🇺🇸", mktCap:"140B", price:94.70, change:-0.52, divYield:1.78, divAnnual:1.68, divHaramPct:0.2, esgScore:71, beta:0.88, volatility:"Modérée", description:"Nike conçoit et commercialise équipements sportifs.", ceo:"John Donahoe", employees:"79 454", ratioDebt:22, ratioRevHaram:0.2, ratioCash:14 },
};

function fmt(cap: number): string {
  if (cap >= 1e12) return `${(cap/1e12).toFixed(2)}T$`;
  if (cap >= 1e9)  return `${(cap/1e9).toFixed(2)}B$`;
  return `${(cap/1e6).toFixed(0)}M$`;
}
function vol(beta: number): "Faible"|"Modérée"|"Élevée" {
  return beta < 0.8 ? "Faible" : beta < 1.4 ? "Modérée" : "Élevée";
}

export async function GET(req: NextRequest, { params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase();
  const period = (req.nextUrl.searchParams.get("period") ?? "1M") as ChartPeriod;
  const isDemo = !process.env.FMP_API_KEY;

  try {
    // ── Mode DÉMO (sans clé FMP) ────────────────────────────────
    if (isDemo) {
      const d = DEMO[ticker];
      if (!d) return NextResponse.json({ error: "Ticker non disponible en mode démo" }, { status: 404 });
      const score  = calcScore(d.ratioDebt, d.ratioRevHaram, d.ratioCash);
      const status = scoreToStatus(score);
      const asset: Asset = {
        ticker, type:"stock", status, score,
        scoreHistory: Array.from({length:8},(_,i)=>Math.max(0,Math.min(100,score-7+i))),
        periods: {"1D":[],"1S":[],"1M":[],"1A":[]},
        opportunities: false, newlyHalal: false,
        whyHalal: [
          { ok: d.sector !== "Finance", label: `Secteur : ${d.sector}`, detail: `Activité ${d.sector !== "Finance" ? "licite" : "basée sur l'intérêt"}.` },
          { ok: d.ratioRevHaram < AAOIFI_RULES.HARAM_REVENUE_MAX, label: `Revenus haram : ${d.ratioRevHaram}%`, detail: `Seuil AAOIFI : ${AAOIFI_RULES.HARAM_REVENUE_MAX}%.` },
          { ok: d.ratioDebt < AAOIFI_RULES.DEBT_MAX, label: `Ratio dette : ${d.ratioDebt}%`, detail: `Seuil AAOIFI : ${AAOIFI_RULES.DEBT_MAX}%.` },
          { ok: d.ratioCash < AAOIFI_RULES.CASH_MAX, label: `Liquidités : ${d.ratioCash}%`, detail: `Seuil AAOIFI : ${AAOIFI_RULES.CASH_MAX}%.` },
        ],
        ...d as any,
      };
      return NextResponse.json({ asset, history:{"1D":[],"1S":[],"1M":[],"1A":[]}, ratios:null });
    }

    // ── Mode PRODUCTION (avec clé FMP) ──────────────────────────
    const [quote, profile, ratios, history] = await Promise.all([
      fmpService.getQuote(ticker),
      fmpService.getProfile(ticker),
      fmpService.getAAOIFIRatios(ticker),
      fmpService.getPriceHistory(ticker, period),
    ]);

    if (!quote || !profile) {
      return NextResponse.json({ error: "Ticker introuvable" }, { status: 404 });
    }

    const latest = ratios?.[0];
    const rDebt  = latest?.rDebt  ?? 20;
    const rHaram = latest?.rHaram ?? 0;
    const rCash  = latest?.rCash  ?? 15;
    const score  = calcScore(rDebt, rHaram, rCash);
    const status = scoreToStatus(score);

    const asset: Asset = {
      ticker,
      name:          profile.companyName,
      type:          "stock",
      sector:        profile.sector || "N/A",
      country:       profile.country || "🌍",
      mktCap:        fmt(quote.marketCap),
      price:         quote.price,
      change:        +quote.changesPercentage.toFixed(2),
      divYield:      +(profile.dividendYield * 100 || 0).toFixed(2),
      divAnnual:     profile.lastDiv || 0,
      divHaramPct:   rHaram,
      status, score,
      esgScore:      70,
      ratioDebt:     rDebt,
      ratioRevHaram: rHaram,
      ratioCash:     rCash,
      scoreHistory:  ratios?.map(r=>r.score).slice(0,8) ?? [],
      periods:       {"1D":[],"1S":[],"1M":[],"1A":[], [period]: history} as any,
      volatility:    vol(profile.beta),
      beta:          profile.beta || 1,
      description:   profile.description,
      ceo:           profile.ceo,
      employees:     profile.fullTimeEmployees?.toLocaleString("fr-FR"),
      opportunities: false,
      newlyHalal:    false,
      whyHalal: [
        { ok: profile.sector !== "Finance", label: `Secteur : ${profile.sector}`, detail: `Activité ${profile.sector !== "Finance" ? "licite" : "basée sur l'intérêt"}.` },
        { ok: rHaram < AAOIFI_RULES.HARAM_REVENUE_MAX, label: `Revenus haram : ${rHaram}%`, detail: `Seuil AAOIFI max ${AAOIFI_RULES.HARAM_REVENUE_MAX}%.` },
        { ok: rDebt  < AAOIFI_RULES.DEBT_MAX,          label: `Ratio dette : ${rDebt}%`,   detail: `Seuil AAOIFI max ${AAOIFI_RULES.DEBT_MAX}%.` },
        { ok: rCash  < AAOIFI_RULES.CASH_MAX,          label: `Liquidités : ${rCash}%`,    detail: `Seuil AAOIFI max ${AAOIFI_RULES.CASH_MAX}%.` },
      ],
    };

    return NextResponse.json(
      { asset, history:{"1D":[],"1S":[],"1M":[],"1A":[], [period]:history} as any, ratios },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (err) {
    console.error("[API/stock]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
ROUTE_EOF

# ── src/app/api/search/route.ts ───────────────────────────────────
cat > src/app/api/search/route.ts << 'SEARCH_EOF'
import { NextRequest, NextResponse } from "next/server";
import { fmpService } from "@/lib/fmp";

const DEMO_TICKERS = [
  { ticker:"AAPL", name:"Apple Inc.",      exchange:"NASDAQ" },
  { ticker:"MSFT", name:"Microsoft Corp.", exchange:"NASDAQ" },
  { ticker:"TSLA", name:"Tesla Inc.",      exchange:"NASDAQ" },
  { ticker:"AMZN", name:"Amazon.com",      exchange:"NASDAQ" },
  { ticker:"NKE",  name:"Nike Inc.",       exchange:"NYSE"   },
];

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  if (!process.env.FMP_API_KEY) {
    const results = DEMO_TICKERS.filter(t =>
      t.ticker.toLowerCase().includes(q.toLowerCase()) ||
      t.name.toLowerCase().includes(q.toLowerCase())
    );
    return NextResponse.json({ results });
  }

  try {
    const data = await fmpService.search(q);
    return NextResponse.json({
      results: (data ?? []).map(r => ({ ticker:r.symbol, name:r.name, exchange:r.exchangeShortName })),
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
SEARCH_EOF

# ── src/app/api/subscription/validate/route.ts ───────────────────
mkdir -p src/app/api/subscription/validate
cat > src/app/api/subscription/validate/route.ts << 'SUB_EOF'
import { NextResponse } from "next/server";

// TODO étape 3 : vérifier le JWT Supabase + table subscriptions
// const { data } = await supabase.auth.getUser(token)
// const { data: sub } = await supabase.from("subscriptions").select("status").eq("user_id", user.id).single()

export async function GET() {
  return NextResponse.json({ isPremium: false, screeningsRemaining: 3 });
}
SUB_EOF

# ── src/app/api/screening/increment/route.ts ─────────────────────
mkdir -p src/app/api/screening/increment
cat > src/app/api/screening/increment/route.ts << 'INC_EOF'
import { NextResponse } from "next/server";

// TODO étape 3 : incrémenter côté serveur via Supabase RPC
// await supabase.rpc("increment_screenings", { p_user_id, p_date })

export async function POST() {
  return NextResponse.json({ allowed: true, remaining: 2 });
}
INC_EOF

# ── src/store/usePortfolioStore.ts ────────────────────────────────
cat > src/store/usePortfolioStore.ts << 'STORE_EOF'
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { computePortfolioMetrics, calcPurification } from "@/domain/aaoifi";
import type { PortfolioItem, PortfolioMetrics, Asset } from "@/domain/types";

interface PortfolioState {
  holdings:     PortfolioItem[];
  metrics:      PortfolioMetrics;
  purified:     Array<{ date: string; amount: number }>;
  add:          (asset: Asset) => void;
  remove:       (ticker: string) => void;
  updateQty:    (ticker: string, qty: number) => void;
  setHoldings:  (items: PortfolioItem[]) => void;
  markPurified: (amount: number) => void;
  inPortfolio:  (ticker: string) => boolean;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    immer((set, get) => ({
      holdings: [],
      metrics:  computePortfolioMetrics([]),
      purified: [],
      add: (asset) => set(state => {
        if (state.holdings.find(h => h.ticker === asset.ticker)) return;
        const item: PortfolioItem = { ...asset, qty:1, paidPrice:asset.price, _id:null };
        state.holdings.push(item);
        state.metrics = computePortfolioMetrics(state.holdings);
      }),
      remove: (ticker) => set(state => {
        state.holdings = state.holdings.filter(h => h.ticker !== ticker);
        state.metrics  = computePortfolioMetrics(state.holdings);
      }),
      updateQty: (ticker, qty) => set(state => {
        const item = state.holdings.find(h => h.ticker === ticker);
        if (item) { item.qty = qty; state.metrics = computePortfolioMetrics(state.holdings); }
      }),
      setHoldings: (items) => set(state => {
        state.holdings = items;
        state.metrics  = computePortfolioMetrics(items);
      }),
      markPurified: (amount) => set(state => {
        state.purified.push({ date: new Date().toISOString(), amount });
      }),
      inPortfolio: (ticker) => get().holdings.some(h => h.ticker === ticker),
    })),
    {
      name:    "hs-portfolio",
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({ holdings: s.holdings, purified: s.purified }),
      onRehydrateStorage: () => state => {
        if (state) state.metrics = computePortfolioMetrics(state.holdings);
      },
    }
  )
);

// ── Watchlist ─────────────────────────────────────────────────────
import type { Asset as A } from "@/domain/types";
interface WatchlistState {
  items:   A[];
  add:    (a: A) => void;
  remove: (ticker: string) => void;
  toggle: (a: A) => void;
  inList: (ticker: string) => boolean;
  sorted: () => A[];
}
export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],
      add:    (a) => set(s => ({ items: s.items.find(x=>x.ticker===a.ticker) ? s.items : [...s.items,a] })),
      remove: (t) => set(s => ({ items: s.items.filter(x=>x.ticker!==t) })),
      toggle: (a) => { const {add,remove,inList}=get(); inList(a.ticker)?remove(a.ticker):add(a); },
      inList: (t) => get().items.some(x=>x.ticker===t),
      sorted: ()  => [...get().items].sort((a,b)=>b.score-a.score),
    }),
    { name: "hs-watchlist" }
  )
);

// ── User ──────────────────────────────────────────────────────────
interface UserState {
  id:          string;
  email:       string | null;
  isPremium:   boolean;
  screenings:  number;
  isValidated: boolean;
  setIsPremium:  (v: boolean) => void;
  incScreenings: () => void;
  setUser:       (u: Partial<UserState>) => void;
  reset:         () => void;
}
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      id:"guest", email:null, isPremium:false, screenings:0, isValidated:false,
      setIsPremium:  (v) => set({ isPremium:v }),
      incScreenings: ()  => set(s => ({ screenings:s.screenings+1 })),
      setUser:       (u) => set(s => ({...s,...u})),
      reset:         ()  => set({ id:"guest",email:null,isPremium:false,screenings:0,isValidated:false }),
    }),
    {
      name: "hs-user",
      // isPremium est toujours revalidé serveur — localStorage = cache d'affichage uniquement
      partialize: s => ({ id:s.id, email:s.email, screenings:s.screenings }),
    }
  )
);
STORE_EOF

# ── src/hooks/useStock.ts ─────────────────────────────────────────
cat > src/hooks/useStock.ts << 'HOOKS_EOF'
"use client";
import useSWR from "swr";
import { useEffect } from "react";
import { useUserStore } from "@/store/usePortfolioStore";
import type { StockApiResponse, ChartPeriod } from "@/domain/types";

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

export function useStock(ticker: string | null, period: ChartPeriod = "1M") {
  return useSWR<StockApiResponse>(
    ticker ? `/api/stock/${ticker}?period=${period}` : null,
    fetcher,
    { revalidateOnFocus:false, dedupingInterval:60_000 }
  );
}

export function useSearch(query: string) {
  return useSWR(
    query.length >= 2 ? `/api/search?q=${encodeURIComponent(query)}` : null,
    fetcher,
    { revalidateOnFocus:false, dedupingInterval:30_000 }
  );
}

export function useSyncPremium() {
  const setUser = useUserStore(s => s.setUser);
  const { data } = useSWR("/api/subscription/validate", fetcher, {
    revalidateOnFocus:     true,
    dedupingInterval:      300_000,
  });
  useEffect(() => {
    if (data) setUser({ isPremium: data.isPremium, isValidated: true });
  }, [data, setUser]);
}
HOOKS_EOF

# ── .env.local ────────────────────────────────────────────────────
cat > .env.local << 'ENV_EOF'
# ─── Variables d'environnement HalalScreen ───────────────────────
# ⚠️  Ne jamais committer ce fichier (déjà dans .gitignore)

# Supabase — récupérer sur supabase.com → Settings → API
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Financial Modeling Prep — financialmodelingprep.com → Dashboard
# Sans cette clé, l'app tourne en mode démo avec données simulées
FMP_API_KEY=

# Stripe — dashboard.stripe.com → Developers → API keys
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# App
APP_URL=http://localhost:3000
ENV_EOF

# ── .gitignore — s'assurer que .env.local est ignoré ─────────────
if ! grep -q ".env.local" .gitignore 2>/dev/null; then
  echo ".env.local" >> .gitignore
fi

# ── tsconfig.json — ajouter alias @ ──────────────────────────────
node -e "
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('tsconfig.json','utf8'));
cfg.compilerOptions = cfg.compilerOptions || {};
cfg.compilerOptions.paths = { '@/*': ['./src/*'] };
fs.writeFileSync('tsconfig.json', JSON.stringify(cfg, null, 2));
console.log('tsconfig.json mis à jour');
"

echo ""
echo "✅ HalalScreen configuré avec succès !"
echo ""
echo "📋 Prochaines étapes :"
echo "   1. Ouvre .env.local et colle tes clés Supabase"
echo "   2. Lance : npm run dev"
echo "   3. Teste : http://localhost:3000/api/stock/AAPL"
echo ""
