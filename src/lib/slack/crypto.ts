// Chiffrement des bot tokens des workspaces tiers (AES-256-GCM), clé SLACK_TOKEN_KEY
// (base64 de 32 octets). Ce sont des credentials de tiers : on ne les stocke jamais en
// clair. Format stocké : base64(iv[12] | ciphertext | tag[16]). Serveur uniquement.
import crypto from "crypto";

function key(): Buffer | null {
  const b64 = process.env.SLACK_TOKEN_KEY;
  if (!b64) return null;
  const k = Buffer.from(b64, "base64");
  return k.length === 32 ? k : null;
}

/** Chiffre un token → base64(iv|ciphertext|tag), ou null si la clé manque. */
export function encryptToken(plain: string): string | null {
  const k = key();
  if (!k) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("base64");
}

/** Déchiffre un token produit par encryptToken (null si clé manquante ou données invalides). */
export function decryptToken(enc: string): string | null {
  const k = key();
  if (!k) return null;
  try {
    const buf = Buffer.from(enc, "base64");
    if (buf.length < 12 + 16 + 1) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(buf.length - 16);
    const ct = buf.subarray(12, buf.length - 16);
    const decipher = crypto.createDecipheriv("aes-256-gcm", k, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
