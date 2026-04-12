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
