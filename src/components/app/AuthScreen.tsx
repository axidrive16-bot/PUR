"use client";
import { useState } from "react";
import { auth } from "@/lib/auth";
import { useUserStore } from "@/store/usePortfolioStore";
import { T, BS } from "@/components/ui/tokens";
import { useToast } from "@/components/ui/Toast";

type Mode = "welcome" | "login" | "signup";

function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([p, new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), ms))]);
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.016 17.64 11.708 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.177 0 7.552 0 9s.348 2.823.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.3C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return off
    ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}

export function AuthScreen({ onGuestContinue }: { onGuestContinue: () => void }) {
  const [mode, setMode] = useState<Mode>("welcome");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const toast = useToast();

  const iStyle: React.CSSProperties = { ...BS.input, width: "100%", boxSizing: "border-box" };
  const eyeBtn: React.CSSProperties = { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: T.textMuted, display: "flex", alignItems: "center" };

  const submit = async () => {
    setErr("");
    if (!email || !pw) { setErr("Tous les champs sont requis."); return; }
    if (mode === "signup" && pw !== pw2) { setErr("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await withTimeout(fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pw }) }));
        const json = await res.json();
        if (json.error) { setErr(json.error); return; }
        const { error } = await withTimeout(auth.signIn(email, pw));
        if (error) { setErr(error); return; }
      } else {
        const { error } = await withTimeout(auth.signIn(email, pw));
        if (error) {
          setErr(error.toLowerCase().includes("invalid") || error.toLowerCase().includes("credentials") ? "Email ou mot de passe incorrect." : error.toLowerCase().includes("confirm") ? "Email non confirmé. Recréez votre compte." : error);
          return;
        }
      }
      // Auth state change triggers syncUserData → phase logic in App handles transition
      toast("Bienvenue !");
    } catch (e: any) {
      if (useUserStore.getState().id !== "guest") { toast("Bienvenue !"); return; }
      setErr(e?.message === "timeout" ? "Délai dépassé. Vérifiez votre connexion." : "Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  // ── Welcome screen ──────────────────────────────────────────────
  if (mode === "welcome") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg, minHeight: "100vh", animation: "screenIn .3s ease" }}>
        {/* Hero */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 28px 32px" }}>
          <div style={{ width: 88, height: 88, borderRadius: 26, background: T.forest, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22, boxShadow: "0 20px 56px rgba(26,58,42,0.22)" }}>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
              <path d="M6 20V5C6 5 6 3 8 3C10 3 12 3 12 6C12 9 9 9 9 9" stroke="#C8E6C9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 9C9 9 10.5 11.5 12 12" stroke="#C8E6C9" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M12 12L18 6" stroke="#C8E6C9" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M14.5 6H18V9.5" stroke="#C8E6C9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 44, fontWeight: 800, color: T.text, letterSpacing: "-1.5px", lineHeight: 1, marginBottom: 8 }}>PUR</div>
          <p style={{ fontSize: 15, color: T.textSub, textAlign: "center", lineHeight: 1.65, maxWidth: 260, marginBottom: 36 }}>L'investissement sans concession</p>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
            {["Conforme AAOIFI", "Portfolio IA", "Score halal"].map(b => (
              <span key={b} style={{ background: T.greenBg, color: T.forest, fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999, border: `1px solid ${T.mint}` }}>{b}</span>
            ))}
          </div>
        </div>

        {/* CTA area */}
        <div style={{ padding: "20px 24px 52px", display: "flex", flexDirection: "column", gap: 11 }}>
          <button onClick={() => { setMode("signup"); setErr(""); }} style={{ ...BS.btnPrimary, height: 52, fontSize: 15, borderRadius: 16 }}>
            Créer un compte gratuit
          </button>
          <button onClick={() => { setMode("login"); setErr(""); }} style={{ height: 52, border: `1.5px solid ${T.borderMid}`, background: T.surface, borderRadius: 16, fontSize: 15, fontWeight: 700, color: T.text, cursor: "pointer", fontFamily: "inherit" }}>
            Se connecter
          </button>
          <button onClick={() => auth.signInWithGoogle()} style={{ height: 52, border: `1.5px solid ${T.border}`, background: T.surface, borderRadius: 16, fontSize: 14, fontWeight: 600, color: T.textSub, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
            <GoogleIcon /> Continuer avec Google
          </button>
          <button onClick={onGuestContinue} style={{ marginTop: 4, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.textMuted, fontFamily: "inherit", textDecoration: "underline" }}>
            Continuer sans compte
          </button>
        </div>
      </div>
    );
  }

  // ── Login / Signup form ─────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg, minHeight: "100vh", animation: "screenIn .3s ease" }}>
      <div style={{ padding: "52px 24px 32px" }}>
        <button onClick={() => { setMode("welcome"); setErr(""); }} style={{ marginBottom: 22, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.textSub, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
          ← Retour
        </button>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: T.text, marginBottom: 5 }}>
          {mode === "login" ? "Bon retour !" : "Créer un compte"}
        </h2>
        <p style={{ fontSize: 14, color: T.textMuted, marginBottom: 28 }}>
          {mode === "login" ? "Connectez-vous à votre espace PUR." : "Commencez votre essai gratuit de 14 jours."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {err && <div style={{ background: T.redBg, border: `1px solid ${T.red}30`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: T.red }}>{err}</div>}

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.textSub, display: "block", marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@email.com" style={iStyle} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.textSub, display: "block", marginBottom: 6 }}>Mot de passe</label>
            <div style={{ position: "relative" }}>
              <input type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && !pw2 && submit()} style={{ ...iStyle, paddingRight: 42 }} />
              <button type="button" onClick={() => setShowPw(v => !v)} style={eyeBtn}><EyeIcon off={showPw} /></button>
            </div>
          </div>

          {mode === "signup" && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.textSub, display: "block", marginBottom: 6 }}>Confirmer le mot de passe</label>
              <div style={{ position: "relative" }}>
                <input type={showPw2 ? "text" : "password"} value={pw2} onChange={e => setPw2(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && submit()} style={{ ...iStyle, paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPw2(v => !v)} style={eyeBtn}><EyeIcon off={showPw2} /></button>
              </div>
            </div>
          )}

          <button onClick={submit} disabled={loading || !email || !pw} style={{ ...BS.btnPrimary, height: 52, fontSize: 15, borderRadius: 16, opacity: (loading || !email || !pw) ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}>
            {loading ? "Chargement…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontSize: 12, color: T.textMuted }}>ou</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          <button onClick={() => auth.signInWithGoogle()} style={{ height: 52, border: `1.5px solid ${T.border}`, background: T.surface, borderRadius: 16, fontSize: 14, fontWeight: 600, color: T.textSub, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
            <GoogleIcon /> Continuer avec Google
          </button>

          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.textSub, fontFamily: "inherit", textDecoration: "underline", padding: 4 }}>
            {mode === "login" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
}
