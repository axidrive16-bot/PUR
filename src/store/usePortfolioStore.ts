import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { computePortfolioMetrics, calcPurification } from "@/domain/aaoifi";
import type { PortfolioItem, PortfolioMetrics, Asset } from "@/domain/types";

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

// ── Watchlist ─────────────────────────────────────────────────────
import type { Asset as A } from "@/domain/types";
interface WatchlistState {
  items:   A[];
  add:    (a: A) => void;
  remove: (ticker: string) => void;
  toggle: (a: A) => void;
  inList: (ticker: string) => boolean;
  sorted: () => A[];
}
export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],
      add:    (a) => set(s => ({ items: s.items.find(x=>x.ticker===a.ticker) ? s.items : [...s.items,a] })),
      remove: (t) => set(s => ({ items: s.items.filter(x=>x.ticker!==t) })),
      toggle: (a) => { const {add,remove,inList}=get(); inList(a.ticker)?remove(a.ticker):add(a); },
      inList: (t) => get().items.some(x=>x.ticker===t),
      sorted: ()  => [...get().items].sort((a,b)=>b.score-a.score),
    }),
    { name: "hs-watchlist" }
  )
);

// ── User ──────────────────────────────────────────────────────────
interface UserState {
  id:          string;
  email:       string | null;
  isPremium:   boolean;
  screenings:  number;
  isValidated: boolean;
  setIsPremium:  (v: boolean) => void;
  incScreenings: () => void;
  setUser:       (u: Partial<UserState>) => void;
  reset:         () => void;
}
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      id:"guest", email:null, isPremium:false, screenings:0, isValidated:false,
      setIsPremium:  (v) => set({ isPremium:v }),
      incScreenings: ()  => set(s => ({ screenings:s.screenings+1 })),
      setUser:       (u) => set(s => ({...s,...u})),
      reset:         ()  => set({ id:"guest",email:null,isPremium:false,screenings:0,isValidated:false }),
    }),
    {
      name: "hs-user",
      // isPremium est toujours revalidé serveur — localStorage = cache d'affichage uniquement
      partialize: s => ({ id:s.id, email:s.email, screenings:s.screenings }),
    }
  )
);
