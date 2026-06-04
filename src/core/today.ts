import type { SportsEvent, SportsProvider } from "../domain/events.ts";

export type TodayOptions = {
  date?: Date;
  sports?: readonly string[];
  fresh?: boolean;
};

export async function getTodayEvents(
  providers: readonly SportsProvider[],
  options: TodayOptions = {},
): Promise<SportsEvent[]> {
  const selectedSports = new Set(options.sports ?? providers.map((provider) => provider.sport));
  const date = options.date ?? new Date();
  const fresh = options.fresh ?? false;

  const settled = await Promise.allSettled(
    providers
      .filter((provider) => selectedSports.has(provider.sport))
      .map((provider) => provider.today({ date, fresh })),
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
