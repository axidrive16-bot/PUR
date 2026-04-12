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
