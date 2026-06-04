export type Sport = "cricket" | "cycling";

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
};

export type ProviderContext = {
  date: Date;
  fresh: boolean;
};

export type SportsProvider = {
  readonly sport: Sport;
  today(context: ProviderContext): Promise<SportsEvent[]>;
};
