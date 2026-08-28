"use client";

// L'HEURE DE LA PROCHAINE CHARNIÈRE DE BANALO, DANS LE FUSEAU DU LECTEUR.
//
// ⚠️ « 11 H 30 » EST UNE HEURE DE PARIS, ET L'ÉCRIRE TEL QUEL SERAIT FAUX
// PARTOUT AILLEURS : c'est 10 h 30 à Lagos l'été et 5 h 30 à New York. On
// formate donc l'instant réel, et chacun lit son heure.
//
// ⚠️ ET CALCULÉ APRÈS LE MONTAGE, JAMAIS AU RENDU : le serveur et le client
// n'ont pas le même fuseau, donc une valeur posée au rendu ferait diverger
// l'hydratation. D'où la chaîne vide au premier passage — les appelants
// doivent la traiter comme « pas encore su », pas comme « pas d'heure ».
//
// Sorti en UN exemplaire parce qu'il en fallait trois : l'annonce de la
// prochaine question, et la barre de notification des deux formats. Recopié,
// il aurait dérivé — le chemin qu'avaient pris les trois offres de compte.
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { finDeJournee } from "@/lib/games/banalo/jour";

/** `pcm` n'est pas une étiquette BCP-47 qu'`Intl` connaisse : on formate en anglais. */
const bcp = (locale: string) => (locale === "pcm" ? "en" : locale);

export function useProchaineCharniere(): string {
  const locale = useLocale();
  const [heure, setHeure] = useState("");
  useEffect(() => {
    setHeure(
      new Intl.DateTimeFormat(bcp(locale), { hour: "2-digit", minute: "2-digit" }).format(
        new Date(finDeJournee()),
      ),
    );
  }, [locale]);
  return heure;
}
