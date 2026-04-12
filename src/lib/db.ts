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
