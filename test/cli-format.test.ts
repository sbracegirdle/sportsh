import assert from "node:assert/strict";
import test from "node:test";
import { formatEventTime, formatHeadingDate } from "../src/cli/format.ts";

test("formatHeadingDate produces a readable date", () => {
  assert.equal(formatHeadingDate(new Date("2026-06-04T00:00:00.000Z")), "Thu, 4 Jun 2026");
});

test("formatEventTime shows only time for the reference date", () => {
  assert.match(
    formatEventTime("2026-06-04T11:15:00.000Z", new Date("2026-06-04T00:00:00.000Z")) ?? "",
    /^\d{1,2}:15\s?(AM|PM)?$/i,
  );
});

test("formatEventTime includes date when event is on a different local date", () => {
  assert.match(
    formatEventTime("2026-06-05T11:15:00.000Z", new Date("2026-06-04T00:00:00.000Z")) ?? "",
    /Fri 5 Jun/,
  );
});

test("formatEventTime hides date-only values", () => {
  assert.equal(formatEventTime("2026-06-04", new Date("2026-06-04T00:00:00.000Z")), undefined);
});
