#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# HalalScreen — Étape 2 : Auth Supabase + FMP
# Lance depuis la racine du projet : bash setup2.sh
# ═══════════════════════════════════════════════════════════════════
set -e
echo "🕌 HalalScreen — Intégration Supabase + FMP..."

# ── Dépendances ───────────────────────────────────────────────────
echo "📦 Installation des dépendances..."
npm install @supabase/supabase-js @supabase/ssr

# ── src/lib/supabase.ts ───────────────────────────────────────────
cat > src/lib/supabase.ts << 'EOF'
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client navigateur (composants React)
export const supabase = createClient(url, key);

// Client serveur avec droits admin (API routes uniquement)
export const supabaseAdmin = createClient(
  url,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
EOF

# ── src/lib/auth.ts ───────────────────────────────────────────────
cat > src/lib/auth.ts << 'EOF'
import { supabase } from "./supabase";

export const auth = {
  // Inscription email + mot de passe
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { user: data.user, error: error?.message ?? null, needsConfirmation: !!data.user && !data.session };
  },

  // Connexion email + mot de passe
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data.user, session: data.session, error: error?.message ?? null };
  },

  // Connexion Google (OAuth)
  async signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  },

  // Déconnexion
  signOut: () => supabase.auth.signOut(),

  // Session courante
  getSession: () => supabase.auth.getSession().then(({ data }) => data.session),

  // Utilisateur courant
  getUser: () => supabase.auth.getUser().then(({ data }) => data.user),

  // Écoute les changements (login, logout, refresh)
  onAuthStateChange: (cb: (user: any) => void) =>
    supabase.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null)),
};
EOF

# ── src/lib/db.ts ─────────────────────────────────────────────────
cat > src/lib/db.ts << 'EOF'
import { supabase } from "./supabase";

// ── Portfolio ─────────────────────────────────────────────────────
export const portfolioDB = {
  async list(userId: string) {
    const { data } = await supabase
      .from("portfolio_items")
      .select("*")
      .eq("user_id", userId)
      .order("added_at", { ascending: false });
    return data ?? [];
  },

  async add(userId: string, ticker: string, qty: number, paidPrice: number) {
    const { data } = await supabase
      .from("portfolio_items")
      .insert({ user_id: userId, ticker, qty, paid_price: paidPrice })
      .select()
      .single();
    return data;
  },

  async remove(id: string) {
    await supabase.from("portfolio_items").delete().eq("id", id);
  },
};

// ── Watchlist ─────────────────────────────────────────────────────
export const watchlistDB = {
  async list(userId: string) {
    const { data } = await supabase
      .from("watchlist_items")
      .select("*")
      .eq("user_id", userId)
      .order("added_at", { ascending: false });
    return data ?? [];
  },

  async add(userId: string, ticker: string) {
    const { data } = await supabase
      .from("watchlist_items")
      .insert({ user_id: userId, ticker })
      .select()
      .single();
    return data;
  },

  async remove(id: string) {
    await supabase.from("watchlist_items").delete().eq("id", id);
  },
};

// ── Profil ────────────────────────────────────────────────────────
export const profileDB = {
  async get(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    return data;
  },
};

// ── Purification ──────────────────────────────────────────────────
export const purificationDB = {
  async add(userId: string, amount: number) {
    await supabase
      .from("purification_history")
      .insert({ user_id: userId, amount });
  },

  async list(userId: string) {
    const { data } = await supabase
      .from("purification_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  },
};
EOF

# ── src/app/api/subscription/validate/route.ts ────────────────────
mkdir -p src/app/api/subscription/validate
cat > src/app/api/subscription/validate/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    // Récupère le token depuis le header Authorization
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ isPremium: false, screeningsRemaining: 3 });

    // Vérifie le token côté serveur (impossible à falsifier)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return NextResponse.json({ isPremium: false, screeningsRemaining: 3 });

    // Lit le statut premium depuis la base
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .single();

    const isPremium = ["active", "trialing"].includes(sub?.status ?? "");

    // Lit le compteur de screenings du jour
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("screenings_today, screenings_reset")
      .eq("id", user.id)
      .single();

    const today = new Date().toISOString().split("T")[0];
    const screeningsToday = profile?.screenings_reset === today ? (profile?.screenings_today ?? 0) : 0;
    const screeningsRemaining = isPremium ? 999 : Math.max(0, 3 - screeningsToday);

    return NextResponse.json({ isPremium, screeningsRemaining });
  } catch {
    return NextResponse.json({ isPremium: false, screeningsRemaining: 3 });
  }
}
EOF

# ── src/app/api/screening/increment/route.ts ─────────────────────
mkdir -p src/app/api/screening/increment
cat > src/app/api/screening/increment/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ allowed: false });

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return NextResponse.json({ allowed: false });

    const today = new Date().toISOString().split("T")[0];

    // Vérifie si premium
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .single();

    const isPremium = ["active", "trialing"].includes(sub?.status ?? "");
    if (isPremium) return NextResponse.json({ allowed: true, remaining: 999 });

    // Incrémente côté serveur (impossible à tricher côté client)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("screenings_today, screenings_reset")
      .eq("id", user.id)
      .single();

    const currentCount = profile?.screenings_reset === today ? (profile?.screenings_today ?? 0) : 0;
    if (currentCount >= 3) return NextResponse.json({ allowed: false, remaining: 0 });

    await supabaseAdmin
      .from("profiles")
      .update({ screenings_today: currentCount + 1, screenings_reset: today })
      .eq("id", user.id);

    return NextResponse.json({ allowed: true, remaining: 2 - currentCount });
  } catch {
    return NextResponse.json({ allowed: false });
  }
}
EOF

# ── src/app/auth/callback/route.ts ───────────────────────────────
mkdir -p src/app/auth/callback
cat > src/app/auth/callback/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Gère le redirect OAuth Google
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/", req.url));
}
EOF

# ── src/hooks/useAuth.ts ──────────────────────────────────────────
cat > src/hooks/useAuth.ts << 'EOF'
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
EOF

echo ""
echo "✅ Intégration Supabase + FMP terminée !"
echo ""
echo "📋 Prochaines étapes :"
echo "   1. Vérifie que .env.local contient bien tes 3 clés Supabase + FMP_API_KEY"
echo "   2. Lance : npm run dev"
echo "   3. Teste : http://localhost:3000/api/stock/AAPL"
echo "      → Mode démo si FMP_API_KEY vide"
echo "      → Vraies données si FMP_API_KEY remplie"
echo ""
