import assert from "node:assert/strict";
import { test } from "node:test";
import { isFrenchDeliveryCountry, parseHorizonAddressSuggestions, validateHorizonOrder } from "./order";

const VALID = {
  product: "shirt",
  variant: "cream",
  quantity: 2,
  option: "M",
  name: "Camille",
  email: "camille@example.com",
  address: "10 rue de la Paix, 75002 Paris",
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

test("l'adresse de livraison est obligatoire", () => {
  assert.equal(validateHorizonOrder({ ...VALID, address: "" }).ok, false);
});

test("les suggestions IGN sont nettoyées, dédoublonnées et bornées", () => {
  const results = parseHorizonAddressSuggestions({ results: [
    { fulltext: " 10 rue de la Paix, 75002 Paris ", zipcode: "75002", city: "Paris" },
    { fulltext: "10 rue de la Paix, 75002 Paris" },
    null,
    { fulltext: 42 },
  ] });
  assert.deepEqual(results, [{ fulltext: "10 rue de la Paix, 75002 Paris", zipcode: "75002", city: "Paris", street: undefined }]);
});

test("l'autocomplétion IGN ne s'active que pour la France", () => {
  assert.equal(isFrenchDeliveryCountry("France"), true);
  assert.equal(isFrenchDeliveryCountry("Francia"), true);
  assert.equal(isFrenchDeliveryCountry("Belgique"), false);
});
