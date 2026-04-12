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
