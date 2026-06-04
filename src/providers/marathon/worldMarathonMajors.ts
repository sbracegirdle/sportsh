import type { SportsProvider } from "../../domain/events.ts";
import { createStaticCalendarProvider } from "../shared/staticCalendar.ts";

const SOURCE_URL = "https://www.worldmarathonmajors.com/content-hub/majors-draw-dates-released-for-2025";

export function createWorldMarathonMajorsProvider(): SportsProvider {
  return createStaticCalendarProvider({
    sport: "marathon",
    source: "Abbott World Marathon Majors",
    sourceUrl: SOURCE_URL,
    events: [
      event("Tokyo Marathon", "2026-03-01", "Tokyo, Japan"),
      event("Boston Marathon", "2026-04-20", "Boston, United States"),
      event("TCS London Marathon", "2026-04-26", "London, Great Britain"),
      event("TCS Sydney Marathon", "2026-08-30", "Sydney, Australia"),
      event("BMW Berlin Marathon", "2026-09-27", "Berlin, Germany"),
      event("Bank of America Chicago Marathon", "2026-10-11", "Chicago, United States"),
      event("TCS New York City Marathon", "2026-11-01", "New York City, United States"),
    ],
  });
}

function event(name: string, startDate: string, location: string) {
  return {
    name,
    startDate,
    competition: "World Marathon Majors",
    detail: location,
    facts: [{ label: "Location", value: location }],
  };
}
