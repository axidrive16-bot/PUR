"use client";
import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/auth";
import { portfolioDB, watchlistDB } from "@/lib/db";
import { usePortfolioStore, useWatchlistStore, useUserStore } from "@/store/usePortfolioStore";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const storeSetUser   = useUserStore(s => s.setUser);
  const storeReset     = useUserStore(s => s.reset);
  const setHoldings    = usePortfolioStore(s => s.setHoldings);
  const setWatchlist   = useWatchlistStore(s => s.items);

  // Sync Supabase → stores au login
  const syncUserData = useCallback(async (u: User) => {
    storeSetUser({ id: u.id, email: u.email ?? null });

    // Charge portfolio et watchlist depuis Supabase
    const [pfItems, wlItems] = await Promise.all([
      portfolioDB.list(u.id),
      watchlistDB.list(u.id),
    ]);

    // Mappe les items DB → format Asset (prix chargés via /api/stock)
    if (pfItems.length) {
      const holdings = pfItems.map((item: any) => ({
        ticker: item.ticker, name: item.ticker, type: "stock" as const,
        qty: item.qty, paidPrice: item.paid_price, _id: item.id,
        price: 0, change: 0, score: 0, esgScore: 70,
        status: "halal" as const, ratioDebt: 0, ratioRevHaram: 0, ratioCash: 0,
        divYield: 0, divAnnual: 0, divHaramPct: 0, beta: 1,
        sector: "N/A", country: "🌍", mktCap: "N/A",
        volatility: "Modérée" as const, scoreHistory: [],
        periods: { "1D":[], "1S":[], "1M":[], "1A":[] },
        opportunities: false, newlyHalal: false, whyHalal: [],
      }));
      setHoldings(holdings);
    }
  }, [storeSetUser, setHoldings]);

  useEffect(() => {
    // Session initiale
    auth.getUser().then(async u => {
      setUser(u);
      if (u) await syncUserData(u);
      setLoading(false);
    });

    // Écoute les changements (login, logout, refresh token)
    const { data: { subscription } } = auth.onAuthStateChange(async (u: User | null) => {
      setUser(u);
      if (u) await syncUserData(u);
      else storeReset();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user: u, error } = await auth.signIn(email, password);
    if (u) { setUser(u); await syncUserData(u); }
    return { ok: !error, error };
  }, [syncUserData]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { user: u, error, needsConfirmation } = await auth.signUp(email, password);
    if (u && !needsConfirmation) { setUser(u); await syncUserData(u); }
    return { ok: !error, error, needsConfirmation };
  }, [syncUserData]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
    storeReset();
  }, [storeReset]);

  return { user, loading, isGuest: !user && !loading, signIn, signUp, signOut, signInGoogle: auth.signInWithGoogle };
}
