import { supabase } from "./supabase";

export const auth = {
  // Inscription email + mot de passe
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { user: data.user, error: error?.message ?? null, needsConfirmation: !!data.user && !data.session };
  },

  // Connexion email + mot de passe
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data.user, session: data.session, error: error?.message ?? null };
  },

  // Connexion Google (OAuth)
  async signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  },

  // Déconnexion — scope local uniquement (pas de round-trip réseau, évite la race condition)
  signOut: () => supabase.auth.signOut({ scope: "local" }),

  // Session courante
  getSession: () => supabase.auth.getSession().then(({ data }) => data.session),

  // Utilisateur courant
  getUser: () => supabase.auth.getUser().then(({ data }) => data.user),

  // Écoute les changements (login, logout, refresh)
  onAuthStateChange: (cb: (user: any) => void) =>
    supabase.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null)),
};
