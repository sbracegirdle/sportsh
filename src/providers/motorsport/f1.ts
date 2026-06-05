import type { EventParticipant, EventSession, SportsEvent, SportsProvider } from "../../domain/events.ts";
import { fetchCachedText } from "../shared/cache.ts";
import { createStaticCalendarProvider } from "../shared/staticCalendar.ts";

const SOURCE_URL = "https://www.formula1.com/en/latest/article/formula-1-reveals-calendar-for-2026-season.YctbMZWqBvrgyddrnauo8";
const ENTRY_LIST_URL = "https://www.formula1.com/en/results/2026/drivers";
// Jolpica is the maintained successor to the Ergast F1 API.
const STANDINGS_API = "https://api.jolpi.ca/ergast/f1/2026/driverstandings.json";
const DRIVERS_API = "https://api.jolpi.ca/ergast/f1/2026/drivers.json";
const SCHEDULE_API = "https://api.jolpi.ca/ergast/f1/2026.json";
const GRID_TTL_MS = 6 * 60 * 60 * 1000;
const SCHEDULE_TTL_MS = 24 * 60 * 60 * 1000;

export function createF1Provider(): SportsProvider {
  const calendar = createStaticCalendarProvider({
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

  return {
    sport: "f1",
    async listEvents(context) {
      return attachLiveData(await calendar.listEvents(context), context.fresh);
    },
    async listResults(context) {
      return calendar.listResults(context);
    },
    async nextEvent(context) {
      return attachLiveData(await calendar.nextEvent!(context), context.fresh);
    },
  };
}

/** Adds the season entry list and real session times (when available) to each grand prix. */
async function attachLiveData(events: SportsEvent[], fresh: boolean): Promise<SportsEvent[]> {
  if (events.length === 0) {
    return events;
  }

  const [grid, schedule] = await Promise.all([fetchGrid(fresh), fetchSchedule(fresh)]);

  return events.map((event) => ({
    ...event,
    startList: grid.length > 0 ? grid : event.startList,
    startListUrl: grid.length > 0 ? ENTRY_LIST_URL : event.startListUrl,
    // Prefer real timed sessions from the API; fall back to the day-only weekend outline.
    sessions: schedule.get(event.name) ?? event.sessions,
  }));
}

async function fetchSchedule(fresh: boolean): Promise<Map<string, EventSession[]>> {
  try {
    return parseSeasonSessions(await fetchCachedText(SCHEDULE_API, { fresh, ttlMs: SCHEDULE_TTL_MS }));
  } catch {
    return new Map();
  }
}

async function fetchGrid(fresh: boolean): Promise<EventParticipant[]> {
  try {
    const standings = parseStandingsGrid(await fetchCachedText(STANDINGS_API, { fresh, ttlMs: GRID_TTL_MS }));
    if (standings.length > 0) {
      return standings;
    }
  } catch {
    // Fall through to the plain driver list.
  }

  try {
    return parseDriverList(await fetchCachedText(DRIVERS_API, { fresh, ttlMs: GRID_TTL_MS }));
  } catch {
    return [];
  }
}

/** Parses the Jolpica/Ergast driver-standings response into a field with teams, in championship order. */
export function parseStandingsGrid(json: string): EventParticipant[] {
  const data = safeParse(json);
  const lists = data?.MRData?.StandingsTable?.StandingsLists;
  const standings = Array.isArray(lists) && isRecord(lists[0]) && Array.isArray(lists[0].DriverStandings)
    ? lists[0].DriverStandings
    : [];

  return standings
    .map((entry: unknown) => {
      if (!isRecord(entry) || !isRecord(entry.Driver)) {
        return undefined;
      }
      const constructors = Array.isArray(entry.Constructors) ? entry.Constructors : [];
      const team = isRecord(constructors[0]) ? stringOf(constructors[0].name) : undefined;
      return participant(entry.Driver, team);
    })
    .filter((value: EventParticipant | undefined): value is EventParticipant => Boolean(value));
}

/** Parses the Jolpica/Ergast driver-list response (no team data). */
export function parseDriverList(json: string): EventParticipant[] {
  const data = safeParse(json);
  const drivers = data?.MRData?.DriverTable?.Drivers;

  return (Array.isArray(drivers) ? drivers : [])
    .map((driver: unknown) => (isRecord(driver) ? participant(driver, undefined) : undefined))
    .filter((value: EventParticipant | undefined): value is EventParticipant => Boolean(value));
}

/** Parses the Jolpica/Ergast season schedule into per-race timed sessions, keyed by race name. */
export function parseSeasonSessions(json: string): Map<string, EventSession[]> {
  const data = safeParse(json);
  const races = data?.MRData?.RaceTable?.Races;
  const map = new Map<string, EventSession[]>();
  if (!Array.isArray(races)) {
    return map;
  }

  for (const race of races) {
    if (!isRecord(race)) {
      continue;
    }
    const name = stringOf(race.raceName);
    if (!name) {
      continue;
    }

    const sessions: EventSession[] = [];
    const add = (key: string, label: string) => {
      const session = race[key];
      if (isRecord(session)) {
        const when = sessionTime(stringOf(session.date), stringOf(session.time));
        if (when) {
          sessions.push({ name: label, startTime: when });
        }
      }
    };

    add("FirstPractice", "Practice 1");
    add("SecondPractice", "Practice 2");
    add("ThirdPractice", "Practice 3");
    add("SprintQualifying", "Sprint Qualifying");
    add("SprintShootout", "Sprint Qualifying");
    add("Sprint", "Sprint");
    add("Qualifying", "Qualifying");

    const raceWhen = sessionTime(stringOf(race.date), stringOf(race.time));
    if (raceWhen) {
      sessions.push({ name: "Race", startTime: raceWhen });
    }

    sessions.sort((left, right) => (left.startTime ?? "").localeCompare(right.startTime ?? ""));
    if (sessions.length > 0) {
      map.set(name, sessions);
    }
  }

  return map;
}

function sessionTime(date: string | undefined, time: string | undefined): string | undefined {
  if (!date) {
    return undefined;
  }
  return time ? `${date}T${time}` : date;
}

function participant(driver: Record<string, unknown>, team: string | undefined): EventParticipant | undefined {
  const name = [stringOf(driver.givenName), stringOf(driver.familyName)].filter(Boolean).join(" ").trim();
  if (!name) {
    return undefined;
  }
  return removeUndefined({
    name,
    nationality: stringOf(driver.nationality),
    team,
  });
}

function event(name: string, startDate: string, endDate: string, venue: string, sprint = false) {
  return {
    name,
    startDate,
    endDate,
    competition: "Formula 1",
    detail: sprint ? `${venue} · Sprint weekend` : venue,
    startListUrl: ENTRY_LIST_URL,
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

function safeParse(json: string): any {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOf(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
