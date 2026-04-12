import { NextRequest, NextResponse } from "next/server";
import { fmpService } from "@/lib/fmp";
import { calcScore, scoreToStatus, AAOIFI_RULES } from "@/domain/aaoifi";
import type { Asset, ChartPeriod } from "@/domain/types";

const DEMO: Record<string, any> = {
  AAPL:   { name:"Apple Inc.",      sector:"Technologie",     country:"🇺🇸", mktCap:"2.94T", price:189.50, change:1.24,  divYield:0.51, divAnnual:0.96, divHaramPct:1.2, esgScore:78, beta:1.12, volatility:"Faible",  description:"Apple conçoit smartphones, Mac et services numériques.", ceo:"Tim Cook",        employees:"164 000",   ratioDebt:18, ratioRevHaram:1.2, ratioCash:12 },
  MSFT:   { name:"Microsoft Corp.", sector:"Technologie",     country:"🇺🇸", mktCap:"3.08T", price:415.20, change:0.83,  divYield:0.72, divAnnual:2.96, divHaramPct:0.8, esgScore:82, beta:0.90, volatility:"Faible",  description:"Microsoft développe Azure, Office 365 et Teams.",        ceo:"Satya Nadella",   employees:"221 000",   ratioDebt:14, ratioRevHaram:0.8, ratioCash:9  },
  TSLA:   { name:"Tesla Inc.",      sector:"Automobile",      country:"🇺🇸", mktCap:"558B",  price:175.30, change:-2.14, divYield:0,    divAnnual:0,    divHaramPct:0,   esgScore:61, beta:2.15, volatility:"Élevée",  description:"Tesla conçoit véhicules électriques et systèmes d'énergie.", ceo:"Elon Musk",    employees:"127 855",   ratioDebt:28, ratioRevHaram:0.5, ratioCash:22 },
  AMZN:   { name:"Amazon.com Inc.", sector:"Commerce",        country:"🇺🇸", mktCap:"2.01T", price:192.10, change:0.31,  divYield:0,    divAnnual:0,    divHaramPct:8.2, esgScore:55, beta:1.35, volatility:"Modérée", description:"Amazon e-commerce et cloud AWS.",                        ceo:"Andy Jassy",      employees:"1 541 000", ratioDebt:31, ratioRevHaram:8.2, ratioCash:18 },
  NKE:    { name:"Nike Inc.",       sector:"Sport & Lifestyle",country:"🇺🇸", mktCap:"140B",  price:94.70,  change:-0.52, divYield:1.78, divAnnual:1.68, divHaramPct:0.2, esgScore:71, beta:0.88, volatility:"Modérée", description:"Nike conçoit et commercialise équipements sportifs.",   ceo:"John Donahoe",    employees:"79 454",    ratioDebt:22, ratioRevHaram:0.2, ratioCash:14 },
};

