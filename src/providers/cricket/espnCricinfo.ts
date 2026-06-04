import type { SportsEvent, SportsProvider } from "../../domain/events.ts";
import { fetchCachedText } from "../shared/cache.ts";
import { extractNextData, walkJson } from "../shared/html.ts";

const SOURCE = "ESPNcricinfo";
const LIVE_SCORES_URL = "https://www.espncricinfo.com/live-cricket-score";
const RESULTS_URL = "https://www.espncricinfo.com/live-cricket-match-results";

export function createEspnCricinfoProvider(): SportsProvider {
  return {
    sport: "cricket",
    async listEvents(context) {
      const html = await fetchCachedText(LIVE_SCORES_URL, {
        fresh: context.fresh,
        ttlMs: 5 * 60 * 1000,
      });

      return parseEspnCricinfoToday(html)
        .filter((event) => happensOnDate(event.startTime, context.date));
    },
    async listResults(context) {
      const html = await fetchCachedText(RESULTS_URL, {
        fresh: context.fresh,
        ttlMs: 5 * 60 * 1000,
      });

      return parseEspnCricinfoToday(html)
        .filter((event) => event.status === "final")
        .filter((event) => happensOnDate(event.startTime, context.date));
    },
  };
}

export function parseEspnCricinfoToday(html: string): SportsEvent[] {
  const data = extractNextData(html);
  const events = new Map<string, SportsEvent>();

  walkJson(data, (object) => {
    const teams = extractTeams(object);
    if (teams.length < 2) {
      return;
    }

    const id = stringFrom(object.objectId) ?? stringFrom(object.id) ?? `${teams.join("-")}-${events.size}`;
    const statusText = [object.statusText, object.status, object.state, object.description]
      .map(stringFrom)
      .filter(isNonEmptyString)
      .join(" ");
    const title = firstString(object.title, object.name, object.shortName);
    const matchup = teams.join(" vs ");
    const name = title && title !== matchup ? `${matchup} (${title})` : matchup;
    const href = stringFrom(object.href) ?? stringFrom(object.url) ?? stringFrom(object.slug);
    const startTime = firstString(object.startTime, object.startDate);
    const series = firstString(object.seriesName, object.competitionName, object.league) ?? nameFromNestedObject(object.series);
    const venue = firstString(object.description, object.subtitle, object.groundName, object.venue) ?? nameFromNestedObject(object.ground);

    events.set(id, {
      id: `cricket:${id}`,
      sport: "cricket",
      name,
      source: SOURCE,
      sourceUrl: absoluteCricinfoUrl(href),
      status: statusFromText(statusText || undefined),
      startTime,
      competition: series,
      participants: teams,
      startList: teams.map((team) => ({ name: team, role: "Team" })),
      resultSummary: firstString(object.statusText, object.result, object.resultText),
      detail: venue,
      facts: [
        fact("Series", series),
        fact("Venue", venue),
        fact("Weather", firstString(object.weather, object.weatherSummary)),
      ].filter((item): item is { label: string; value: string } => Boolean(item)),
    });
  });

  return [...events.values()];
}

function extractTeams(object: Record<string, unknown>): string[] {
  const candidates = [object.teams, object.team, object.competitors].filter(Array.isArray);
  const teams = candidates.flatMap((candidate) => candidate.map(teamNameFromUnknown)).filter(isNonEmptyString);

  if (teams.length >= 2) {
    return unique(teams).slice(0, 2);
  }

  const home = firstString(object.homeTeamName, object.team1, object.team1Name);
  const away = firstString(object.awayTeamName, object.team2, object.team2Name);
  return [home, away].filter(isNonEmptyString);
}

function teamNameFromUnknown(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const object = value as Record<string, unknown>;
  return firstString(object.name, object.longName, object.shortName, object.teamName, object.abbreviation)
    ?? nameFromNestedObject(object.team);
}

function absoluteCricinfoUrl(path: string | undefined): string {
  if (!path) {
    return LIVE_SCORES_URL;
  }

  if (path.startsWith("http")) {
    return path;
  }

  return new URL(path.startsWith("/") ? path : `/${path}`, "https://www.espncricinfo.com").toString();
}

function statusFromText(value: string | undefined): SportsEvent["status"] {
  const text = value?.toLowerCase() ?? "";
  if (text.includes("live") || text.includes("running") || text.includes("stumps") || text.includes("tea") || text.includes("lunch")) {
    return "live";
  }

  if (text.includes("post") || text.includes("result") || text.includes("won") || text.includes("drawn") || text.includes("abandoned")) {
    return "final";
  }

  if (text.includes("pre") || text.includes("starts") || text.includes("fixture") || text.includes("preview") || text.includes("yet to begin")) {
    return "scheduled";
  }

  return "unknown";
}

function happensOnDate(isoTime: string | undefined, date: Date): boolean {
  if (!isoTime) {
    return true;
  }

  const eventDate = new Date(isoTime);
  return eventDate.getFullYear() === date.getFullYear()
    && eventDate.getMonth() === date.getMonth()
    && eventDate.getDate() === date.getDate();
}

function nameFromNestedObject(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const object = value as Record<string, unknown>;
  return firstString(object.name, object.longName, object.shortName, object.title);
}

function firstString(...values: unknown[]): string | undefined {
  return values.map(stringFrom).find(isNonEmptyString);
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : undefined;
}

function isNonEmptyString(value: string | undefined): value is string {
  return Boolean(value);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function fact(label: string, value: string | undefined): { label: string; value: string } | undefined {
  return value ? { label, value } : undefined;
}
