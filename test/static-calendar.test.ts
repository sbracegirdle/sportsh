import assert from "node:assert/strict";
import test from "node:test";
import { createStaticCalendarProvider } from "../src/providers/shared/staticCalendar.ts";

test("static calendar provider lists events that overlap the requested date", async () => {
  const originalFetch = globalThis.fetch;
  const originalCacheDir = process.env.SPORTSH_CACHE_DIR;
  globalThis.fetch = async () => new Response("<html>ok</html>", { status: 200 });
  process.env.SPORTSH_CACHE_DIR = "/tmp/sportsh-test-cache";

  try {
    const provider = createStaticCalendarProvider({
      sport: "f1",
      source: "Test Source",
      sourceUrl: "https://example.test/calendar",
      events: [{
        name: "Test Grand Prix",
        startDate: "2026-06-05",
        endDate: "2026-06-07",
        startListUrl: "https://example.test/start-list",
        competition: "Formula 1",
        detail: "Test Circuit",
      }],
    });

    const events = await provider.listEvents({
      date: new Date("2026-06-06T00:00:00.000Z"),
      fresh: true,
    });

    assert.equal(events.length, 1);
    assert.equal(events[0]?.name, "Test Grand Prix");
    assert.equal(events[0]?.source, "Test Source");
    assert.equal(events[0]?.startListUrl, "https://example.test/start-list");
    assert.equal(events[0]?.status, "scheduled");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalCacheDir === undefined) {
      delete process.env.SPORTSH_CACHE_DIR;
    } else {
      process.env.SPORTSH_CACHE_DIR = originalCacheDir;
    }
  }
});

test("static calendar results are empty until a real result source is implemented", async () => {
  const provider = createStaticCalendarProvider({
    sport: "marathon",
    source: "Test Source",
    sourceUrl: "https://example.test/calendar",
    events: [],
  });

  assert.deepEqual(await provider.listResults({
    date: new Date("2026-06-06T00:00:00.000Z"),
    fresh: false,
  }), []);
});
