import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SUPABASE_ADMIN_AVAILABLE } from "@/lib/supabase";

export const FREE_DAILY_SCREENINGS = 3;
export const PREMIUM_SCREENINGS_REMAINING = 999;

const PREMIUM_STATUSES = new Set(["active", "trialing"]);

export interface SubscriptionAccess {
  userId: string;
  isPremium: boolean;
  screeningsToday: number;
  screeningsRemaining: number;
}

export interface ScreeningDecision extends SubscriptionAccess {
  allowed: boolean;
  reason?: "unauthorized" | "quota_exceeded" | "service_unavailable";
}

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function hasActiveEntitlement(sub: { status?: string | null; current_period_end?: string | null } | null): boolean {
  if (!PREMIUM_STATUSES.has(sub?.status ?? "")) return false;
  if (!sub?.current_period_end) return true;
  return new Date(sub.current_period_end).getTime() > Date.now();
}

export function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

async function getAuthenticatedUser(token: string) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function getSubscriptionAccess(req: NextRequest): Promise<SubscriptionAccess | null> {
  if (!SUPABASE_ADMIN_AVAILABLE) return null;

  const token = bearerToken(req);
  if (!token) return null;

  const user = await getAuthenticatedUser(token);
  if (!user) return null;

  const [{ data: sub }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .single(),
    supabaseAdmin
      .from("profiles")
      .select("screenings_today, screenings_reset")
      .eq("id", user.id)
      .single(),
  ]);

  const isPremium = hasActiveEntitlement(sub);
  const today = todayKey();
  const screeningsToday = profile?.screenings_reset === today ? (profile?.screenings_today ?? 0) : 0;
  const screeningsRemaining = isPremium
    ? PREMIUM_SCREENINGS_REMAINING
    : Math.max(0, FREE_DAILY_SCREENINGS - screeningsToday);

  return { userId: user.id, isPremium, screeningsToday, screeningsRemaining };
}

export async function incrementScreeningIfAllowed(req: NextRequest): Promise<ScreeningDecision> {
  if (!SUPABASE_ADMIN_AVAILABLE) {
    return {
      userId: "demo",
      isPremium: true,
      screeningsToday: 0,
      screeningsRemaining: PREMIUM_SCREENINGS_REMAINING,
      allowed: true,
    };
  }

  const access = await getSubscriptionAccess(req);
  if (!access) {
    return {
      userId: "guest",
      isPremium: false,
      screeningsToday: 0,
      screeningsRemaining: 0,
      allowed: false,
      reason: "unauthorized",
    };
  }

  if (access.isPremium) return { ...access, allowed: true };
  if (access.screeningsToday >= FREE_DAILY_SCREENINGS) {
    return { ...access, screeningsRemaining: 0, allowed: false, reason: "quota_exceeded" };
  }

  const today = todayKey();
  const nextCount = access.screeningsToday + 1;
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ screenings_today: nextCount, screenings_reset: today })
    .eq("id", access.userId);

  if (error) {
    console.error("[subscription/increment]", error.message);
    return { ...access, allowed: false, reason: "service_unavailable" };
  }

  return {
    ...access,
    screeningsToday: nextCount,
    screeningsRemaining: Math.max(0, FREE_DAILY_SCREENINGS - nextCount),
    allowed: true,
  };
}

export function quotaErrorResponse(decision: ScreeningDecision) {
  const status = decision.reason === "unauthorized" ? 401 : decision.reason === "quota_exceeded" ? 429 : 503;
  const error = decision.reason === "quota_exceeded"
    ? "Limite quotidienne atteinte"
    : decision.reason === "unauthorized"
      ? "Authentification requise"
      : "Service temporairement indisponible";

  return NextResponse.json(
    {
      error,
      reason: decision.reason,
      isPremium: decision.isPremium,
      screeningsRemaining: decision.screeningsRemaining,
      screeningsToday: decision.screeningsToday,
    },
    { status },
  );
}
