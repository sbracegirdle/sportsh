import type { SportsEvent, SportsProvider } from "../../domain/events.ts";
import { fetchCachedText } from "../shared/cache.ts";
import { decodeHtml, stripTags } from "../shared/html.ts";

const SOURCE = "Course du Jour";
const HOME_URL = "https://coursedujour.com/";

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
      const html = await fetchCachedText(urlForDate(context.date), {
        fresh: context.fresh,
        ttlMs: 15 * 60 * 1000,
      });

      return parseCourseDuJourToday(html, context.date)
        .filter((event) => event.status === "final");
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
