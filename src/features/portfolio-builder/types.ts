export type Strategy      = "growth" | "dividends" | "balanced" | "defensive" | "high-conviction" | "diversified";
export type RiskLevel     = "Conservative" | "Balanced" | "Dynamic";
export type Diversif      = "concentrated" | "balanced" | "highly-diversified";
export type Region        = "us" | "europe" | "global";

export interface BuilderInput {
  amount:        number;
  strategy:      Strategy;
  risk:          RiskLevel;
  sectors:       string[];
  diversif:      Diversif;
  region:        Region;
}

export interface AssetAllocation {
  ticker:        string;
  name:          string;
  sector:        string;
  country:       string;
  allocationPct: number;
  amount:        number;
  score:         number;
  status:        string;
  divYield:      number;
  beta:          number;
  reason:        string;
  riskNote?:     string;
}

export interface ProposalMetrics {
  halalScore:          number;
  diversificationLevel: string;
  dividendOrientation:  "Faible" | "Modérée" | "Élevée";
  purificationEstimate: number;
  zakatEstimate:        number;
}

export interface PortfolioProposal {
  name:          string;
  totalAmount:   number;
  allocations:   AssetAllocation[];
  metrics:       ProposalMetrics;
}
