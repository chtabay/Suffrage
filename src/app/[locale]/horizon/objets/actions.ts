"use server";

import { emailConfigured, sendEmail } from "@/lib/email/send";
import { validateHorizonOrder, type HorizonOrderInput } from "@/lib/horizon/order";

export type HorizonOrderResult =
  | { ok: true; reference: string }
  | { ok: false; error: "invalid" | "unavailable" | "send" };

const PRODUCT_NAMES = {
  shirt: "T-shirt",
  mug: "Mug",
  poster: "Affiche encadrée",
  plaque: "Plaque de bureau",
  magnet: "Magnet",
  card: "Carte métal",
} as const;

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char] ?? char);
}

export async function submitHorizonOrder(input: HorizonOrderInput): Promise<HorizonOrderResult> {
  // Champ leurre : un humain ne le voit jamais. Répondre comme si tout allait
  // bien évite de donner au robot un signal pour ajuster son envoi.
  if (typeof input.website === "string" && input.website.trim()) {
    return { ok: true, reference: "HZ-RECU" };
  }
  const checked = validateHorizonOrder(input);
  if (!checked.ok) return { ok: false, error: "invalid" };
  if (!emailConfigured()) return { ok: false, error: "unavailable" };

  const order = checked.value;
  const reference = `HZ-${Date.now().toString(36).toUpperCase()}`;
  const rows = [
    ["Référence", reference],
    ["Produit", PRODUCT_NAMES[order.product]],
    ["Variante", order.variant],
    ["Option", order.option || "—"],
    ["Quantité", String(order.quantity)],
    ["Nom", order.name],
    ["E-mail", order.email],
    ["Adresse de livraison", order.address],
    ["Pays", order.country],
    ["Langue", order.locale],
    ["Précision", order.note || "—"],
  ];
  const html = `
    <h1>Demande de commande Horizon</h1>
    <table style="border-collapse:collapse">
      ${rows.map(([label, value]) => `<tr><th style="padding:6px 14px 6px 0;text-align:left">${escapeHtml(label)}</th><td style="padding:6px 0">${escapeHtml(value)}</td></tr>`).join("")}
    </table>
    <p><strong>Lien à encoder dans le QR :</strong><br><a href="${escapeHtml(order.horizonUrl)}">${escapeHtml(order.horizonUrl)}</a></p>
  `;
  const sent = await sendEmail({
    to: "contact@placet.app",
    subject: `${reference} · ${PRODUCT_NAMES[order.product]} · ${order.name}`,
    html,
    senderName: "Placet · Horizon",
    replyTo: order.email,
  });
  return sent ? { ok: true, reference } : { ok: false, error: "send" };
}
