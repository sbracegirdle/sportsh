import type { EventSession } from "../../domain/events.ts";
import type { SportsProvider } from "../../domain/events.ts";
import { createStaticCalendarProvider } from "../shared/staticCalendar.ts";

const SOURCE_URL = "https://www.formula1.com/en/latest/article/formula-1-reveals-calendar-for-2026-season.YctbMZWqBvrgyddrnauo8";

export function createF1Provider(): SportsProvider {
  return createStaticCalendarProvider({
    sport: "f1",
    source: "Formula 1",
    sourceUrl: SOURCE_URL,
    events: [
      event("Australian Grand Prix", "2026-03-06", "2026-03-08", "Melbourne"),
      event("Chinese Grand Prix", "2026-03-13", "2026-03-15", "Shanghai", true),
      event("Japanese Grand Prix", "2026-03-27", "2026-03-29", "Suzuka"),
      event("Bahrain Grand Prix", "2026-04-10", "2026-04-12", "Sakhir"),
      event("Saudi Arabian Grand Prix", "2026-04-17", "2026-04-19", "Jeddah"),
      event("Miami Grand Prix", "2026-05-01", "2026-05-03", "Miami", true),
      event("Canadian Grand Prix", "2026-05-22", "2026-05-24", "Montreal", true),
      event("Monaco Grand Prix", "2026-06-05", "2026-06-07", "Monaco"),
      event("Spanish Grand Prix", "2026-06-12", "2026-06-14", "Barcelona-Catalunya"),
      event("Austrian Grand Prix", "2026-06-26", "2026-06-28", "Spielberg"),
      event("British Grand Prix", "2026-07-03", "2026-07-05", "Silverstone", true),
      event("Belgian Grand Prix", "2026-07-17", "2026-07-19", "Spa-Francorchamps"),
      event("Hungarian Grand Prix", "2026-07-24", "2026-07-26", "Budapest"),
      event("Dutch Grand Prix", "2026-08-21", "2026-08-23", "Zandvoort", true),
    ],
  });
}

function event(name: string, startDate: string, endDate: string, venue: string, sprint = false) {
  return {
    name,
    startDate,
    endDate,
    competition: "Formula 1",
    detail: sprint ? `${venue} · Sprint weekend` : venue,
    facts: [
      { label: "Venue", value: venue },
      sprint ? { label: "Format", value: "Sprint weekend" } : undefined,
    ].filter((item): item is { label: string; value: string } => Boolean(item)),
    sessions: weekendSessions(startDate, endDate, sprint),
  };
}

// A standard F1 weekend runs Fri–Sun; only the session days are known here, not
// the exact local start times. Saturday is taken as the day before the race.
function weekendSessions(startDate: string, endDate: string, sprint: boolean): EventSession[] {
  const friday = startDate;
  const sunday = endDate;
  const saturday = addDays(endDate, -1);

  const names: Array<[string, string]> = sprint
    ? [
      ["Practice 1", friday],
      ["Sprint Qualifying", friday],
      ["Sprint", saturday],
      ["Qualifying", saturday],
      ["Race", sunday],
    ]
    : [
      ["Practice 1", friday],
      ["Practice 2", friday],
      ["Practice 3", saturday],
      ["Qualifying", saturday],
      ["Race", sunday],
    ];

  return names.map(([name, day]) => ({ name, startTime: day }));
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
