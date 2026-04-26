import { supabase } from "./supabase";

export const auth = {
  // Inscription email + mot de passe
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { user: data.user, error: error?.message ?? null, needsConfirmation: !!data.user && !data.session };
  },

  // Connexion email + mot de passe
  // Race entre onAuthStateChange (rapide ~1s) et signInWithPassword (lent 5-6s).
  // Résout dès que le premier signal arrive, sans attendre le SDK lent.
  signIn(email: string, password: string) {
    return new Promise<{ user: any; session: any; error: string | null }>(resolve => {
      let done = false;

      // Écoute le SIGNED_IN pour résoudre immédiatement quand la session est prête
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session && !done) {
          done = true;
          subscription.unsubscribe();
          resolve({ user: session.user, session, error: null });
        }
      });

      // Fallback : la Promise native du SDK (erreurs de credentials notamment)
      supabase.auth.signInWithPassword({ email, password }).then(({ data, error }) => {
        if (!done) {
          done = true;
          subscription.unsubscribe();
          resolve({ user: data?.user ?? null, session: data?.session ?? null, error: error?.message ?? null });
        }
      }).catch(() => {
        if (!done) {
          done = true;
          subscription.unsubscribe();
          resolve({ user: null, session: null, error: "Erreur réseau" });
        }
      });
    });
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
