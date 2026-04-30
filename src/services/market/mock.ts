/**
 * Données de démonstration utilisées quand FMP_API_KEY est absent.
 * Permet de tester l'UI sans clé API.
 */
import { calcScore, scoreToStatus, AAOIFI_RULES } from "@/domain/aaoifi";
import type { Asset } from "@/domain/types";

export interface MockEntry {
  name:          string;
  sector:        string;
  country:       string;
  mktCap:        string;
  price:         number;
  change:        number;
  divYield:      number;
  divAnnual:     number;
  divHaramPct:   number;
  esgScore:      number;
  beta:          number;
  volatility:    "Faible" | "Modérée" | "Élevée";
  description:   string;
  ceo:           string;
  employees:     string;
  ratioDebt:     number;
  ratioRevHaram: number;
  ratioCash:     number;
}

export const MOCK_DATA: Record<string, MockEntry> = {
  AAPL:  { name:"Apple Inc.",         sector:"Technologie",      country:"🇺🇸", mktCap:"2.94T$", price:189.50, change:+1.24, divYield:0.51, divAnnual:0.96, divHaramPct:1.2, esgScore:78, beta:1.12, volatility:"Faible",  description:"Apple conçoit smartphones, Mac et services numériques.",           ceo:"Tim Cook",       employees:"164 000",    ratioDebt:18, ratioRevHaram:1.2, ratioCash:12 },
  MSFT:  { name:"Microsoft Corp.",    sector:"Technologie",      country:"🇺🇸", mktCap:"3.08T$", price:415.20, change:+0.83, divYield:0.72, divAnnual:2.96, divHaramPct:0.8, esgScore:82, beta:0.90, volatility:"Faible",  description:"Microsoft développe Azure, Office 365 et Teams.",                  ceo:"Satya Nadella",  employees:"221 000",    ratioDebt:14, ratioRevHaram:0.8, ratioCash:9  },
  TSLA:  { name:"Tesla Inc.",         sector:"Automobile",       country:"🇺🇸", mktCap:"558B$",  price:175.30, change:-2.14, divYield:0,    divAnnual:0,    divHaramPct:0,   esgScore:61, beta:2.15, volatility:"Élevée",  description:"Tesla conçoit véhicules électriques et systèmes d'énergie.",      ceo:"Elon Musk",      employees:"127 855",    ratioDebt:28, ratioRevHaram:0.5, ratioCash:22 },
  AMZN:  { name:"Amazon.com Inc.",    sector:"Commerce",         country:"🇺🇸", mktCap:"2.01T$", price:192.10, change:+0.31, divYield:0,    divAnnual:0,    divHaramPct:8.2, esgScore:55, beta:1.35, volatility:"Modérée", description:"Amazon e-commerce et cloud AWS.",                                   ceo:"Andy Jassy",     employees:"1 541 000",  ratioDebt:31, ratioRevHaram:8.2, ratioCash:18 },
  NKE:   { name:"Nike Inc.",          sector:"Sport & Lifestyle",country:"🇺🇸", mktCap:"140B$",  price:94.70,  change:-0.52, divYield:1.78, divAnnual:1.68, divHaramPct:0.2, esgScore:71, beta:0.88, volatility:"Modérée", description:"Nike conçoit et commercialise équipements sportifs.",              ceo:"John Donahoe",   employees:"79 454",     ratioDebt:22, ratioRevHaram:0.2, ratioCash:14 },
  NOVO:  { name:"Novo Nordisk",       sector:"Santé",            country:"🇩🇰", mktCap:"410B$",  price:88.40,  change:+2.31, divYield:1.05, divAnnual:0.92, divHaramPct:0.3, esgScore:86, beta:0.65, volatility:"Faible",  description:"Novo Nordisk est leader mondial dans l'insuline et l'obésité.",  ceo:"Lars Fruergaard", employees:"55 990",    ratioDebt:20, ratioRevHaram:0.3, ratioCash:10 },
  OR:    { name:"L'Oréal",            sector:"Cosmétiques",      country:"🇫🇷", mktCap:"185B$",  price:412.30, change:+0.55, divYield:1.60, divAnnual:6.60, divHaramPct:0.1, esgScore:81, beta:0.72, volatility:"Faible",  description:"L'Oréal est le leader mondial des cosmétiques.",                  ceo:"Nicolas Hieronimus", employees:"87 400", ratioDebt:12, ratioRevHaram:0.1, ratioCash:8  },
  ASML:  { name:"ASML Holding",       sector:"Semi-conducteurs", country:"🇳🇱", mktCap:"305B$",  price:750.20, change:+1.10, divYield:0.90, divAnnual:6.80, divHaramPct:0.2, esgScore:79, beta:1.05, volatility:"Modérée", description:"ASML fabrique les machines lithographiques pour puces.",         ceo:"Christophe Fouquet", employees:"42 000", ratioDebt:16, ratioRevHaram:0.2, ratioCash:15 },
  GOOGL: { name:"Alphabet Inc.",      sector:"Technologie",      country:"🇺🇸", mktCap:"2.15T$", price:165.80, change:+0.90, divYield:0,    divAnnual:0,    divHaramPct:2.1, esgScore:68, beta:1.05, volatility:"Modérée", description:"Alphabet développe Google Search, YouTube et Cloud.",            ceo:"Sundar Pichai",  employees:"182 381",    ratioDebt:8,  ratioRevHaram:2.1, ratioCash:22 },
  META:  { name:"Meta Platforms",     sector:"Technologie",      country:"🇺🇸", mktCap:"1.28T$", price:500.10, change:+1.30, divYield:0.43, divAnnual:2.00, divHaramPct:1.5, esgScore:52, beta:1.28, volatility:"Modérée", description:"Meta développe Facebook, Instagram et Oculus.",                  ceo:"Mark Zuckerberg", employees:"67 317",   ratioDebt:6,  ratioRevHaram:1.5, ratioCash:30 },
  NVDA:  { name:"NVIDIA Corp.",       sector:"Semi-conducteurs", country:"🇺🇸", mktCap:"2.20T$", price:880.50, change:+2.50, divYield:0.04, divAnnual:0.40, divHaramPct:0.1, esgScore:72, beta:1.68, volatility:"Élevée",  description:"NVIDIA conçoit GPU et plateformes IA.",                          ceo:"Jensen Huang",   employees:"29 600",     ratioDebt:12, ratioRevHaram:0.1, ratioCash:18 },
  TTE:   { name:"TotalEnergies",      sector:"Énergie",          country:"🇫🇷", mktCap:"148B$",  price:59.40,  change:-0.30, divYield:3.80, divAnnual:2.28, divHaramPct:0.4, esgScore:63, beta:0.82, volatility:"Modérée", description:"TotalEnergies est une compagnie pétrolière et gazière.",         ceo:"Patrick Pouyanné", employees:"101 309",  ratioDebt:29, ratioRevHaram:0.4, ratioCash:7  },
};

