"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { auth } from "@/lib/auth";
import { watchlistDB, preferencesDB, profileDB } from "@/lib/db";
import { SUPABASE_AVAILABLE } from "@/lib/supabase";
import { useWatchlistStore, useUserStore } from "@/store/usePortfolioStore";
import type { Asset } from "@/domain/types";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user,    setUser]    = useState<User | null>(null);
  // If Supabase isn't configured, skip auth check entirely
  const [loading, setLoading] = useState(SUPABASE_AVAILABLE);

  const storeSetUser   = useUserStore(s => s.setUser);
  const storeReset     = useUserStore(s => s.reset);
  const setPrefsLoaded = useUserStore(s => s.setPrefsLoaded);
  const setItems       = useWatchlistStore(s => s.setItems);
  const clearWatchlist = useWatchlistStore(s => s.clear);
  const syncStateRef = useRef<{ userId: string | null; promise: Promise<void> | null }>({ userId: null, promise: null });

  // Sync preferences + watchlist from Supabase → store at login.
  // React Strict Mode and Supabase auth events can fire the same login twice; dedupe
  // to avoid concurrent auth-token reads that trigger Supabase Web Lock stealing.
  const syncUserData = useCallback(async (u: User) => {
    if (syncStateRef.current.userId === u.id) {
      if (syncStateRef.current.promise) await syncStateRef.current.promise;
      return;
    }

    const promise = (async () => {
      storeSetUser({ id: u.id, email: u.email ?? null });

      try {
        await profileDB.upsert(u.id, u.email ?? "");
      } catch { /* profile creation is non-critical for auth */ }

      // Fetch onboarding preferences (non-blocking — failure is safe)
      try {
        const prefs = await preferencesDB.get(u.id);
        if (prefs) {
          storeSetUser({
            onboardingCompleted: prefs.onboarding_completed,
            preferences: {
              sectors:          prefs.preferred_sectors  ?? [],
              investmentStyles: prefs.investment_styles  ?? [],
              investmentGoals:  prefs.investment_goals   ?? [],
              riskProfile:      prefs.risk_profile       ?? null,
            },
          });
        }
      } catch { /* network failure — leave defaults */ }

      try {
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
      } catch { /* watchlist fetch failure is non-critical */ }

      setPrefsLoaded(true);
    })();

    syncStateRef.current = { userId: u.id, promise };
    try {
      await promise;
    } finally {
      if (syncStateRef.current.userId === u.id) syncStateRef.current.promise = null;
    }
  }, [storeSetUser, setPrefsLoaded, setItems]);

  useEffect(() => {
    if (!SUPABASE_AVAILABLE) {
      syncStateRef.current = { userId: null, promise: null };
      storeReset();
      clearWatchlist();
      return;
    }

    // Timeout de sécurité — si Supabase ne répond pas en 6s, on continue comme invité
    const timeout = setTimeout(() => {
      syncStateRef.current = { userId: null, promise: null };
      storeReset();
      clearWatchlist();
      setLoading(false);
    }, 6000);

    // Session initiale — reset si aucun utilisateur (localStorage peut être périmé)
    auth.getUser()
      .then(async u => {
        setUser(u);
        if (u) await syncUserData(u);
        else { syncStateRef.current = { userId: null, promise: null }; storeReset(); clearWatchlist(); }
      })
      .catch(() => {
        // Supabase non configuré ou erreur réseau — traiter comme non connecté
        syncStateRef.current = { userId: null, promise: null };
        storeReset();
        clearWatchlist();
      })
      .finally(() => { clearTimeout(timeout); setLoading(false); });

    // Écoute les changements (login, logout, refresh token)
    const { data: { subscription } } = auth.onAuthStateChange(async (u: User | null) => {
      setUser(u);
      if (u) await syncUserData(u);
      else { syncStateRef.current = { userId: null, promise: null }; storeReset(); clearWatchlist(); }
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
    syncStateRef.current = { userId: null, promise: null };
    storeReset();
    clearWatchlist();
  }, [storeReset, clearWatchlist]);

  return { user, loading, isGuest: !user && !loading, signIn, signUp, signOut, signInGoogle: auth.signInWithGoogle };
}
