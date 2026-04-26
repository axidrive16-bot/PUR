import { NextRequest, NextResponse } from "next/server";
import { fmpService, FMP_AVAILABLE, buildMockAsset } from "@/services/market";
import { AAOIFI_RULES, calcScore, scoreToStatus } from "@/domain/aaoifi";
import type { Asset, ChartPeriod } from "@/domain/types";

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
function safe(n: unknown, decimals = 2): number {
  const v = parseFloat(String(n));
  return isNaN(v) ? 0 : +v.toFixed(decimals);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();
  const period = (req.nextUrl.searchParams.get("period") ?? "1M") as ChartPeriod;

  try {
    // ── Mode DÉMO ───────────────────────────────────────────────
    if (!FMP_AVAILABLE) {
      const asset = buildMockAsset(ticker);
      if (!asset) return NextResponse.json({ error: "Ticker non disponible en mode démo" }, { status: 404 });
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
      change:        safe(quote.changePercentage ?? 0),
      divYield:      profile.lastDividend && profile.price
                       ? safe((profile.lastDividend / profile.price) * 100)
                       : 0,
      divAnnual:     safe(profile.lastDividend ?? 0),
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
