import { NextResponse } from "next/server";
import { envoyerNotifsJeux } from "@/lib/games/notifs";

// LA TOURNÉE DES NOTIFICATIONS DES JEUX QUOTIDIENS — appelée toutes les heures.
//
// ⚠️ TOUTES LES HEURES, ET LE CODE TRANCHE. La charnière de Banalo est à 11 h 30
// à Paris, celle de Cinq sur cinq à minuit, et l'étude veut envoyer au plus tard
// de la charnière et d'une heure raisonnable CHEZ LE JOUEUR. Une planification
// fixe ne peut satisfaire aucune des deux, et traverserait le changement d'heure
// deux fois par an. Même motif que `scrutin-game-purge` et que la clôture de
// saison : on repasse souvent, la décision se prend en base.
//
// ⚠️ ELLE EST DÉCLENCHÉE PAR `pg_cron`, PAS PAR VERCEL, et c'est un choix. Le
// plan Hobby de Vercel plafonne les crons à un par jour ; `pg_cron` tourne déjà
// six fois dans ce projet, à la minute qu'on veut, et `pg_net` y est actif
// depuis `resolve-tick-every-2h`. La route, elle, est la même quel que soit le
// déclencheur.
//
// ⚠️ ET ELLE VIT DANS NEXT, PAS DANS UNE FONCTION SQL, POUR UNE RAISON PRÉCISE :
// c'est ici qu'on peut importer `jour.ts` et `calendrier.ts` — la source unique
// des deux calendriers. Faire calculer le numéro de journée à la base
// ajouterait une TROISIÈME copie de l'origine, ce que le dépôt interdit.
export const dynamic = "force-dynamic";

async function tournee(req: Request) {
  // ⚠️ ÉCHOUE FERMÉ, comme `/api/cron/notify` — la leçon y est écrite : une
  // garde du type `if (secret && …)` se DÉSARME quand la variable est absente,
  // et un simple GET public déclencherait alors toutes les notifications. Une
  // variable oubliée doit casser le cron, pas ouvrir la porte.
  //
  // ⚠️ ET C'EST `NOTIFY_SECRET`, PAS UN SECRET DE PLUS. Il garde déjà les RPC de
  // notification et vit déjà dans `scrutin_config`, d'où `pg_cron` le lit pour
  // composer son appel. En inventer un second obligerait à le stocker aussi en
  // base — donc à dupliquer un secret pour ne rien gagner.
  const secret = process.env.NOTIFY_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const r = await envoyerNotifsJeux();
  return NextResponse.json({ ok: true, ...r });
}

// ⚠️ LES DEUX VERBES, ET CE N'EST PAS DE LA COMPLAISANCE. `net.http_post` est le
// seul appel dont ce projet ait un précédent éprouvé (`resolve-tick-every-2h`),
// donc le cron passera par POST ; mais un GET reste indispensable pour éprouver
// la route à la main, avec un simple `curl`, le jour où une tournée n'arrive pas.
// Les deux traversent la MÊME garde : il n'y a pas de porte de service.
export const GET = tournee;
export const POST = tournee;