/** Tickers disponibles en mode démo */
export const MOCK_TICKERS = Object.entries(MOCK_DATA).map(([ticker, d]) => ({
  ticker,
  name: d.name,
  exchange: d.country === "🇺🇸" ? "NASDAQ/NYSE" : "EU",
}));

/** Construit un Asset complet depuis les données mock */
export function buildMockAsset(ticker: string): Asset | null {
  const d = MOCK_DATA[ticker.toUpperCase()];
  if (!d) return null;

  const score  = calcScore(d.ratioDebt, d.ratioRevHaram, d.ratioCash);
  const status = scoreToStatus(score);

  return {
    ticker: ticker.toUpperCase(),
    type: "stock",
    name:          d.name,
    sector:        d.sector,
    country:       d.country,
    mktCap:        d.mktCap,
    price:         d.price,
    change:        d.change,
    divYield:      d.divYield,
    divAnnual:     d.divAnnual,
    divHaramPct:   d.divHaramPct,
    esgScore:      d.esgScore,
    beta:          d.beta,
    volatility:    d.volatility,
    description:   d.description,
    ceo:           d.ceo,
    employees:     d.employees,
    ratioDebt:     d.ratioDebt,
    ratioRevHaram: d.ratioRevHaram,
    ratioCash:     d.ratioCash,
    status,
    score,
    scoreHistory: Array.from({ length: 8 }, (_, i) =>
      Math.max(0, Math.min(100, score - 6 + i))
    ),
    periods:      { "1D": [], "1S": [], "1M": [], "1A": [] },
    opportunities: false,
    newlyHalal:    false,
    whyHalal: [
      { ok: d.sector !== "Finance",                             label: `Secteur : ${d.sector}`,              detail: `Activité ${d.sector !== "Finance" ? "licite" : "basée sur l'intérêt"}.` },
      { ok: d.ratioRevHaram < AAOIFI_RULES.HARAM_REVENUE_MAX,  label: `Revenus haram : ${d.ratioRevHaram}%`, detail: `Seuil AAOIFI : ${AAOIFI_RULES.HARAM_REVENUE_MAX}%.` },
      { ok: d.ratioDebt     < AAOIFI_RULES.DEBT_MAX,           label: `Ratio dette : ${d.ratioDebt}%`,       detail: `Seuil AAOIFI : ${AAOIFI_RULES.DEBT_MAX}%.` },
      { ok: d.ratioCash     < AAOIFI_RULES.CASH_MAX,           label: `Liquidités : ${d.ratioCash}%`,        detail: `Seuil AAOIFI : ${AAOIFI_RULES.CASH_MAX}%.` },
    ],
  };
}