function fmt(cap: number | undefined): string {
  if (!cap) return "N/A";
  if (cap >= 1e12) return `${(cap/1e12).toFixed(2)}T$`;
  if (cap >= 1e9)  return `${(cap/1e9).toFixed(2)}B$`;
  return `${(cap/1e6).toFixed(0)}M$`;
}
function vol(beta: number | undefined): "Faible"|"Modérée"|"Élevée" {
  const b = beta ?? 1;
  return b < 0.8 ? "Faible" : b < 1.4 ? "Modérée" : "Élevée";
}
function safe(n: any, decimals = 2): number {
  const v = parseFloat(n);
  return isNaN(v) ? 0 : +v.toFixed(decimals);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();
  const period = (req.nextUrl.searchParams.get("period") ?? "1M") as ChartPeriod;
  const isDemo = !process.env.FMP_API_KEY;

  try {
    // ── Mode DÉMO ───────────────────────────────────────────────
    if (isDemo) {
      const d = DEMO[ticker];
      if (!d) return NextResponse.json({ error: "Ticker non disponible en mode démo" }, { status: 404 });
      const score  = calcScore(d.ratioDebt, d.ratioRevHaram, d.ratioCash);
      const status = scoreToStatus(score);
      const asset: Asset = {
        ticker, type:"stock", status, score,
        scoreHistory: Array.from({length:8}, (_,i) => Math.max(0, Math.min(100, score - 7 + i))),
        periods: {"1D":[],"1S":[],"1M":[],"1A":[]},
        opportunities: false, newlyHalal: false,
        whyHalal: [
          { ok: d.sector !== "Finance",                         label: `Secteur : ${d.sector}`,              detail: `Activité ${d.sector !== "Finance" ? "licite" : "basée sur l'intérêt"}.` },
          { ok: d.ratioRevHaram < AAOIFI_RULES.HARAM_REVENUE_MAX, label: `Revenus haram : ${d.ratioRevHaram}%`, detail: `Seuil AAOIFI : ${AAOIFI_RULES.HARAM_REVENUE_MAX}%.` },
          { ok: d.ratioDebt     < AAOIFI_RULES.DEBT_MAX,          label: `Ratio dette : ${d.ratioDebt}%`,      detail: `Seuil AAOIFI : ${AAOIFI_RULES.DEBT_MAX}%.` },
          { ok: d.ratioCash     < AAOIFI_RULES.CASH_MAX,          label: `Liquidités : ${d.ratioCash}%`,       detail: `Seuil AAOIFI : ${AAOIFI_RULES.CASH_MAX}%.` },
        ],
        ...d,
      };
      return NextResponse.json({ asset, history:{"1D":[],"1S":[],"1M":[],"1A":[]}, ratios:null });
    }

    // ── Mode PRODUCTION ─────────────────────────────────────────
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

    // Champs FMP /stable/ — certains peuvent être undefined, on utilise safe()
    const asset: Asset = {
      ticker,
      name:          profile.companyName ?? ticker,
      type:          "stock",
      sector:        profile.sector       ?? "N/A",
      country:       profile.country      ?? "🌍",
      mktCap:        fmt(quote.marketCap),
      price:         safe(quote.price),
      change:        safe(quote.changesPercentage ?? (quote as any).change ?? 0),
      divYield:      safe((profile.dividendYield ?? 0) * 100),
      divAnnual:     safe(profile.lastDiv ?? 0),
      divHaramPct:   rHaram,
      status, score,
      esgScore:      70,
      ratioDebt:     rDebt,
      ratioRevHaram: rHaram,
      ratioCash:     rCash,
      scoreHistory:  ratios?.map(r => r.score).slice(0, 8) ?? [],
      periods:       { "1D":[], "1S":[], "1M":[], "1A":[], [period]: history } as any,
      volatility:    vol(profile.beta ?? quote.beta),
      beta:          safe(profile.beta ?? quote.beta ?? 1),
      description:   profile.description,
      ceo:           profile.ceo,
      employees:     profile.fullTimeEmployees?.toLocaleString("fr-FR"),
      opportunities: false,
      newlyHalal:    false,
      whyHalal: [
        { ok: profile.sector !== "Finance",  label: `Secteur : ${profile.sector}`, detail: `Activité ${profile.sector !== "Finance" ? "licite" : "basée sur l'intérêt"}.` },
        { ok: rHaram < AAOIFI_RULES.HARAM_REVENUE_MAX, label: `Revenus haram : ${rHaram}%`, detail: `Seuil AAOIFI max ${AAOIFI_RULES.HARAM_REVENUE_MAX}%.` },
        { ok: rDebt  < AAOIFI_RULES.DEBT_MAX,          label: `Ratio dette : ${rDebt}%`,   detail: `Seuil AAOIFI max ${AAOIFI_RULES.DEBT_MAX}%.` },
        { ok: rCash  < AAOIFI_RULES.CASH_MAX,          label: `Liquidités : ${rCash}%`,    detail: `Seuil AAOIFI max ${AAOIFI_RULES.CASH_MAX}%.` },
      ],
    };

    return NextResponse.json(
      { asset, history: { "1D":[], "1S":[], "1M":[], "1A":[], [period]: history } as any, ratios },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (err) {
    console.error("[API/stock]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
