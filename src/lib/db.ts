import { supabase } from "./supabase";

// ── Watchlist ─────────────────────────────────────────────────────
export interface WatchlistRow {
  id:         string;
  user_id:    string;
  ticker:     string;
  name:       string | null;
  sector:     string | null;
  score:      number | null;
  status:     string | null;
  price:      number | null;
  change_pct: number | null;
  added_at:   string;
}

export const watchlistDB = {
  async list(userId: string): Promise<WatchlistRow[]> {
    const { data, error } = await supabase
      .from("watchlist_items")
      .select("*")
      .eq("user_id", userId)
      .order("added_at", { ascending: false });
    if (error) console.error("[watchlistDB.list]", error.message);
    return (data ?? []) as WatchlistRow[];
  },

  async add(userId: string, ticker: string, display: {
    name?: string; sector?: string; score?: number;
    status?: string; price?: number; change_pct?: number;
  }): Promise<WatchlistRow | null> {
    // Vérifie la session courante
    const { data: { user: authUser } } = await supabase.auth.getUser();
    console.log("[watchlistDB.add] authUser:", authUser?.id, "| userId param:", userId);

    const payload = { user_id: userId, ticker, ...display };
    console.log("[watchlistDB.add] payload:", JSON.stringify(payload));

    const { data, error } = await supabase
      .from("watchlist_items")
      .upsert(payload, { onConflict: "user_id,ticker", ignoreDuplicates: false })
      .select()
      .single();

    if (error) {
      console.error("[watchlistDB.add] ERROR:", error.message, "| code:", error.code, "| hint:", error.hint);
      return null;
    }
    console.log("[watchlistDB.add] SUCCESS:", data?.id);
    return data as WatchlistRow;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("watchlist_items").delete().eq("id", id);
    if (error) console.error("[watchlistDB.remove]", error.message);
  },
};

// ── Portfolio ─────────────────────────────────────────────────────
export interface PortfolioRow {
  id:         string;
  user_id:    string;
  ticker:     string;
  qty:        number;
  paid_price: number;
  added_at:   string;
}

export const portfolioDB = {
  async list(userId: string): Promise<PortfolioRow[]> {
    const { data, error } = await supabase
      .from("portfolio_items")
      .select("*")
      .eq("user_id", userId)
      .order("added_at", { ascending: false });
    if (error) console.error("[portfolioDB.list]", error.message);
    return (data ?? []) as PortfolioRow[];
  },

  async add(userId: string, ticker: string, qty: number, paidPrice: number): Promise<PortfolioRow | null> {
    // Vérifie la session courante
    const { data: { user: authUser } } = await supabase.auth.getUser();
    console.log("[portfolioDB.add] authUser:", authUser?.id, "| userId param:", userId);

    const payload = { user_id: userId, ticker, qty, paid_price: paidPrice };
    console.log("[portfolioDB.add] payload:", JSON.stringify(payload));

    const { data, error } = await supabase
      .from("portfolio_items")
      .upsert(payload, { onConflict: "user_id,ticker" })
      .select()
      .single();

    if (error) {
      console.error("[portfolioDB.add] ERROR:", error.message, "| code:", error.code, "| hint:", error.hint);
      return null;
    }
    console.log("[portfolioDB.add] SUCCESS:", data?.id);
    return data as PortfolioRow;
  },

  async updateQty(id: string, qty: number): Promise<void> {
    const { error } = await supabase.from("portfolio_items").update({ qty }).eq("id", id);
    if (error) console.error("[portfolioDB.updateQty]", error.message);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
    if (error) console.error("[portfolioDB.remove]", error.message);
  },
};

// ── Profil ────────────────────────────────────────────────────────
export const profileDB = {
  async get(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error && error.code !== "PGRST116") console.error("[profileDB.get]", error.message);
    return data;
  },

  async upsert(userId: string, email: string) {
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, email }, { onConflict: "id" });
    if (error) console.error("[profileDB.upsert]", error.message);
  },
};

// ── Purification ──────────────────────────────────────────────────
export const purificationDB = {
  async add(userId: string, amount: number): Promise<void> {
    const { error } = await supabase
      .from("purification_history")
      .insert({ user_id: userId, amount });
    if (error) console.error("[purificationDB.add]", error.message);
  },

  async list(userId: string) {
    const { data, error } = await supabase
      .from("purification_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) console.error("[purificationDB.list]", error.message);
    return data ?? [];
  },
};
