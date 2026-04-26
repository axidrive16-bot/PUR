/**
 * Backward-compatibility re-export.
 * The real implementation lives in @/services/market/fmp.
 */
export { fmpService, FMP_AVAILABLE } from "@/services/market/fmp";
export type {
  FmpQuote,
  FmpProfile,
  FmpBalanceSheet,
  FmpIncomeStatement,
  FmpSearchResult,
} from "@/services/market/fmp";
