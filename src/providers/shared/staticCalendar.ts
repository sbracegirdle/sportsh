import type { Sport, SportsEvent, SportsProvider } from "../../domain/events.ts";
import { fetchCachedText } from "./cache.ts";

export type StaticCalendarEvent = {
  name: string;
  startDate: string;
  endDate?: string;
  competition?: string;
  detail?: string;
  facts?: Array<{ label: string; value: string }>;
};

export type StaticCalendarOptions = {
  sport: Sport;
  source: string;
  sourceUrl: string;
  ttlMs?: number;
  events: readonly StaticCalendarEvent[];
};

export function createStaticCalendarProvider(options: StaticCalendarOptions): SportsProvider {
  return {
    sport: options.sport,
    async listEvents(context) {
      await fetchCachedText(options.sourceUrl, {
        fresh: context.fresh,
        ttlMs: options.ttlMs ?? 24 * 60 * 60 * 1000,
      });

      return options.events
        .filter((event) => happensOnDate(event, context.date))
        .map((event) => toSportsEvent(options, event, options.events.indexOf(event), context.date));
    },
    async listResults() {
      return [];
    },
    async nextEvent(context) {
      await fetchCachedText(options.sourceUrl, {
        fresh: context.fresh,
        ttlMs: options.ttlMs ?? 24 * 60 * 60 * 1000,
      });

      const dateKey = context.date.toISOString().slice(0, 10);
      const next = options.events.find((event) => (event.endDate ?? event.startDate) >= dateKey);
      if (!next) {
        return [];
      }

      return [toSportsEvent(options, next, options.events.indexOf(next), new Date(`${next.startDate}T00:00:00.000Z`), "Next scheduled")];
    },
  };
}

function toSportsEvent(
  options: StaticCalendarOptions,
  event: StaticCalendarEvent,
  index: number,
  date: Date,
  detailPrefix?: string,
): SportsEvent {
  const detail = [detailPrefix, event.detail].filter(Boolean).join(": ");

  return {
    id: `${options.sport}:${event.startDate}:${index}:${event.name}`,
    sport: options.sport,
    name: event.name,
    source: options.source,
    sourceUrl: options.sourceUrl,
    status: eventEndsBefore(event, date) ? "final" : "scheduled",
    startTime: event.startDate,
    competition: event.competition,
    detail: detail || undefined,
    facts: [
      fact("Start", event.startDate),
      event.endDate && event.endDate !== event.startDate ? fact("End", event.endDate) : undefined,
      ...(event.facts ?? []),
    ].filter((item): item is { label: string; value: string } => Boolean(item)),
  };
}

function happensOnDate(event: StaticCalendarEvent, date: Date): boolean {
  const dateKey = date.toISOString().slice(0, 10);
  return event.startDate <= dateKey && (event.endDate ?? event.startDate) >= dateKey;
}

function eventEndsBefore(event: StaticCalendarEvent, date: Date): boolean {
  return (event.endDate ?? event.startDate) < date.toISOString().slice(0, 10);
}

function fact(label: string, value: string): { label: string; value: string } {
  return { label, value };
}
