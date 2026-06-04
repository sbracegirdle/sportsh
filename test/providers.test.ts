import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseEspnCricinfoToday } from "../src/providers/cricket/espnCricinfo.ts";
import { parseCourseDuJourToday } from "../src/providers/cycling/courseDuJour.ts";

test("parseEspnCricinfoToday extracts cricket events from embedded JSON", async () => {
  const html = await readFile(new URL("./fixtures/espncricinfo-live.html", import.meta.url), "utf8");
  const events = parseEspnCricinfoToday(html);

  assert.equal(events.length, 1);
  assert.equal(events[0]?.sport, "cricket");
  assert.equal(events[0]?.name, "Australia vs India");
  assert.equal(events[0]?.status, "final");
  assert.deepEqual(events[0]?.participants, ["Australia", "India"]);
  assert.equal(events[0]?.competition, "Test Trophy");
  assert.equal(events[0]?.startTime, "2026-06-04T11:30:00.000Z");
});

test("parseCourseDuJourToday extracts race rows from the daily schedule", async () => {
  const html = await readFile(new URL("./fixtures/course-du-jour.html", import.meta.url), "utf8");
  const events = parseCourseDuJourToday(html, new Date("2026-06-04T12:00:00.000Z"));

  assert.equal(events.length, 1);
  assert.equal(events[0]?.source, "Course du Jour");
  assert.equal(events[0]?.name, "Ethias-Tour de Wallonie — Stage 4");
  assert.equal(events[0]?.startTime, "2026-06-04T11:15:00+00:00");
  assert.equal(events[0]?.status, "live");
  assert.equal(events[0]?.competition, "2.Pro (Men)");
  assert.equal(events[0]?.detail, "2.Pro (Men) · Dison, Belgium · Eurosport / HBO Max (EUR)");
});
