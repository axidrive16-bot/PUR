import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { computePortfolioMetrics } from "@/domain/aaoifi";
import type { PortfolioItem, PortfolioMetrics, Asset, UserPreferences } from "@/domain/types";

// ── Portfolio store ───────────────────────────────────────────────
interface PortfolioState {
  holdings:     PortfolioItem[];
  metrics:      PortfolioMetrics;
  purified:     Array<{ date: string; amount: number }>;
  add:          (asset: Asset) => void;
  remove:       (ticker: string) => void;
  updateQty:    (ticker: string, qty: number) => void;
  setHoldings:  (items: PortfolioItem[]) => void;
  markPurified: (amount: number) => void;
  inPortfolio:  (ticker: string) => boolean;
  clear:        () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    immer((set, get) => ({
      holdings: [],
      metrics:  computePortfolioMetrics([]),
      purified: [],
      add: (asset) => set(state => {
        if (state.holdings.find(h => h.ticker === asset.ticker)) return;
        const item: PortfolioItem = { ...asset, qty:1, paidPrice:asset.price, _id:null };
        state.holdings.push(item);
        state.metrics = computePortfolioMetrics(state.holdings);
      }),
      remove: (ticker) => set(state => {
        state.holdings = state.holdings.filter(h => h.ticker !== ticker);
        state.metrics  = computePortfolioMetrics(state.holdings);
      }),
      updateQty: (ticker, qty) => set(state => {
        const item = state.holdings.find(h => h.ticker === ticker);
        if (item) { item.qty = qty; state.metrics = computePortfolioMetrics(state.holdings); }
      }),
      setHoldings: (items) => set(state => {
        state.holdings = items;
        state.metrics  = computePortfolioMetrics(items);
      }),
      markPurified: (amount) => set(state => {
        state.purified.push({ date: new Date().toISOString(), amount });
      }),
      inPortfolio: (ticker) => get().holdings.some(h => h.ticker === ticker),
      clear: () => set(state => {
        state.holdings = [];
        state.metrics  = computePortfolioMetrics([]);
      }),
    })),
    {
      name:    "hs-portfolio",
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({ holdings: s.holdings, purified: s.purified }),
      onRehydrateStorage: () => state => {
        if (state) state.metrics = computePortfolioMetrics(state.holdings);
      },
    }
  )
);

// ── Watchlist store ───────────────────────────────────────────────
type A = Asset;

interface WatchlistState {
  items: A[];
  /** ticker → Supabase row id (pour la suppression) */
  _ids:   Record<string, string>;
  add:    (a: A, _id?: string) => void;
  remove: (ticker: string) => void;
  toggle: (a: A) => void;
  inList: (ticker: string) => boolean;
  sorted: () => A[];
  /** Met à jour l'id Supabase d'un élément existant */
  setId:  (ticker: string, id: string) => void;
  /** Charge en masse depuis la DB (login) */
  setItems: (items: A[], ids: Record<string, string>) => void;
  /** Vide tout (logout) */
  clear: () => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],
      _ids:  {},
      add: (a, _id) => set(s => ({
        items: s.items.find(x => x.ticker === a.ticker) ? s.items : [...s.items, a],
        _ids:  _id ? { ...s._ids, [a.ticker]: _id } : s._ids,
      })),
      remove: (ticker) => set(s => {
        const { [ticker]: _, ...rest } = s._ids;
        return { items: s.items.filter(x => x.ticker !== ticker), _ids: rest };
      }),
      toggle: (a) => {
        const { add, remove, inList } = get();
        inList(a.ticker) ? remove(a.ticker) : add(a);
      },
      inList: (ticker) => get().items.some(x => x.ticker === ticker),
      sorted: () => [...get().items].sort((a, b) => b.score - a.score),
      setId:  (ticker, id) => set(s => ({ _ids: { ...s._ids, [ticker]: id } })),
      setItems: (items, ids) => set({ items, _ids: ids }),
      clear: () => set({ items: [], _ids: {} }),
    }),
    {
      name:       "hs-watchlist",
      // On persiste les items mais PAS les _ids (ils sont régénérés depuis Supabase au login)
      partialize: s => ({ items: s.items }),
    }
  )
);

// ── User store ────────────────────────────────────────────────────
interface UserState {
  id:                  string;
  email:               string | null;
  isPremium:           boolean;
  screenings:          number;
  isValidated:         boolean;
  onboardingCompleted: boolean;
  preferences:         UserPreferences | null;
  /** Runtime flag — reset on every session, not persisted */
  prefsLoaded:         boolean;
  setIsPremium:           (v: boolean) => void;
  incScreenings:          () => void;
  setUser:                (u: Partial<UserState>) => void;
  setOnboardingCompleted: (v: boolean) => void;
  setPreferences:         (p: UserPreferences | null) => void;
  setPrefsLoaded:         (v: boolean) => void;
  reset:                  () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      id:"guest", email:null, isPremium:false, screenings:0, isValidated:false,
      onboardingCompleted: false,
      preferences: null,
      prefsLoaded: false,
      setIsPremium:           (v) => set({ isPremium:v }),
      incScreenings:          ()  => set(s => ({ screenings: s.screenings + 1 })),
      setUser:                (u) => set(s => ({ ...s, ...u })),
      setOnboardingCompleted: (v) => set({ onboardingCompleted: v }),
      setPreferences:         (p) => set({ preferences: p }),
      setPrefsLoaded:         (v) => set({ prefsLoaded: v }),
      reset: () => set({
        id:"guest", email:null, isPremium:false, screenings:0, isValidated:false,
        onboardingCompleted:false, preferences:null, prefsLoaded:false,
      }),
    }),
    {
      name: "hs-user",
      // isPremium: always revalidated server-side; prefsLoaded: session-only
      partialize: s => ({
        id:s.id, email:s.email, screenings:s.screenings,
        onboardingCompleted:s.onboardingCompleted, preferences:s.preferences,
      }),
    }
  )
);
