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
