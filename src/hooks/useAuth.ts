"use client";
import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/auth";
import { watchlistDB } from "@/lib/db";
import { useWatchlistStore, useUserStore } from "@/store/usePortfolioStore";
import type { Asset } from "@/domain/types";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const storeSetUser   = useUserStore(s => s.setUser);
  const storeReset     = useUserStore(s => s.reset);
  const setItems       = useWatchlistStore(s => s.setItems);
  const clearWatchlist = useWatchlistStore(s => s.clear);

  // Sync watchlist from Supabase → store at login
  const syncUserData = useCallback(async (u: User) => {
    storeSetUser({ id: u.id, email: u.email ?? null });

    const wlItems = await watchlistDB.list(u.id);
    if (wlItems.length) {
      const assets: Asset[] = wlItems.map(r => ({
        ticker: r.ticker, name: r.name ?? r.ticker, type: "stock" as const,
        price: r.price ?? 0, change: r.change_pct ?? 0, score: r.score ?? 0,
        status: (r.status ?? "halal") as any, esgScore: 70,
        ratioDebt: 0, ratioRevHaram: 0, ratioCash: 0,
        divYield: 0, divAnnual: 0, divHaramPct: 0, beta: 1,
        sector: r.sector ?? "N/A", country: "🌍", mktCap: "N/A",
        volatility: "Modérée" as const, scoreHistory: [],
        periods: { "1D":[], "1S":[], "1M":[], "1A":[] },
        opportunities: false, newlyHalal: false, whyHalal: [],
      }));
      const ids: Record<string, string> = {};
      wlItems.forEach(r => { ids[r.ticker] = r.id; });
      setItems(assets, ids);
    }
  }, [storeSetUser, setItems]);

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
      else { storeReset(); clearWatchlist(); }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    clearWatchlist();
  }, [storeReset, clearWatchlist]);

  return { user, loading, isGuest: !user && !loading, signIn, signUp, signOut, signInGoogle: auth.signInWithGoogle };
}
