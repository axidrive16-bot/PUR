import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Gère le redirect OAuth Google — écrit les cookies de session sur la réponse HTTP
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") ?? "/app";

  if (!code) return NextResponse.redirect(new URL("/app", req.url));

  // Crée la réponse de redirect avant d'y écrire les cookies
  const res = NextResponse.redirect(new URL(next, req.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) console.error("[auth/callback]", error.message);

  return res;
}
