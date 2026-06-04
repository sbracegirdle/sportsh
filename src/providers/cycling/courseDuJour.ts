import type { SportsEvent, SportsProvider } from "../../domain/events.ts";
import { fetchCachedText } from "../shared/cache.ts";
import { decodeHtml, stripTags } from "../shared/html.ts";

const SOURCE = "Course du Jour";
const HOME_URL = "https://coursedujour.com/";
const RESULTS_SOURCE = "Domestique";
const RESULTS_BASE_URL = "https://www.domestiquecycling.com/en/cycling-results/";

export function createCourseDuJourProvider(): SportsProvider {
  return {
    sport: "cycling",
    async listEvents(context) {
      const html = await fetchCachedText(urlForDate(context.date), {
        fresh: context.fresh,
        ttlMs: 15 * 60 * 1000,
      });

      return parseCourseDuJourToday(html, context.date);
    },
    async listResults(context) {
      const resultsHtml = await fetchCachedText(resultsUrlForYear(context.date), {
        fresh: context.fresh,
        ttlMs: 15 * 60 * 1000,
      });

      const scheduleHtml = await fetchCachedText(urlForDate(context.date), {
        fresh: context.fresh,
        ttlMs: 15 * 60 * 1000,
      });

      const scheduleEvents = parseCourseDuJourToday(scheduleHtml, context.date);
      const stageResultPages = await Promise.all(
        scheduleEvents
          .map((event) => domestiqueStageUrl(event.name, context.date))
          .filter((url): url is string => Boolean(url))
          .map((url) => fetchCachedText(url, {
            fresh: context.fresh,
            ttlMs: 15 * 60 * 1000,
          }).catch(() => undefined)),
      );

      return uniqueEvents([
        ...parseDomestiqueResults(resultsHtml, context.date),
        ...stageResultPages.flatMap((html) => html ? parseDomestiqueResults(html, context.date) : []),
      ]);
    },
  };
}

