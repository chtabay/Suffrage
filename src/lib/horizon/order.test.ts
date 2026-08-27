import assert from "node:assert/strict";
import { test } from "node:test";
import { validateHorizonOrder } from "./order";

const VALID = {
  product: "shirt",
  variant: "cream",
  quantity: 2,
  option: "M",
  name: "Camille",
  email: "camille@example.com",
  country: "France",
  note: "Cadeau",
  horizonUrl: "https://placet.app/fr/horizon#v=1&d=1980-01-01&s=f&p=Camille",
  locale: "fr",
};

test("une demande Horizon valide est normalisée", () => {
  const result = validateHorizonOrder({ ...VALID, email: " CAMILLE@EXAMPLE.COM " });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.email, "camille@example.com");
});

test("une variante étrangère au produit est refusée", () => {
  assert.deepEqual(validateHorizonOrder({ ...VALID, variant: "coral" }), { ok: false, error: "invalid" });
});

test("la taille est obligatoire uniquement pour le T-shirt", () => {
  assert.equal(validateHorizonOrder({ ...VALID, option: "" }).ok, false);
  assert.equal(validateHorizonOrder({ ...VALID, product: "mug", option: "" }).ok, true);
  assert.equal(validateHorizonOrder({ ...VALID, product: "mug", option: "M" }).ok, false);
});

test("seul un lien Horizon Placet portant un fragment v1 est accepté", () => {
  assert.equal(validateHorizonOrder({ ...VALID, horizonUrl: "https://example.com/horizon#v=1&d=1980-01-01" }).ok, false);
  assert.equal(validateHorizonOrder({ ...VALID, horizonUrl: "https://placet.app/fr/horizon" }).ok, false);
});
