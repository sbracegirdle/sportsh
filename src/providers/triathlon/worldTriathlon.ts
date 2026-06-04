import type { SportsProvider } from "../../domain/events.ts";
import { createStaticCalendarProvider } from "../shared/staticCalendar.ts";

const SOURCE_URL = "https://events.triathlon.org/2026-wtcs-samarkand";
const T100_SOURCE_URL = "https://t100triathlon.com/pro-racing/";
const IRONMAN_SOURCE_URL = "https://www.ironman.com/races";

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
      t100("Gold Coast T100", "2026-03-21", "2026-03-22", "Queensland, Australia", "Women"),
      t100("Singapore T100", "2026-04-25", "2026-04-26", "Singapore", "Men"),
      t100("Spain T100", "2026-05-23", "2026-05-24", "Pamplona-Navarra, Spain", "Women"),
      t100("San Francisco T100", "2026-06-06", "2026-06-07", "San Francisco, United States", "Men"),
      t100("Vancouver T100", "2026-08-15", "2026-08-16", "Vancouver, Canada", "Women"),
      t100("French Riviera T100", "2026-09-19", "2026-09-20", "French Riviera, France", "Men"),
      t100("Dubai T100", "2026-11-12", "2026-11-15", "Dubai, United Arab Emirates", "Women"),
      t100("Saudi Arabia T100", "2026-11-27", "2026-11-29", "Saudi Arabia", "Men"),
      t100("Qatar T100 Triathlon World Championship Final", "2026-12-11", "2026-12-12", "Doha, Qatar", "Men and Women"),
      ironman("IRONMAN World Championship Nice", "2026-09-12", "2026-09-12", "Nice, France", "Full distance"),
      ironman("IRONMAN World Championship Kailua-Kona", "2026-10-10", "2026-10-10", "Kailua-Kona, Hawaii", "Full distance"),
      ironman("IRONMAN 70.3 World Championship", "2026-11-13", "2026-11-15", "Marbella, Spain", "70.3"),
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

function t100(name: string, startDate: string, endDate: string, location: string, proRace: string) {
  return {
    name,
    startDate,
    endDate,
    source: "T100 Triathlon",
    sourceUrl: T100_SOURCE_URL,
    startListUrl: T100_SOURCE_URL,
    competition: "T100 Triathlon World Tour",
    detail: `${location} · ${proRace} pro race`,
    facts: [
      { label: "Location", value: location },
      { label: "Series", value: "T100" },
      { label: "Pro race", value: proRace },
    ],
  };
}

function ironman(name: string, startDate: string, endDate: string, location: string, distance: string) {
  return {
    name,
    startDate,
    endDate,
    source: "IRONMAN",
    sourceUrl: IRONMAN_SOURCE_URL,
    startListUrl: IRONMAN_SOURCE_URL,
    competition: "IRONMAN",
    detail: `${location} · ${distance}`,
    facts: [
      { label: "Location", value: location },
      { label: "Distance", value: distance },
    ],
  };
}
