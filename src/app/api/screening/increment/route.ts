import { NextRequest, NextResponse } from "next/server";
import { incrementScreeningIfAllowed, quotaErrorResponse } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  const decision = await incrementScreeningIfAllowed(req);
  if (!decision.allowed) return quotaErrorResponse(decision);

  return NextResponse.json({
    allowed: true,
    isPremium: decision.isPremium,
    remaining: decision.screeningsRemaining,
    screeningsToday: decision.screeningsToday,
  });
}
