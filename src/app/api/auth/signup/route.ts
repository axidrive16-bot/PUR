import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }

  // Créer l'utilisateur avec email_confirm:true → pas besoin de confirmation par email
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    // Compte déjà existant
    if (error.message.includes("already")) {
      return NextResponse.json({ error: "Un compte existe déjà avec cet email." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data.user) {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: data.user.id, email }, { onConflict: "id" });
    if (profileError) console.error("[auth/signup.profile]", profileError.message);
  }

  return NextResponse.json({ user: data.user });
}
