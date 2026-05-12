"use client";
import useSWR from "swr";
import { useState, useEffect } from "react";
import { auth } from "@/lib/auth";
import { useUserStore } from "@/store/usePortfolioStore";
import type { StockApiResponse, ChartPeriod } from "@/domain/types";

export interface ApiError extends Error {
  status: number;
  payload?: { error?: string; reason?: string; screeningsRemaining?: number; screeningsToday?: number };
}

const authenticatedFetcher = async (url: string) => {
  const session = await auth.getSession();
  const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
  const response = await fetch(url, { headers });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.error ?? `HTTP ${response.status}`) as ApiError;
    error.status = response.status;
    error.payload = payload ?? undefined;
    throw error;
  }

  return payload;
};

const publicFetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.error ?? `HTTP ${response.status}`) as ApiError;
    error.status = response.status;
    error.payload = payload ?? undefined;
    throw error;
  }

  return payload;
};

export function useStock(ticker: string | null, period: ChartPeriod = "1M") {
  return useSWR<StockApiResponse, ApiError>(
    ticker ? `/api/stock/${ticker}?period=${period}` : null,
    authenticatedFetcher,
    { revalidateOnFocus:false, dedupingInterval:60_000 }
  );
}

export function useSearch(query: string) {
  return useSWR(
    query.length >= 2 ? `/api/search?q=${encodeURIComponent(query)}` : null,
    publicFetcher,
    { revalidateOnFocus:false, dedupingInterval:30_000 }
  );
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const h = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return debounced;
}

export function useSyncPremium() {
  const setUser = useUserStore(s => s.setUser);
  const { data } = useSWR("/api/subscription/validate", authenticatedFetcher, {
    revalidateOnFocus:     true,
    dedupingInterval:      300_000,
  });
  useEffect(() => {
    if (data) setUser({ isPremium: data.isPremium, isValidated: true, screenings: data.screeningsToday ?? 0 });
  }, [data, setUser]);
}
