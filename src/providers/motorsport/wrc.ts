import type { SportsProvider } from "../../domain/events.ts";
import { createStaticCalendarProvider } from "../shared/staticCalendar.ts";

const SOURCE_URL = "https://www.wrc.com/en/news/2026-fia-world-rally-championship-calendar";

export function createWrcProvider(): SportsProvider {
  return createStaticCalendarProvider({
    sport: "rally",
    source: "WRC",
    sourceUrl: SOURCE_URL,
    events: [
      event("Rallye Monte-Carlo", "2026-01-22", "2026-01-25", "Monaco"),
      event("Rally Sweden", "2026-02-12", "2026-02-15", "Sweden"),
      event("Safari Rally Kenya", "2026-03-12", "2026-03-15", "Kenya"),
      event("Rally Croatia", "2026-04-09", "2026-04-12", "Croatia"),
      event("Rally Islas Canarias", "2026-04-23", "2026-04-26", "Spain"),
      event("Rally de Portugal", "2026-05-07", "2026-05-10", "Portugal"),
      event("Rally Japan", "2026-05-28", "2026-05-31", "Japan"),
      event("Acropolis Rally Greece", "2026-06-25", "2026-06-28", "Greece"),
      event("Rally Estonia", "2026-07-16", "2026-07-19", "Estonia"),
      event("Rally Finland", "2026-07-30", "2026-08-02", "Finland"),
      event("Rally del Paraguay", "2026-08-27", "2026-08-30", "Paraguay"),
      event("Rally Chile Bio Bio", "2026-09-10", "2026-09-13", "Chile"),
      event("Rally Italia Sardegna", "2026-10-01", "2026-10-04", "Italy"),
      event("Rally Saudi Arabia", "2026-11-12", "2026-11-15", "Saudi Arabia"),
    ],
  });
}

function event(name: string, startDate: string, endDate: string, country: string) {
  return {
    name,
    startDate,
    endDate,
    competition: "World Rally Championship",
    detail: country,
    facts: [{ label: "Country", value: country }],
  };
}
