import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateHorizon,
  encodeHorizonFragment,
  exactAgeAt,
  MAX_FRAGMENT_LENGTH,
  parseHorizonFragment,
  type HorizonPayload,
} from "./horizon";

const CLAIRE: HorizonPayload = {
  birthDate: "1976-05-12",
  sex: "f",
  firstName: "Claire",
  title: "Mon horizon",
  comment: "Un petit mot",
};

test("le fragment v1 conserve les champs partagés", () => {
  const fragment = encodeHorizonFragment(CLAIRE);
  assert.equal(fragment, "v=1&d=1976-05-12&s=f&p=Claire&t=Mon+horizon&c=Un+petit+mot");
  assert.deepEqual(parseHorizonFragment(fragment), CLAIRE);
});

test("un fragment mal formé ou trop long est refusé", () => {
  assert.equal(parseHorizonFragment("v=2&d=1976-05-12&s=f&p=Claire"), null);
  assert.equal(parseHorizonFragment("v=1&d=1976-02-31&s=f&p=Claire"), null);
  assert.equal(parseHorizonFragment(`v=1&d=1976-05-12&s=f&p=${"a".repeat(41)}`), null);
  assert.equal(parseHorizonFragment("a".repeat(MAX_FRAGMENT_LENGTH + 1)), null);
});

test("l'âge exact progresse entre deux anniversaires", () => {
  const birth = new Date(Date.UTC(1976, 4, 12));
  assert.equal(exactAgeAt(birth, new Date(Date.UTC(2026, 4, 12))), 50);
  const halfway = exactAgeAt(birth, new Date(Date.UTC(2026, 10, 12)));
  assert.ok(halfway > 50.49 && halfway < 50.51);
});

test("le 29 février suit la convention du 28 février", () => {
  const birth = new Date(Date.UTC(2000, 1, 29));
  assert.equal(exactAgeAt(birth, new Date(Date.UTC(2021, 1, 28))), 21);
});

test("la table centrale Insee retrouve la valeur de la génération 1976 à 50 ans", () => {
  const result = calculateHorizon(CLAIRE, new Date(Date.UTC(2026, 4, 12)));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(Math.abs(result.value.remainingYears - 39.4945) < 0.0001);
  assert.ok(Math.abs(result.value.horizonAge - 89.4945) < 0.0001);
});

test("la référence masculine utilise bien sa propre table", () => {
  const result = calculateHorizon({ ...CLAIRE, sex: "m" }, new Date(Date.UTC(2026, 4, 12)));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(Math.abs(result.value.remainingYears - 35.975) < 0.0001);
});

test("une naissance future ou hors de la table est expliquée", () => {
  assert.deepEqual(calculateHorizon({ ...CLAIRE, birthDate: "2027-01-01" }, new Date(Date.UTC(2026, 0, 1))), {
    ok: false,
    error: "birthInFuture",
  });
  assert.deepEqual(calculateHorizon({ ...CLAIRE, birthDate: "1900-01-01" }, new Date(Date.UTC(2026, 0, 1))), {
    ok: false,
    error: "unsupportedGeneration",
  });
});
