export type Sport = "cricket" | "cycling" | "f1" | "rally" | "triathlon" | "marathon" | "afl";

export type EventStatus = "scheduled" | "live" | "final" | "unknown";

export type SportsEvent = {
  id: string;
  sport: Sport;
  name: string;
  source: string;
  sourceUrl: string;
  status: EventStatus;
  startTime?: string;
  competition?: string;
  participants?: string[];
  resultSummary?: string;
  detail?: string;
  facts?: EventFact[];
};

export type ProviderContext = {
  date: Date;
  fresh: boolean;
};

export type SportsProvider = {
  readonly sport: Sport;
  listEvents(context: ProviderContext): Promise<SportsEvent[]>;
  listResults(context: ProviderContext): Promise<SportsEvent[]>;
  nextEvent?(context: ProviderContext): Promise<SportsEvent[]>;
};

export type EventFact = {
  label: string;
  value: string;
};
