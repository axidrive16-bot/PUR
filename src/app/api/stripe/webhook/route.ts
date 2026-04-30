import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";

async function upsertSubscription(
  userId: string,
  sub: Stripe.Subscription,
  customerId: string,
) {
  await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: sub.status,
      price_id: (sub.items.data[0]?.price?.id) ?? null,
      current_period_start: new Date((sub as unknown as { current_period_start: number }).current_period_start * 1000).toISOString(),
      current_period_end: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

export async function POST(req: NextRequest) {
  if (!STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe/webhook] signature error", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        if (!userId || session.mode !== "subscription") break;

        const subId = session.subscription as string;
        const sub = await getStripe().subscriptions.retrieve(subId);
        await upsertSubscription(userId, sub, session.customer as string);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;
        await upsertSubscription(userId, sub, sub.customer as string);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
