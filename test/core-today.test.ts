import assert from "node:assert/strict";
import test from "node:test";
import { listEvents, listResults } from "../src/core/today.ts";
import type { SportsProvider } from "../src/domain/events.ts";

test("listEvents filters providers and sorts timed events first", async () => {
  const providers: SportsProvider[] = [
    {
      sport: "cricket",
      async listEvents() {
        return [{
          id: "late",
          sport: "cricket",
          name: "Late match",
          source: "test",
          sourceUrl: "https://example.test/late",
          status: "scheduled",
          startTime: "20:00",
        }];
      },
      async listResults() {
        return [];
      },
    },
    {
      sport: "cycling",
      async listEvents() {
        return [{
          id: "early",
          sport: "cycling",
          name: "Early race",
          source: "test",
          sourceUrl: "https://example.test/early",
          status: "scheduled",
          startTime: "09:00",
        }];
      },
      async listResults() {
        return [{
          id: "result",
          sport: "cycling",
          name: "Finished race",
          source: "test",
          sourceUrl: "https://example.test/result",
          status: "final",
          startTime: "08:00",
        }];
      },
    },
  ];

  const events = await listEvents(providers, { sports: ["cycling"] });

  assert.deepEqual(events.map((event) => event.id), ["early"]);
});

test("listResults calls the spoiler-oriented provider method", async () => {
  const providers: SportsProvider[] = [
    {
      sport: "cycling",
      async listEvents() {
        return [];
      },
      async listResults() {
        return [{
          id: "result",
          sport: "cycling",
          name: "Finished race",
          source: "test",
          sourceUrl: "https://example.test/result",
          status: "final",
        }];
      },
    },
  ];

  const events = await listResults(providers, { sports: ["cycling"] });

  assert.deepEqual(events.map((event) => event.id), ["result"]);
});

test("listEvents throws when every selected provider fails", async () => {
  const providers: SportsProvider[] = [
    {
      sport: "cricket",
      async listEvents() {
        throw new Error("network blocked");
      },
      async listResults() {
        throw new Error("network blocked");
      },
    },
  ];

  await assert.rejects(
    listEvents(providers, { sports: ["cricket"] }),
    /All selected sports providers failed/,
  );
});
