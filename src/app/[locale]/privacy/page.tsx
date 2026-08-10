import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { pickLocale } from "@/i18n/locales";
import PlacetMark from "@/components/scrutin/PlacetMark";

// Adresse de contact affichée dans la politique de confidentialité + à reporter
// dans le champ « Support email » de Slack. Mettre en place une redirection
// (support@/contact@placet.app → boîte perso) puis garder la même partout.
const CONTACT_EMAIL = "contact@placet.app";

const INK = "#16213A";
const display = "var(--font-display), 'Bricolage Grotesque', sans-serif";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = pickLocale(locale, {
    fr: "Confidentialité — Placet",
    en: "Privacy — Placet",
    es: "Privacidad — Placet",
  });
  return { title, robots: { index: true, follow: true } };
}

interface Section {
  h: string;
  p: string;
}
interface Content {
  title: string;
  updated: string;
  intro: string;
  sections: Section[];
  contact: string;
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const c = pickLocale<Content>(locale, {
    fr: {
      title: "Politique de confidentialité",
      updated: "Dernière mise à jour : 10 août 2026",
      intro:
        "Placet (placet.app) permet à un groupe d'organiser de vrais votes. Cette page explique ce que nous collectons et pourquoi. Nous gardons le strict minimum.",
      sections: [
        {
          h: "Ce que nous collectons — sur le web",
          p: "Les votes que vous créez (question, options, réglages), les bulletins déposés, et le pseudo ou commentaire facultatif qu'un votant ajoute. Créer ou administrer un vote peut nécessiter une connexion par e-mail.",
        },
        {
          h: "Ce que nous collectons — dans Slack",
          p: "Quand vous utilisez la commande /placet, nous stockons l'identifiant de votre espace de travail, l'identifiant du canal et les identifiants Slack nécessaires pour construire le vote et publier le résultat. Nous demandons des permissions minimales (commands, chat:write) plus users:read pour afficher le bot dans votre langue. Nous ne lisons jamais vos messages.",
        },
        {
          h: "Ce que nous collectons — dans les jeux",
          p: "Une partie n'exige aucun compte. Chaque joueur choisit un prénom ou un pseudo, puis saisit ses mots à chaque manche. Ce prénom est montré aux autres joueurs de la salle, à côté des mots et des points de chaque manche : n'y mettez que ce que vous acceptez de montrer au groupe. Rien de tout cela n'est rattaché à un compte ni réutilisé ailleurs dans Placet.",
        },
        {
          h: "Pourquoi",
          p: "Uniquement pour fournir le service de vote : créer les scrutins, enregistrer les bulletins, calculer et afficher les résultats. Pour les jeux : faire tourner la partie et afficher les scores.",
        },
        {
          h: "Où sont stockées les données",
          p: "Chez Supabase, hébergé dans l'Union européenne (région Paris). L'application tourne sur Vercel.",
        },
        {
          h: "Partage",
          p: "Nous ne vendons pas vos données. Elles ne sont traitées que par les prestataires d'infrastructure qui font tourner le service (Supabase, Vercel) et par Slack lorsque vous utilisez l'app Slack.",
        },
        {
          h: "Conservation",
          p: "Les votes et les bulletins sont conservés jusqu'à ce que vous les supprimiez ou nous le demandiez. Les salles de jeu font exception : elles sont effacées automatiquement 7 jours après la dernière activité de la partie, avec les prénoms, les mots et les scores qu'elles contiennent.",
        },
        {
          h: "Vos droits",
          p: "Vous pouvez demander l'accès à vos données ou leur suppression en nous contactant.",
        },
        {
          h: "Cookies",
          p: "Uniquement ceux nécessaires aux sessions de connexion. Aucun traceur publicitaire.",
        },
        {
          h: "Modifications",
          p: "Nous pouvons mettre à jour cette page ; la date ci-dessus indique la version en vigueur.",
        },
      ],
      contact: "Une question ?",
    },
    en: {
      title: "Privacy policy",
      updated: "Last updated: 10 August 2026",
      intro:
        "Placet (placet.app) lets a group run proper votes. This page explains what we collect and why. We keep it to a minimum.",
      sections: [
        {
          h: "What we collect — on the web",
          p: "The votes you create (question, options, settings), the ballots cast, and any optional nickname or comment a voter adds. Creating or administering a vote may require an email sign-in.",
        },
        {
          h: "What we collect — in Slack",
          p: "When you use the /placet command, we store your workspace ID, the channel ID, and the Slack IDs needed to build the vote and post the result. We request minimal permissions (commands, chat:write) plus users:read to show the bot in your language. We never read your messages.",
        },
        {
          h: "What we collect — in games",
          p: "A game needs no account. Each player picks a first name or nickname, then enters their words each round. That name is shown to the other players in the room, next to the words and points of each round: only put in what you're happy to show the group. None of it is attached to an account or reused elsewhere in Placet.",
        },
        {
          h: "Why",
          p: "Solely to provide the voting service: create polls, record ballots, compute and display results. For games: run the game and show the scores.",
        },
        {
          h: "Where data is stored",
          p: "On Supabase, hosted in the European Union (Paris region). The app runs on Vercel.",
        },
        {
          h: "Sharing",
          p: "We don't sell your data. It is only processed by the infrastructure providers that run the service (Supabase, Vercel) and by Slack when you use the Slack app.",
        },
        {
          h: "Retention",
          p: "Polls and ballots are kept until you delete them or ask us to. Game rooms are the exception: they are deleted automatically 7 days after the game's last activity, along with the names, words and scores they hold.",
        },
        {
          h: "Your rights",
          p: "You can ask to access or delete your data by contacting us.",
        },
        {
          h: "Cookies",
          p: "Only those needed for sign-in sessions. No advertising trackers.",
        },
        {
          h: "Changes",
          p: "We may update this page; the date above reflects the current version.",
        },
      ],
      contact: "Questions?",
    },
    es: {
      title: "Política de privacidad",
      updated: "Última actualización: 10 de agosto de 2026",
      intro:
        "Placet (placet.app) permite a un grupo organizar votaciones de verdad. Esta página explica qué recopilamos y por qué. Lo mantenemos al mínimo.",
      sections: [
        {
          h: "Qué recopilamos — en la web",
          p: "Las votaciones que creas (pregunta, opciones, ajustes), las papeletas emitidas y el apodo o comentario opcional que añada quien vota. Crear o administrar una votación puede requerir iniciar sesión por correo.",
        },
        {
          h: "Qué recopilamos — en Slack",
          p: "Cuando usas el comando /placet, almacenamos el identificador de tu espacio de trabajo, el del canal y los identificadores de Slack necesarios para construir la votación y publicar el resultado. Solicitamos permisos mínimos (commands, chat:write) más users:read para mostrar el bot en tu idioma. Nunca leemos tus mensajes.",
        },
        {
          h: "Qué recopilamos — en los juegos",
          p: "Una partida no requiere cuenta. Cada jugador elige un nombre o apodo y luego escribe sus palabras en cada ronda. Ese nombre se muestra a los demás jugadores de la sala, junto a las palabras y los puntos de cada ronda: pon solo lo que aceptes mostrar al grupo. Nada de esto se vincula a una cuenta ni se reutiliza en otro lugar de Placet.",
        },
        {
          h: "Por qué",
          p: "Únicamente para prestar el servicio de votación: crear las votaciones, registrar las papeletas, calcular y mostrar los resultados. Para los juegos: hacer funcionar la partida y mostrar las puntuaciones.",
        },
        {
          h: "Dónde se almacenan los datos",
          p: "En Supabase, alojado en la Unión Europea (región de París). La aplicación funciona en Vercel.",
        },
        {
          h: "Compartir",
          p: "No vendemos tus datos. Solo los tratan los proveedores de infraestructura que hacen funcionar el servicio (Supabase, Vercel) y Slack cuando usas la app de Slack.",
        },
        {
          h: "Conservación",
          p: "Las votaciones y las papeletas se conservan hasta que las elimines o nos lo pidas. Las salas de juego son la excepción: se borran automáticamente 7 días después de la última actividad de la partida, junto con los nombres, las palabras y las puntuaciones que contienen.",
        },
        {
          h: "Tus derechos",
          p: "Puedes solicitar el acceso a tus datos o su eliminación contactándonos.",
        },
        {
          h: "Cookies",
          p: "Solo las necesarias para las sesiones de inicio de sesión. Sin rastreadores publicitarios.",
        },
        {
          h: "Cambios",
          p: "Podemos actualizar esta página; la fecha anterior refleja la versión vigente.",
        },
      ],
      contact: "¿Preguntas?",
    },
  });