export function parseCourseDuJourToday(html: string, now = new Date()): SportsEvent[] {
  const buildDate = html.match(/data-build-today="(?<date>\d{4}-\d{2}-\d{2})"/)?.groups?.date;
  const items = [...html.matchAll(/<li class="py-3[\s\S]*?<\/li>/g)];

  return items
    .map((match, index) => raceFromListItem(match[0], index, now, buildDate))
    .filter((event): event is SportsEvent => Boolean(event));
}

function raceFromListItem(itemHtml: string, index: number, now: Date, buildDate: string | undefined): SportsEvent | undefined {
  const raceName = attribute(itemHtml, "data-race-name")
    ?? stripTags(itemHtml.match(/<p class="text-base[^"]*">(?<name>[\s\S]*?)<\/p>/)?.groups?.name ?? "");

  if (!raceName) {
    return undefined;
  }

  const startTime = attribute(itemHtml, "data-utc-start");
  const endTime = attribute(itemHtml, "data-utc-end");
  const classification = stripTags(itemHtml.match(/<span class="font-medium uppercase tracking-wide"[^>]*>(?<classification>[\s\S]*?)<\/span>/)?.groups?.classification ?? "");
  const location = locationFromItem(itemHtml);
  const towns = townsFromLocation(location);
  const broadcast = firstBroadcast(itemHtml);
  const detail = [classification, location, broadcast].filter(Boolean).join(" · ");

  return {
    id: `cycling:${buildDate ?? "today"}:${index}:${raceName}`,
    sport: "cycling",
    name: raceName,
    source: SOURCE,
    sourceUrl: HOME_URL,
    status: statusFromTimes(startTime, endTime, now),
    startTime,
    competition: classification || undefined,
    detail: detail || undefined,
    facts: [
      fact("Course", classification),
      fact("Start town", towns.startTown),
      fact("End town", towns.endTown),
      fact("Weather", undefined),
      fact("Coverage", broadcast),
    ].filter((item): item is { label: string; value: string } => Boolean(item)),
  };
}

function statusFromTimes(startTime: string | undefined, endTime: string | undefined, now: Date): SportsEvent["status"] {
  const start = startTime ? new Date(startTime) : undefined;
  const end = endTime ? new Date(endTime) : undefined;

  if (start && end && now >= start && now <= end) {
    return "live";
  }

  if (end && now > end) {
    return "final";
  }

  if (start && now < start) {
    return "scheduled";
  }

  return "unknown";
}

function locationFromItem(itemHtml: string): string | undefined {
  const afterClassification = itemHtml.match(/<span class="font-medium uppercase tracking-wide"[^>]*>[\s\S]*?<\/span>(?<location>[\s\S]*?)(?:<span class="relative group\/racetime|<button\b)/)?.groups?.location;
  if (!afterClassification) {
    return undefined;
  }

  return stripTags(afterClassification)
    .replace(/·/g, "")
    .replace(/\s+/g, " ")
    .trim() || undefined;
}

function firstBroadcast(itemHtml: string): string | undefined {
  const label = itemHtml.match(/<span class="whitespace-nowrap">(?<label>[\s\S]*?)<\/span>/)?.groups?.label;
  const region = itemHtml.match(/<span class="text-xs font-normal text-zinc-600[^"]*">\((?<region>[^)]+)\)<\/span>/)?.groups?.region;
  const broadcaster = stripTags(label ?? "");

  if (!broadcaster) {
    return undefined;
  }

  return region ? `${broadcaster} (${decodeHtml(region)})` : broadcaster;
}

function attribute(html: string, name: string): string | undefined {
  const value = html.match(new RegExp(`${name}="(?<value>[^"]+)"`))?.groups?.value;
  return value ? decodeHtml(value).trim() : undefined;
}

function urlForDate(date: Date): string {
  const dateKey = date.toISOString().slice(0, 10);
  return isSameUtcDay(date, new Date()) ? HOME_URL : new URL(`/day/${dateKey}/`, HOME_URL).toString();
}

function isSameUtcDay(left: Date, right: Date): boolean {
  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

function townsFromLocation(location: string | undefined): { startTown?: string; endTown?: string } {
  if (!location) {
    return {};
  }

  const town = location.split(",")[0]?.trim();
  return town ? { startTown: town, endTown: town } : {};
}

function fact(label: string, value: string | undefined): { label: string; value: string } | undefined {
  return value ? { label, value } : undefined;
}

export function parseDomestiqueResults(html: string, date: Date): SportsEvent[] {
  const eventData = extractJsonVariables(html, "event_data")
    .find((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value));
  const stages = [
    ...extractJsonVariables(html, "matchcenter").flatMap((data) => isRecord(data) && Array.isArray(data.stages) ? data.stages : []),
    ...extractJsonVariables(html, "stages").flatMap((data) => Array.isArray(data) ? data.map((stage) => withRace(stage, eventData)) : []),
  ];
  const dateKey = date.toISOString().slice(0, 10);

  return stages
    .map((stage, index) => resultFromStage(stage, index))
    .filter((event): event is SportsEvent => Boolean(event))
    .filter((event) => event.startTime?.startsWith(dateKey));
}

function resultFromStage(stage: unknown, index: number): SportsEvent | undefined {
  if (!stage || typeof stage !== "object") {
    return undefined;
  }

  const object = stage as Record<string, unknown>;
  const winner = winnerFromStage(object);
  if (!winner) {
    return undefined;
  }

  const race = object.race && typeof object.race === "object" ? object.race as Record<string, unknown> : undefined;
  const raceTitle = stringFrom(race?.title);
  const stageTitle = stringFrom(object.title);
  const name = [raceTitle, stageTitle && stageTitle !== "Race" ? stageTitle : undefined].filter(Boolean).join(" ");
  const stageDate = Array.isArray(object.date) ? stringFrom(object.date[0]) : stringFrom(object.date);
  const location = Array.isArray(object.location) ? object.location.map(stringFrom).filter(Boolean) : [];
  const startTown = location.at(0);
  const endTown = location.at(1) ?? startTown;
  const courseType = stringFrom(object.type);
  const category = stringFrom(race?.category);
  const gender = race?.gender && typeof race.gender === "object" ? stringFrom((race.gender as Record<string, unknown>).full) : undefined;
  const sourceUrl = stringFrom(object.url) ?? RESULTS_BASE_URL;

  return {
    id: `cycling:result:${stageDate ?? "unknown"}:${index}:${name}`,
    sport: "cycling",
    name,
    source: RESULTS_SOURCE,
    sourceUrl,
    status: "final",
    startTime: stageDate,
    competition: [category, gender].filter(Boolean).join(" ") || undefined,
    startList: participantsFromRanking(object),
    resultSummary: `${winner} won`,
    detail: [courseType, startTown && endTown ? `${startTown} to ${endTown}` : undefined].filter(Boolean).join(" · ") || undefined,
    facts: [
      fact("Winner", winner),
      fact("Course", courseType),
      fact("Start town", startTown),
      fact("End town", endTown),
      fact("Category", category),
    ].filter((item): item is { label: string; value: string } => Boolean(item)),
  };
}

function winnerFromStage(stage: Record<string, unknown>): string | undefined {
  const ranking = Array.isArray(stage.riderRanking) ? stage.riderRanking : [];
  const winner = ranking.find((entry) => entry && typeof entry === "object" && (entry as Record<string, unknown>).ranking === 1);
  return winner && typeof winner === "object" ? stringFrom((winner as Record<string, unknown>).title) : undefined;
}

function participantsFromRanking(stage: Record<string, unknown>) {
  const ranking = Array.isArray(stage.riderRanking) ? stage.riderRanking : [];
  return ranking
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const rider = entry as Record<string, unknown>;
      const country = rider.country && typeof rider.country === "object" ? rider.country as Record<string, unknown> : undefined;
      const team = rider.team && typeof rider.team === "object" ? rider.team as Record<string, unknown> : undefined;
      const rank = stringFrom(rider.ranking);

      return removeUndefined({
        name: stringFrom(rider.title) ?? "Unknown rider",
        nationality: stringFrom(country?.short),
        team: stringFrom(team?.name) ?? stringFrom(team?.title),
        role: rank ? `#${rank}` : undefined,
      });
    });
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;
}

function extractJsonVariables(html: string, name: string): unknown[] {
  const marker = `var ${name} = `;
  const values: unknown[] = [];
  let searchFrom = 0;

  while (true) {
    const start = html.indexOf(marker, searchFrom);
    if (start === -1) {
      return values;
    }

    const jsonStart = start + marker.length;
    const jsonEnd = findJsonEnd(html, jsonStart);
    if (jsonEnd === undefined) {
      return values;
    }

    try {
      values.push(JSON.parse(html.slice(jsonStart, jsonEnd)));
    } catch {
      // Ignore unrelated or malformed variable blocks.
    }

    searchFrom = jsonEnd;
  }
}

function findJsonEnd(html: string, start: number): number | undefined {
  const opener = html[start];
  const closer = opener === "{" ? "}" : opener === "[" ? "]" : undefined;
  if (!closer) {
    return undefined;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < html.length; index += 1) {
    const char = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === opener) {
      depth += 1;
      continue;
    }

    if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }
  }

  return undefined;
}

function withRace(stage: unknown, race: Record<string, unknown> | undefined): unknown {
  if (!isRecord(stage) || stage.race || !race) {
    return stage;
  }

  return { ...stage, race };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : undefined;
}

function resultsUrlForYear(date: Date): string {
  return new URL(`${date.getUTCFullYear()}/`, RESULTS_BASE_URL).toString();
}

function domestiqueStageUrl(name: string, date: Date): string | undefined {
  const match = name.match(/^(?<race>.*?)\s+—\s+Stage\s+(?<stage>\d+)/);
  if (!match?.groups?.race || !match.groups.stage) {
    return undefined;
  }

  const raceSlug = slugifyRaceName(match.groups.race);
  if (!raceSlug) {
    return undefined;
  }

  return new URL(`/en/cycling-races/${raceSlug}/${date.getUTCFullYear()}/stage-${match.groups.stage}/`, "https://www.domestiquecycling.com").toString();
}

function slugifyRaceName(name: string): string {
  return decodeHtml(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueEvents(events: SportsEvent[]): SportsEvent[] {
  return [...new Map(events.map((event) => [event.sourceUrl, event])).values()]
    .sort((left, right) => (left.startTime ?? "").localeCompare(right.startTime ?? "") || left.name.localeCompare(right.name));
}
