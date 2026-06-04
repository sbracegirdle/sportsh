import type { SportsEvent, SportsProvider } from "../domain/events.ts";

export type EventListOptions = {
  date?: Date;
  sports?: readonly string[];
  fresh?: boolean;
};

export async function listEvents(
  providers: readonly SportsProvider[],
  options: EventListOptions = {},
): Promise<SportsEvent[]> {
  const events = await collectFromProviders(providers, "listEvents", options);
  if (events.length > 0) {
    return events;
  }

  return listNextEvents(providers, options);
}

export async function listResults(
  providers: readonly SportsProvider[],
  options: EventListOptions = {},
): Promise<SportsEvent[]> {
  return collectFromProviders(providers, "listResults", options);
}

export async function getTodayEvents(
  providers: readonly SportsProvider[],
  options: EventListOptions = {},
): Promise<SportsEvent[]> {
  return listEvents(providers, { ...options, date: options.date ?? new Date() });
}

async function collectFromProviders(
  providers: readonly SportsProvider[],
  method: "listEvents" | "listResults",
  options: EventListOptions,
): Promise<SportsEvent[]> {
  const selectedSports = new Set(options.sports ?? providers.map((provider) => provider.sport));
  const date = options.date ?? new Date();
  const fresh = options.fresh ?? false;

  const settled = await Promise.allSettled(
    providers
      .filter((provider) => selectedSports.has(provider.sport))
      .map((provider) => provider[method]({ date, fresh })),
  );

  const events = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const failures = settled.filter((result) => result.status === "rejected");

  if (settled.length > 0 && failures.length === settled.length) {
    throw new AggregateError(
      failures.map((failure) => failure.reason),
      "All selected sports providers failed",
    );
  }

  return events
    .sort(compareEvents);
}

async function listNextEvents(
  providers: readonly SportsProvider[],
  options: EventListOptions,
): Promise<SportsEvent[]> {
  const selectedSports = new Set(options.sports ?? providers.map((provider) => provider.sport));
  const selectedProviders = providers.filter((provider) => selectedSports.has(provider.sport));
  const startDate = options.date ?? new Date();
  const fresh = options.fresh ?? false;
  const lookaheadDays = 370;
  const nextEvents: SportsEvent[] = [];

  for (const provider of selectedProviders) {
    if (provider.nextEvent) {
      nextEvents.push(...await provider.nextEvent({ date: startDate, fresh }));
      continue;
    }

    for (let offset = 1; offset <= lookaheadDays; offset += 1) {
      const date = addDays(startDate, offset);
      const events = await provider.listEvents({ date, fresh });
      if (events.length > 0) {
        nextEvents.push(...events.map((event) => ({
          ...event,
          detail: event.detail ? `Next scheduled: ${event.detail}` : "Next scheduled",
        })));
        break;
      }
    }
  }

  return nextEvents.sort(compareEvents);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function compareEvents(left: SportsEvent, right: SportsEvent): number {
  if (left.startTime && right.startTime) {
    return left.startTime.localeCompare(right.startTime);
  }

  if (left.startTime) {
    return -1;
  }

  if (right.startTime) {
    return 1;
  }

  return left.name.localeCompare(right.name);
}
