import assert from "node:assert/strict";
import { test } from "node:test";
import { horizonNotificationText } from "./notifs";

test("les trois rappels ont un texte dans les quatre langues", () => {
  for (const language of ["fr", "en", "es", "pcm"] as const) {
    for (const kind of ["anniversaire", "seuil", "retraite"] as const) {
      const text = horizonNotificationText(kind, language, { firstName: "Audrey", age: 51, years: 38, months: 4, threshold: 30 });
      assert.ok(text.title.length > 0);
      assert.ok(text.body.length > 0);
    }
  }
});
