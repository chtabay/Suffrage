"use client";

import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { linkMyMemberships } from "@/lib/db/participation";
import { claimPolls } from "@/lib/db/polls";
import { getLocalPolls } from "@/lib/db/localPolls";

/**
 * Où revenir après s'être authentifié.
 *
 * UNE SEULE RÈGLE POUR TOUT LE MONDE : là d'où l'on vient. La destination était
 * jusqu'ici fonction de la MÉTHODE et non de la personne — Google retombait sur
 * l'accueil, le lien magique sur `/espaces`, le mot de passe ne bougeait pas :
 * trois comportements pour une seule intention. « Revenir » sert les quatre
 * populations à la fois : le curieux retrouve la carte qu'il voulait épingler,
 * l'organisateur son cercle, le créateur son scrutin.
 *
 * Bénéfice second, gratuit : construite depuis `location`, cette valeur porte le
 * préfixe de langue, ce qui répare au passage la perte de locale au retour —
 * la route de callback vit hors du segment `[locale]`.
 */
function retour(next?: string): string {
  if (next) return next;
  if (typeof window === "undefined") return "/";
  return window.location.pathname + window.location.search;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Langue de l'UI = préférence de langue du COMPTE (métadonnée `lang`), lue par
  // le template d'email Supabase pour localiser le lien de connexion.
  const locale = useLocale();

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

  // Rattache le compte à ses appartenances de cercle, à la connexion.
  //
  // Un compte n'était jusqu'ici qu'un organisateur : rien ne le reliait aux
  // cercles où il figure comme MEMBRE (identifié par email + jeton). Ce
  // rattachement est fait en base sur l'email VÉRIFIÉ uniquement, il est
  // idempotent, et il reste invisible à l'animateur du cercle.
  //
  // Silencieux par choix : si le rattachement échoue, la session reste
  // parfaitement utilisable — on ne bloque pas une connexion pour un confort
  // d'affichage.
  const linkedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!user || linkedFor.current === user.id) return;
    linkedFor.current = user.id;
    linkMyMemberships().catch(() => {});
  }, [user]);

  // Rattache au compte les scrutins créés anonymement SUR CET APPAREIL.
  //
  // POURQUOI C'EST ICI, ET POURQUOI CE DÉPLACEMENT VIENT EN PREMIER. Ce
  // rattachement ne vivait que dans `ScrutinApp`, monté uniquement sur `/` et
  // `/new`. Google atterrissait sur `/` donc rattachait ; le lien magique
  // atterrissait sur `/espaces` donc ne rattachait rien — et « Mes scrutins »
  // affichait pourtant « vos scrutins vous suivent partout », promesse fausse
  // tant que l'utilisateur n'était pas repassé par l'accueil. Toute
  // modification de la page d'atterrissage aurait changé EN SILENCE qui est
  // rattaché et qui ne l'est pas : il fallait donc rendre le rattachement
  // indépendant de la page avant de toucher à la destination.
  //
  // Silencieux et idempotent, comme le rattachement d'appartenance juste au-dessus.
  const claimedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!user || claimedFor.current === user.id) return;
    claimedFor.current = user.id;
    const locals = getLocalPolls();
    if (!locals.length) return;
    claimPolls(locals.map((p) => ({ token: p.token, secret: p.secret }))).catch(() => {});
  }, [user]);

  // Synchronise la langue du compte quand elle diffère de l'UI (couvre Google et
  // les comptes créés avant cette préférence). Un seul écrit au changement.
  useEffect(() => {
    if (!user) return;
    if ((user.user_metadata as { lang?: string } | null)?.lang === locale) return;
    const supabase = createClient();
    supabase.auth.updateUser({ data: { lang: locale } }).catch(() => {});
  }, [user, locale]);

  const signIn = useCallback(async (next?: string) => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(retour(next))}`,
      },
    });
  }, []);

  // Connexion / création de compte sans mot de passe : un lien magique par email.
  // shouldCreateUser=true (défaut) → crée le compte si l'email est inconnu.
  const signInWithEmail = useCallback(async (email: string, next?: string): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(retour(next))}`,
        data: { lang: locale },
      },
    });
    return !error;
  }, [locale]);

  // Connexion par mot de passe (compte existant).
  const signInPassword = useCallback(async (email: string, password: string): Promise<"ok" | "error"> => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? "error" : "ok";
  }, []);

  // Création de compte par mot de passe. 'confirm' = email de confirmation requis.
  const signUpPassword = useCallback(
    async (email: string, password: string, next?: string): Promise<"ok" | "confirm" | "error"> => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(retour(next))}`,
          data: { lang: locale },
        },
      });
      if (error) return "error";
      return data.session ? "ok" : "confirm";
    },
    [locale],
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
