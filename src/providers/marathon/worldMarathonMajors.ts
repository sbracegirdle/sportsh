import type { SportsProvider } from "../../domain/events.ts";
import { createStaticCalendarProvider } from "../shared/staticCalendar.ts";

const RACES_URL = "https://www.worldmarathonmajors.com/races";

export function createWorldMarathonMajorsProvider(): SportsProvider {
  return createStaticCalendarProvider({
    sport: "marathon",
    source: "Abbott World Marathon Majors",
    sourceUrl: RACES_URL,
    events: [
      event("Tokyo Marathon", "2026-03-01", "Tokyo, Japan", "Tokyo Marathon", "https://www.marathon.tokyo/en/"),
      event("Boston Marathon", "2026-04-20", "Boston, United States", "Boston Athletic Association", "https://www.baa.org/races/boston-marathon"),
      event("TCS London Marathon", "2026-04-26", "London, Great Britain", "TCS London Marathon", "https://www.tcslondonmarathon.com/the-event/2026-tcs-london-marathon"),
      event("TCS Sydney Marathon", "2026-08-30", "Sydney, Australia", "TCS Sydney Marathon", "https://www.tcssydneymarathon.com/marathon"),
      event("BMW Berlin Marathon", "2026-09-27", "Berlin, Germany", "BMW Berlin Marathon", "https://www.bmw-berlin-marathon.com/en/"),
      event("Bank of America Chicago Marathon", "2026-10-11", "Chicago, United States", "Bank of America Chicago Marathon", "https://www.chicagomarathon.com/"),
      event("TCS New York City Marathon", "2026-11-01", "New York City, United States", "Abbott World Marathon Majors", RACES_URL),
    ],
  });
}

function event(name: string, startDate: string, location: string, source: string, sourceUrl: string) {
  return {
    name,
    startDate,
    source,
    sourceUrl,
    competition: "World Marathon Majors",
    detail: location,
    facts: [{ label: "Location", value: location }],
  };
}
