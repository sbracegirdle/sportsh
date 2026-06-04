import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseEspnCricinfoToday } from "../src/providers/cricket/espnCricinfo.ts";
import { parseCourseDuJourToday, parseDomestiqueResults } from "../src/providers/cycling/courseDuJour.ts";
import { parseFootyWireFixture } from "../src/providers/afl/footyWire.ts";

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
  assert.deepEqual(events[0]?.facts, [
    { label: "Series", value: "Test Trophy" },
    { label: "Venue", value: "Perth Stadium" },
  ]);
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
  assert.deepEqual(events[0]?.facts, [
    { label: "Course", value: "2.Pro (Men)" },
    { label: "Start town", value: "Dison" },
    { label: "End town", value: "Dison" },
    { label: "Coverage", value: "Eurosport / HBO Max (EUR)" },
  ]);
});

test("parseDomestiqueResults extracts cycling winners from the results data", async () => {
  const html = await readFile(new URL("./fixtures/domestique-results.html", import.meta.url), "utf8");
  const events = parseDomestiqueResults(html, new Date("2026-06-03T00:00:00.000Z"));

  assert.equal(events.length, 2);
  assert.equal(events[0]?.source, "Domestique");
  assert.equal(events[0]?.name, "Tour de Wallonie Stage 3");
  assert.equal(events[0]?.resultSummary, "Laurence Pithie won");
  assert.equal(events[0]?.competition, "2.Pro Men");
  assert.equal(events[0]?.detail, "flat · Habay to Vaux-sur-Sûre");
  assert.deepEqual(events[0]?.facts, [
    { label: "Winner", value: "Laurence Pithie" },
    { label: "Course", value: "flat" },
    { label: "Start town", value: "Habay" },
    { label: "End town", value: "Vaux-sur-Sûre" },
    { label: "Category", value: "2.Pro" },
  ]);
  assert.equal(events[1]?.name, "Giro d'Italia Women Stage 5");
  assert.equal(events[1]?.resultSummary, "Demi Vollering won");
  assert.equal(events[1]?.detail, "mountains · Longarone to Santo Stefano di Cadore");
  assert.deepEqual(events[1]?.startList?.slice(0, 2), [
    { name: "Demi Vollering", role: "#1" },
    { name: "Anna van der Breggen", role: "#2" },
  ]);
});

test("parseFootyWireFixture extracts AFL fixtures and results", async () => {
  const html = await readFile(new URL("./fixtures/footywire-afl.html", import.meta.url), "utf8");
  const events = parseFootyWireFixture(html);

  assert.equal(events.length, 2);
  assert.equal(events[0]?.name, "Sydney v Carlton");
  assert.equal(events[0]?.status, "final");
  assert.equal(events[0]?.resultSummary, "132-69");
  assert.equal(events[0]?.detail, "SCG");
  assert.equal(events[1]?.name, "Carlton v Richmond");
  assert.equal(events[1]?.status, "scheduled");
  assert.equal(events[1]?.startTime, "2026-03-13T19:40:00+08:00");
  assert.deepEqual(events[1]?.startList, [
    { name: "Carlton", role: "Home" },
    { name: "Richmond", role: "Away" },
  ]);
});
