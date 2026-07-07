"use client";

import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }, []);

  // Connexion / création de compte sans mot de passe : un lien magique par email.
  // shouldCreateUser=true (défaut) → crée le compte si l'email est inconnu.
  const signInWithEmail = useCallback(async (email: string): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/espaces` },
    });
    return !error;
  }, []);

  // Connexion par mot de passe (compte existant).
  const signInPassword = useCallback(async (email: string, password: string): Promise<"ok" | "error"> => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? "error" : "ok";
  }, []);

  // Création de compte par mot de passe. 'confirm' = email de confirmation requis.
  const signUpPassword = useCallback(
    async (email: string, password: string): Promise<"ok" | "confirm" | "error"> => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/espaces` },
      });
      if (error) return "error";
      return data.session ? "ok" : "confirm";
    },
    [],
  );

  // Envoie l'email de réinitialisation ; le lien ramène sur /espaces?recovery=1.
  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    const supabase = createClient();
    const next = encodeURIComponent("/espaces?recovery=1");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
    });
    return !error;
  }, []);

  // Définit un nouveau mot de passe (session de récupération active).
  const updatePassword = useCallback(async (password: string): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    return !error;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return { user, loading, signIn, signInWithEmail, signInPassword, signUpPassword, resetPassword, updatePassword, signOut };
}

export type AuthController = ReturnType<typeof useAuth>;