  return (
    <div style={{ minHeight: "100vh" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(6px)",
          background: "rgba(251,246,236,0.82)",
          borderBottom: `2.5px solid ${INK}`,
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "14px 24px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 11, textDecoration: "none", color: INK }}>
            <PlacetMark size={38} />
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em" }}>Placet</span>
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 90px" }}>
        <h1 style={{ fontFamily: display, fontWeight: 800, fontSize: "clamp(30px,5vw,44px)", letterSpacing: "-0.03em", margin: 0 }}>
          {c.title}
        </h1>
        <p style={{ fontSize: 13.5, color: "#5b6379", marginTop: 8 }}>{c.updated}</p>
        <p style={{ fontSize: 17, color: "#2c3447", lineHeight: 1.6, marginTop: 18, maxWidth: "62ch" }}>{c.intro}</p>

        {c.sections.map((s, i) => (
          <div key={i} style={{ marginTop: 26 }}>
            <h2 style={{ fontFamily: display, fontWeight: 800, fontSize: 19, margin: 0 }}>{s.h}</h2>
            <p style={{ fontSize: 15.5, color: "#2c3447", lineHeight: 1.6, marginTop: 8, maxWidth: "64ch" }}>{s.p}</p>
          </div>
        ))}

        <div style={{ marginTop: 30, fontSize: 15.5, color: "#2c3447" }}>
          {c.contact}{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: INK, fontWeight: 700 }}>
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </div>
  );
}
