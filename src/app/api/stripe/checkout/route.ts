import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStripe, STRIPE_PRICE_ID } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!STRIPE_PRICE_ID) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const stripe = getStripe();

    // Retrieve or create Stripe customer linked to this Supabase user
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId: string | undefined = sub?.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const origin = req.headers.get("origin") ?? "https://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { supabase_user_id: user.id },
      },
      success_url: `${origin}/app?checkout=success`,
      cancel_url:  `${origin}/app?checkout=cancelled`,
      metadata: { supabase_user_id: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
