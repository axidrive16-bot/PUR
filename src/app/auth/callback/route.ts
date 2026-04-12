import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Gère le redirect OAuth Google
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/", req.url));
}
