import { NextRequest, NextResponse } from "next/server";
import { FREE_DAILY_SCREENINGS, getSubscriptionAccess } from "@/lib/subscription";

export async function GET(req: NextRequest) {
  try {
    const access = await getSubscriptionAccess(req);
    if (!access) return NextResponse.json({ isPremium: false, screeningsRemaining: FREE_DAILY_SCREENINGS });

    return NextResponse.json({
      isPremium: access.isPremium,
      screeningsRemaining: access.screeningsRemaining,
      screeningsToday: access.screeningsToday,
    });
  } catch (err) {
    console.error("[subscription/validate]", err);
    return NextResponse.json({ isPremium: false, screeningsRemaining: FREE_DAILY_SCREENINGS });
  }
}
