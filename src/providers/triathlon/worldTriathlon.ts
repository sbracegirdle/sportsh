import type { SportsProvider } from "../../domain/events.ts";
import { createStaticCalendarProvider } from "../shared/staticCalendar.ts";

const SOURCE_URL = "https://events.triathlon.org/2026-wtcs-samarkand";

export function createWorldTriathlonProvider(): SportsProvider {
  return createStaticCalendarProvider({
    sport: "triathlon",
    source: "World Triathlon",
    sourceUrl: SOURCE_URL,
    events: [
      event("WTCS Samarkand", "2026-04-25", "2026-04-26", "Samarkand, Uzbekistan"),
      event("WTCS Yokohama", "2026-05-16", "2026-05-17", "Yokohama, Japan"),
      event("WTCS Alghero", "2026-06-05", "2026-06-06", "Alghero, Italy"),
      event("WTCS Quiberon", "2026-06-20", "2026-06-21", "Quiberon, France"),
      event("WTCS Hamburg", "2026-07-11", "2026-07-12", "Hamburg, Germany"),
      event("WTCS London", "2026-07-25", "2026-07-26", "London, Great Britain"),
      event("WTCS Weihai", "2026-08-29", "2026-08-30", "Weihai, China"),
      event("WTCS Karlovy Vary", "2026-09-13", "2026-09-13", "Karlovy Vary, Czech Republic"),
      event("World Triathlon Championship Finals Pontevedra", "2026-09-23", "2026-09-27", "Pontevedra, Spain"),
    ],
  });
}

function event(name: string, startDate: string, endDate: string, location: string) {
  return {
    name,
    startDate,
    endDate,
    competition: "World Triathlon Championship Series",
    detail: location,
    facts: [{ label: "Location", value: location }],
  };
}
