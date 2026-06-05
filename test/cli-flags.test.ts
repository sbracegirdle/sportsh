import assert from "node:assert/strict";
import test from "node:test";
import { nationalityFlag } from "../src/cli/flags.ts";

test("nationalityFlag resolves demonyms, country codes, and unknowns", () => {
  assert.equal(nationalityFlag("Italian"), "🇮🇹");
  assert.equal(nationalityFlag("British"), "🇬🇧");
  assert.equal(nationalityFlag("Monegasque"), "🇲🇨");
  assert.equal(nationalityFlag("New Zealander"), "🇳🇿");
  assert.equal(nationalityFlag("BEL"), "🇧🇪");
  assert.equal(nationalityFlag("fr"), "🇫🇷");
  assert.equal(nationalityFlag("Klingon"), undefined);
  assert.equal(nationalityFlag(undefined), undefined);
});
