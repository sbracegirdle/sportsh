import assert from "node:assert/strict";
import test from "node:test";
import { getTodayEvents } from "../src/core/today.ts";
import type { SportsProvider } from "../src/domain/events.ts";

test("getTodayEvents filters providers and sorts timed events first", async () => {
  const providers: SportsProvider[] = [
    {
      sport: "cricket",
      async today() {
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
    },
    {
      sport: "cycling",
      async today() {
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
    },
  ];

  const events = await getTodayEvents(providers, { sports: ["cycling"] });

  assert.deepEqual(events.map((event) => event.id), ["early"]);
});

test("getTodayEvents throws when every selected provider fails", async () => {
  const providers: SportsProvider[] = [
    {
      sport: "cricket",
      async today() {
        throw new Error("network blocked");
      },
    },
  ];

  await assert.rejects(
    getTodayEvents(providers, { sports: ["cricket"] }),
    /All selected sports providers failed/,
  );
});
