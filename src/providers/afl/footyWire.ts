import type { SportsEvent, SportsProvider } from "../../domain/events.ts";
import { fetchCachedText } from "../shared/cache.ts";
import { stripTags } from "../shared/html.ts";

const SOURCE = "FootyWire";
const SOURCE_URL = "https://www.footywire.com/afl/footy/ft_match_list?year=2026";

export function createAflProvider(): SportsProvider {
  return {
    sport: "afl",
    async listEvents(context) {
      const html = await fetchCachedText(SOURCE_URL, {
        fresh: context.fresh,
        ttlMs: 6 * 60 * 60 * 1000,
      });

      return parseFootyWireFixture(html, context.date);
    },
    async listResults(context) {
      const html = await fetchCachedText(SOURCE_URL, {
        fresh: context.fresh,
        ttlMs: 6 * 60 * 60 * 1000,
      });

      return parseFootyWireFixture(html, context.date)
        .filter((event) => event.status === "final");
    },
    async nextEvent(context) {
      const html = await fetchCachedText(SOURCE_URL, {
        fresh: context.fresh,
        ttlMs: 6 * 60 * 60 * 1000,
      });

      const dateKey = context.date.toISOString().slice(0, 10);
      const next = parseFootyWireFixture(html)
        .filter((event) => event.status !== "final")
        .find((event) => (event.startTime ?? "") >= dateKey);

      return next ? [{ ...next, detail: next.detail ? `Next scheduled: ${next.detail}` : "Next scheduled" }] : [];
    },
  };
}

export function parseFootyWireFixture(html: string, date?: Date): SportsEvent[] {
  let currentRound: string | undefined;
  const rows = [...html.matchAll(/<tr[\s\S]*?<\/tr>/gi)];
  const events: SportsEvent[] = [];

  for (const row of rows) {
    const round = row[0].match(/Round\s+\d+/)?.[0];
    if (round && row[0].includes("tbtitle")) {
      currentRound = round;
      continue;
    }

    if (!row[0].includes('class="data"')) {
      continue;
    }

    const cells = [...row[0].matchAll(/<td[^>]*class="data"[^>]*>(?<cell>[\s\S]*?)<\/td>/gi)]
      .map((match) => stripTags(match.groups?.cell ?? ""));

    if (cells.length < 5 || !cells[0]?.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s/)) {
      continue;
    }

    const startTime = parseFootyWireDate(cells[0]);
    if (!startTime) {
      continue;
    }

    const teams = cells[1].replace(/\s+v\s+/, " v ");
    const venue = cells[2];
    const score = cells[4];
    const isFinal = Boolean(score.match(/^\d+-\d+$/));

    events.push({
      id: `afl:${startTime}:${teams}`,
      sport: "afl",
      name: teams,
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      status: isFinal ? "final" : "scheduled",
      startTime,
      competition: "AFL Premiership",
      resultSummary: isFinal ? score : undefined,
      detail: venue,
      facts: [
        currentRound ? { label: "Round", value: currentRound } : undefined,
        venue ? { label: "Venue", value: venue } : undefined,
        isFinal ? { label: "Score", value: score } : undefined,
      ].filter((fact): fact is { label: string; value: string } => Boolean(fact)),
    });
  }

  const dateKey = date?.toISOString().slice(0, 10);
  return dateKey ? events.filter((event) => event.startTime?.startsWith(dateKey)) : events;
}

function parseFootyWireDate(value: string): string | undefined {
  const match = value.match(/^(?<dayName>\w{3})\s+(?<day>\d{1,2})\s+(?<month>\w{3})(?:\s+(?<time>\d{1,2}:\d{2}pm|\d{1,2}:\d{2}am))?/i);
  if (!match?.groups) {
    return undefined;
  }

  const month = monthNumber(match.groups.month);
  if (!month) {
    return undefined;
  }

  const date = `2026-${month}-${match.groups.day.padStart(2, "0")}`;
  const time = match.groups.time ? time24(match.groups.time) : undefined;
  return time ? `${date}T${time}:00+08:00` : date;
}

function monthNumber(month: string): string | undefined {
  const months = new Map([
    ["Jan", "01"],
    ["Feb", "02"],
    ["Mar", "03"],
    ["Apr", "04"],
    ["May", "05"],
    ["Jun", "06"],
    ["Jul", "07"],
    ["Aug", "08"],
    ["Sep", "09"],
    ["Oct", "10"],
    ["Nov", "11"],
    ["Dec", "12"],
  ]);

  return months.get(month.slice(0, 1).toUpperCase() + month.slice(1, 3).toLowerCase());
}

function time24(value: string): string {
  const match = value.match(/(?<hour>\d{1,2}):(?<minute>\d{2})(?<period>am|pm)/i);
  if (!match?.groups) {
    return "00:00";
  }

  const hour = Number(match.groups.hour);
  const period = match.groups.period.toLowerCase();
  const adjusted = period === "pm" && hour !== 12 ? hour + 12 : period === "am" && hour === 12 ? 0 : hour;
  return `${String(adjusted).padStart(2, "0")}:${match.groups.minute}`;
}
