import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseEspnCricinfoToday } from "../src/providers/cricket/espnCricinfo.ts";
import { parseCourseDuJourToday, parseDomestiqueResults } from "../src/providers/cycling/courseDuJour.ts";
import { parseFootyWireFixture } from "../src/providers/afl/footyWire.ts";
import { parseDriverList, parseSeasonSessions, parseStandingsGrid } from "../src/providers/motorsport/f1.ts";

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

test("parseStandingsGrid builds the F1 field with teams in championship order", () => {
  const json = JSON.stringify({
    MRData: {
      StandingsTable: {
        StandingsLists: [{
          DriverStandings: [
            { position: "1", Driver: { givenName: "Andrea Kimi", familyName: "Antonelli", nationality: "Italian" }, Constructors: [{ name: "Mercedes" }] },
            { position: "2", Driver: { givenName: "Charles", familyName: "Leclerc", nationality: "Monegasque" }, Constructors: [{ name: "Ferrari" }] },
          ],
        }],
      },
    },
  });

  const grid = parseStandingsGrid(json);
  assert.deepEqual(grid, [
    { name: "Andrea Kimi Antonelli", nationality: "Italian", team: "Mercedes" },
    { name: "Charles Leclerc", nationality: "Monegasque", team: "Ferrari" },
  ]);
});

test("parseDriverList falls back to drivers without team data", () => {
  const json = JSON.stringify({
    MRData: { DriverTable: { Drivers: [{ givenName: "Max", familyName: "Verstappen", nationality: "Dutch" }] } },
  });

  assert.deepEqual(parseDriverList(json), [{ name: "Max Verstappen", nationality: "Dutch" }]);
});

test("parseStandingsGrid returns nothing for malformed or empty input", () => {
  assert.deepEqual(parseStandingsGrid("not json"), []);
  assert.deepEqual(parseStandingsGrid(JSON.stringify({ MRData: { StandingsTable: { StandingsLists: [] } } })), []);
});

test("parseSeasonSessions builds timed, ordered sessions per race", () => {
  const json = JSON.stringify({
    MRData: {
      RaceTable: {
        Races: [{
          raceName: "Miami Grand Prix",
          date: "2026-05-03",
          time: "20:00:00Z",
          FirstPractice: { date: "2026-05-01", time: "16:00:00Z" },
          SprintQualifying: { date: "2026-05-01", time: "20:30:00Z" },
          Sprint: { date: "2026-05-02", time: "16:00:00Z" },
          Qualifying: { date: "2026-05-02", time: "20:00:00Z" },
        }],
      },
    },
  });

  assert.deepEqual(parseSeasonSessions(json).get("Miami Grand Prix"), [
    { name: "Practice 1", startTime: "2026-05-01T16:00:00Z" },
    { name: "Sprint Qualifying", startTime: "2026-05-01T20:30:00Z" },
    { name: "Sprint", startTime: "2026-05-02T16:00:00Z" },
    { name: "Qualifying", startTime: "2026-05-02T20:00:00Z" },
    { name: "Race", startTime: "2026-05-03T20:00:00Z" },
  ]);
});
