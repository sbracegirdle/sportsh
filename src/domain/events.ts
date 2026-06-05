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
  startList?: EventParticipant[];
  startListUrl?: string;
  resultSummary?: string;
  detail?: string;
  facts?: EventFact[];
  /** Ordered schedule for the event. Session-based sports (cricket, F1) list each session. */
  sessions?: EventSession[];
};

export type EventSession = {
  name: string;
  /** ISO datetime, or a date-only `YYYY-MM-DD` when only the day is known. */
  startTime?: string;
  status?: EventStatus;
  detail?: string;
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

export type EventParticipant = {
  name: string;
  nationality?: string;
  team?: string;
  role?: string;
};
