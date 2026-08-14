// L'ALBUM — les photos, et l'endroit exact où elles vivent et meurent.
//
// ⚠️ AUCUNE IMAGE NE QUITTE JAMAIS CET APPAREIL. Le serveur apprend qu'une
// photo a été prise pour telle consigne, jamais ce qu'elle montre. Il n'y a ici
// aucun `fetch`, aucun téléversement, aucune miniature envoyée, aucune
// empreinte : ce fichier ne sait pas parler au réseau.
//
// ⚠️ ON EFFACE À L'EXPOSITION, PAS À LA SORTIE. Une purge au démarrage
// n'aurait JAMAIS lieu dans le cas nominal — on joue une fois, en vacances, sur
// le téléphone d'un enfant, et l'application n'est plus rouverte — et le
// nettoyage automatique du navigateur EXEMPTE les applications installées.
// Chaque photo est donc supprimée dès que sa vignette d'album s'est éteinte :
// le magasin est vide avant la fin de la soirée, sans dépendre d'aucun
// événement de fermeture.
//
// Le TTL n'est qu'un filet pour UN seul cas — la partie abandonnée avant
// l'album. Il ne porte aucune promesse.

const DB = "placet-fantome-album";
const STORE = "photos";
/** Trois heures : le filet de la partie abandonnée, pas la garantie. */
const TTL_MS = 3 * 60 * 60 * 1000;

export interface Shot {
  id: string;
  room: string;
  round: number;
  card: string;
  at: number;
  blob: Blob;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("room", "room");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (os: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

/** Range une photo. `id` est déterministe : une seule par consigne et par manche. */
export async function put(room: string, round: number, card: string, blob: Blob): Promise<void> {
  const shot: Shot = { id: `${room}:${round}:${card}`, room, round, card, at: Date.now(), blob };
  await tx("readwrite", (os) => os.put(shot));
}

export async function get(room: string, round: number, card: string): Promise<Shot | undefined> {
  return tx("readonly", (os) => os.get(`${room}:${round}:${card}`) as IDBRequest<Shot | undefined>);
}

/** Mes photos de la soirée, dans l'ordre où elles ont été prises. */
export async function mine(room: string): Promise<Shot[]> {
  const all = await tx("readonly", (os) => os.getAll() as IDBRequest<Shot[]>);
  return all.filter((s) => s.room === room).sort((a, b) => a.at - b.at);
}

/**
 * ⚠️ LE GESTE QUI TIENT LA PROMESSE. Appelé dès que la vignette s'éteint à
 * l'album — pendant que la pièce rit, pas à la fin.
 */
export async function drop(id: string): Promise<void> {
  await tx("readwrite", (os) => os.delete(id));
}

/** Tout effacer pour cette salle : le bouton de secours, et la fin de l'album. */
export async function clearRoom(room: string): Promise<void> {
  const all = await tx("readonly", (os) => os.getAll() as IDBRequest<Shot[]>);
  for (const s of all) if (s.room === room) await drop(s.id);
}

/**
 * Le filet. Efface ce qui traîne d'une partie abandonnée, et ce qui appartient
 * à une AUTRE salle que celle qu'on ouvre.
 * ⚠️ À n'appeler qu'APRÈS avoir la salle courante : appelée avant, avec un code
 * indéfini, elle effacerait l'album entier.
 */
export async function sweep(currentRoom: string): Promise<void> {
  if (!currentRoom) return;
  const all = await tx("readonly", (os) => os.getAll() as IDBRequest<Shot[]>);
  const now = Date.now();
  for (const s of all) {
    if (s.room !== currentRoom || now - s.at > TTL_MS) await drop(s.id);
  }
}

export function available(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}
