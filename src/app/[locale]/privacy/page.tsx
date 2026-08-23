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
      updated: "Dernière mise à jour : 23 août 2026",
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
          p: "Une partie n'exige aucun compte. Chaque joueur choisit un prénom ou un pseudo, puis saisit ce que le jeu lui demande : des mots, ou — dans un jeu d'enquête — la pièce où il se trouvait, un soupçon et une accusation, qui DÉSIGNENT NOMMÉMENT un autre joueur de la même partie. Ces éléments sont montrés aux autres joueurs de la salle : le prénom et les réponses à chaque manche, les soupçons et les accusations à la fin de la partie. N'y mettez que ce que vous acceptez de montrer au groupe. Certains jeux demandent aussi une tranche d'âge (enfant, ado, adulte), déclarée librement et sans vérification — elle sert à calibrer les consignes, jamais à autre chose. Rien de tout cela n'est rattaché à un compte ni réutilisé ailleurs dans Placet. Les jeux quotidiens, eux, se jouent seul et ne montrent jamais la réponse d'un autre joueur. Un tableau public existe pour chaque journée, et on n'y figure que si on l'a demandé : soit en déposant un nom pris dans une liste fermée fournie par le jeu, soit — si vous avez un compte Placet — sous le pseudo de ce compte, que vous choisissez librement une fois et qui vous nomme ensuite partout. Ce nom et votre score du jour sont alors montrés aux autres joueurs de la même journée et de la même langue ; vos mots ou votre réponse, jamais. Il n'y a pas de champ de nom libre sans compte, parce qu'un nom que tous les joueurs du jour peuvent lire appelle quelqu'un pour en répondre. Vous pouvez aussi rejoindre une « tablée » en ouvrant le lien que quelqu'un vous envoie : vous y déposez un nom selon les mêmes règles, et les autres membres de cette tablée voient, chaque jour, qui a joué et son résultat — jamais vos mots ni votre réponse. Une tablée n'a ni annuaire ni profil : on n'y entre que par son lien, et on n'y est visible que de ses membres.",
        },
        {
          h: "Notifications",
          p: "Elles sont facultatives et ne partent qu'après votre accord explicite, donné dans le navigateur. Si vous les activez, nous enregistrons l'adresse d'abonnement que votre navigateur fabrique — elle désigne cet appareil auprès du service de son éditeur (Apple, Google, Mozilla ou Microsoft selon le navigateur) —, les deux clés qui permettent de chiffrer le message, votre fuseau horaire et la langue de l'interface. Le fuseau sert à ne pas vous écrire au milieu de la nuit, la langue à vous écrire dans la vôtre. Les notifications des jeux quotidiens sont rattachées à votre compte : le résultat d'une journée une fois close, un récapitulatif de la semaine, les médailles de fin de mois — au plus une par jour et par jeu. Vous pouvez couper chacun de ces trois envois depuis la page des jeux quotidiens, et retirer l'autorisation à tout moment dans les réglages de votre navigateur ; l'abonnement est alors supprimé dès le premier envoi qui échoue. Nous gardons trente jours la trace de ce qui vous a été envoyé, uniquement pour ne pas vous l'envoyer deux fois.",
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
          p: "Les votes et les bulletins sont conservés jusqu'à ce que vous les supprimiez ou nous le demandiez. Les salles de jeu font exception : elles sont effacées automatiquement 7 jours après la dernière activité de la partie, avec les prénoms, les mots et les scores qu'elles contiennent. Les jeux quotidiens n'ont pas de salle : la réponse d'un joueur ou le résultat de sa partie (nombre d'essais, durée), le numéro de la journée, un identifiant tiré au hasard par son navigateur et, s'il y en a un, le nom déposé au tableau du jour sont conservés 30 jours, puis supprimés. Cet identifiant sert uniquement à reconnaître vos parties d'un jour à l'autre pour vous rendre votre résultat et votre place ; il est PROPRE À CHAQUE JEU, donc il ne relie pas vos parties d'un jeu à l'autre, et il est effacé dès que vous rattachez ces parties à un compte. Un nom pris dans la liste fermée ne vaut que pour une journée : il n'existe alors ni profil ni pseudo permanent, et il n'est pas recopié dans le résumé de compte. Si vous avez un compte Placet, c'est en revanche le pseudo de ce compte qui vous nomme partout — tableau du jour, groupe, classements — et il est conservé tant que vous ne le changez pas et que vous ne supprimez pas le compte. Une tablée et les noms qui y sont déposés s'effacent de la même façon, dès que plus aucun de ses membres n'y a joué depuis 30 jours. Si vous choisissez de rattacher vos résultats à un compte — c'est facultatif, et le jeu marche sans —, un résumé (numéro de journée, score, langue) est alors gardé sur ce compte tant que vous ne le supprimez pas : c'est ce qui permet à une série de durer plus de trente jours. Ni vos réponses ni vos mots ne sont recopiés dans ce résumé.",
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
      updated: "Last updated: 23 August 2026",
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
          p: "A game needs no account. Each player picks a first name or nickname, then enters whatever the game asks for: words, or — in a detective game — the room they were in, a suspicion and an accusation, which NAME another player in the same game. These are shown to the other players in the room: the name and each round's answers as you go, the suspicions and accusations at the end. Only put in what you're happy to show the group. Some games also ask for an age band (child, teen, adult), freely declared and unverified — it only calibrates the instructions, nothing else. None of it is attached to an account or reused elsewhere in Placet. Daily games, by contrast, are played alone and never show you another player's answer. Each day does have a public board, and you only appear on it if you asked to: either by leaving a name taken from a closed list the game provides, or — if you have a Placet account — under that account's name, which you choose freely once and which then identifies you everywhere. That name and your score for the day are then shown to the other players of the same day and the same language; your words or your answer, never. There is no free name field without an account, because a name every player of the day can read needs someone to answer for it. You can also join a \"table\" by opening a link someone sends you: you leave a name there under the same rules, and the other members of that table see, each day, who played and how they did — never your words or your answer. A table has no directory and no profile: you only get in through its link, and you are only visible to its members.",
        },
        {
          h: "Notifications",
          p: "They are optional and only go out after you explicitly agree, in your browser. If you turn them on, we store the subscription address your browser creates — it identifies this device to its vendor's service (Apple, Google, Mozilla or Microsoft, depending on the browser) —, the two keys used to encrypt the message, your time zone and your interface language. The time zone is there so we don't write to you in the middle of the night, the language so we write in yours. Daily-game notifications are attached to your account: a day's result once it closes, a weekly recap, end-of-month medals — at most one per day and per game. You can switch off each of those three from the daily-games page, and withdraw permission at any time in your browser's settings; the subscription is then deleted at the first delivery that fails. We keep a record of what was sent to you for thirty days, solely so we don't send it twice.",
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
          p: "Polls and ballots are kept until you delete them or ask us to. Game rooms are the exception: they are deleted automatically 7 days after the game's last activity, along with the names, words and scores they hold. Daily games have no room: a player's answer or the outcome of their game (number of guesses, duration), the day number, a random identifier drawn by their browser and, if there is one, the name left on that day's board are kept for 30 days, then deleted. That identifier only serves to recognise your games from one day to the next so we can give you back your result and your standing; it is SPECIFIC TO EACH GAME, so it does not link your games across games, and it is erased as soon as you attach those games to an account. A name taken from the closed list is for one day only: there is then no profile and no permanent nickname, and it is not copied into the account summary. If you have a Placet account, however, it is that account's name that identifies you everywhere — day board, group, leaderboards — and it is kept until you change it or delete the account. A table, and the names left in it, are deleted the same way, once none of its members has played for 30 days. If you choose to attach your results to an account — it is optional, and the game works without one — a summary (day number, score, language) is then kept on that account until you delete it: that is what lets a streak outlast the thirty days. Neither your answers nor your words are copied into that summary.",
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
      updated: "Última actualización: 23 de agosto de 2026",
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
          p: "Una partida no requiere cuenta. Cada jugador elige un nombre o apodo y luego escribe lo que el juego le pide: palabras o —en un juego de detectives— la habitación donde estaba, una sospecha y una acusación, que SEÑALAN POR SU NOMBRE a otro jugador de la misma partida. Todo ello se muestra a los demás jugadores de la sala: el nombre y las respuestas de cada ronda sobre la marcha, las sospechas y acusaciones al final. Pon solo lo que aceptes mostrar al grupo. Algunos juegos piden también una franja de edad (peque, adolescente, adulto), declarada libremente y sin verificación — solo calibra las consignas, nada más. Nada de esto se vincula a una cuenta ni se reutiliza en otro lugar de Placet. Los juegos diarios, en cambio, se juegan en solitario y nunca muestran la respuesta de otro jugador. Cada día tiene sin embargo una tabla pública, y solo apareces en ella si lo has pedido: o bien dejando un nombre tomado de una lista cerrada que ofrece el juego, o bien —si tienes una cuenta Placet— con el nombre de esa cuenta, que eliges libremente una vez y que luego te identifica en todas partes. Ese nombre y tu puntuación del día se muestran entonces a los demás jugadores del mismo día y del mismo idioma; tus palabras o tu respuesta, nunca. No hay campo de nombre libre sin cuenta, porque un nombre que pueden leer todos los jugadores del día necesita a alguien que responda por él. También puedes unirte a una «mesa» abriendo el enlace que alguien te envíe: dejas un nombre con las mismas reglas, y los demás miembros de esa mesa ven, cada día, quién ha jugado y qué tal le ha ido — nunca tus palabras ni tu respuesta. Una mesa no tiene directorio ni perfil: solo se entra por su enlace, y solo eres visible para sus miembros.",
        },
        {
          h: "Notificaciones",
          p: "Son opcionales y solo se envían tras tu consentimiento explícito, dado en el navegador. Si las activas, guardamos la dirección de suscripción que crea tu navegador — identifica este aparato ante el servicio de su editor (Apple, Google, Mozilla o Microsoft, según el navegador) —, las dos claves que permiten cifrar el mensaje, tu zona horaria y el idioma de la interfaz. La zona horaria sirve para no escribirte en mitad de la noche, y el idioma para escribirte en el tuyo. Las notificaciones de los juegos diarios van ligadas a tu cuenta: el resultado de una jornada una vez cerrada, un resumen de la semana y las medallas de fin de mes — como mucho una al día y por juego. Puedes desactivar cada uno de esos tres envíos desde la página de juegos diarios, y retirar el permiso cuando quieras en los ajustes de tu navegador; la suscripción se borra entonces en el primer envío que falle. Guardamos treinta días el registro de lo que se te ha enviado, únicamente para no enviártelo dos veces.",
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
          p: "Las votaciones y las papeletas se conservan hasta que las elimines o nos lo pidas. Las salas de juego son la excepción: se borran automáticamente 7 días después de la última actividad de la partida, junto con los nombres, las palabras y las puntuaciones que contienen. Los juegos diarios no tienen sala: la respuesta de un jugador o el resultado de su partida (número de intentos, duración), el número del día, un identificador aleatorio generado por su navegador y, si lo hay, el nombre dejado en la tabla del día se conservan 30 días y luego se eliminan. Ese identificador solo sirve para reconocer tus partidas de un día para otro y devolverte tu resultado y tu posición; es PROPIO DE CADA JUEGO, así que no vincula tus partidas entre juegos, y se borra en cuanto vinculas esas partidas a una cuenta. Un nombre tomado de la lista cerrada vale para un solo día: entonces no existe ni perfil ni apodo permanente, y no se copia en el resumen de la cuenta. En cambio, si tienes una cuenta Placet, es el nombre de esa cuenta el que te identifica en todas partes —tabla del día, grupo, clasificaciones— y se conserva mientras no lo cambies y no borres la cuenta. Una mesa, y los nombres dejados en ella, se borran igual en cuanto ninguno de sus miembros ha jugado durante 30 días. Si decides vincular tus resultados a una cuenta —es opcional, y el juego funciona sin ella—, se guarda entonces un resumen (número del día, puntuación, idioma) en esa cuenta hasta que la elimines: es lo que permite que una racha dure más de treinta días. Ni tus respuestas ni tus palabras se copian en ese resumen.",
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
