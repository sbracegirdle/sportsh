import React from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import type { EventParticipant, Sport, SportsEvent } from "../domain/events.ts";
import { dayTag, formatHeadingDate, formatScheduleWhen } from "./format.ts";
import {
  COMPACT_CARD_HEIGHT,
  type Command,
  CompactEventCard,
  DetailHeader,
  ParticipantRow,
  SPORTS,
  SectionHeading,
  compactUrl,
  emptyMessage,
  participantsOf,
  sportLabel,
  titleForCommand,
} from "./components.ts";

const h = React.createElement;
const { useState, useEffect, useRef, useCallback } = React;

/** Loads events for a command, optionally narrowing sports, on a given date. */
export type LoadFn = (command: Command, sports: readonly string[] | undefined, date: Date) => Promise<SportsEvent[]>;

type MenuScreen = { kind: "menu"; cursor: number };
type SportsScreen = { kind: "sports"; cursor: number };
type ListScreen = {
  kind: "list";
  command: Command;
  sports?: readonly string[];
  date: Date;
  cursor: number;
  query: string;
  inputMode: boolean;
};
type DetailScreen = {
  kind: "detail";
  event: SportsEvent;
  date: Date;
  offset: number;
  query: string;
  inputMode: boolean;
};
type Screen = MenuScreen | SportsScreen | ListScreen | DetailScreen;

type ListData =
  | { status: "loading" }
  | { status: "ready"; events: readonly SportsEvent[] }
  | { status: "error"; error: string };

export type InteractiveAppProps = {
  initialHistory: readonly Screen[];
  load: LoadFn;
  defaultSports: readonly string[];
};

type MenuItem = { label: string; hint: string; activate: () => void };

// Rows consumed by chrome (header, status, indicators, footer) outside the scrollable area.
const LIST_CHROME_ROWS = 9;

export function InteractiveApp(props: InteractiveAppProps): React.ReactNode {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [history, setHistory] = useState<readonly Screen[]>(props.initialHistory);
  const [dataByKey, setDataByKey] = useState<Record<string, ListData>>({});
  const startedRef = useRef<Set<string>>(new Set());
  const [size, setSize] = useState({ rows: stdout?.rows ?? 24, cols: stdout?.columns ?? 80 });

  useEffect(() => {
    if (!stdout) {
      return;
    }
    const onResize = () => setSize({ rows: stdout.rows ?? 24, cols: stdout.columns ?? 80 });
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  const top = history[history.length - 1];
  const listKey = top.kind === "list" ? listKeyFor(top.command, top.sports, top.date) : null;

  // Fetch a list's events the first time we land on it; cache by command+sports+date.
  useEffect(() => {
    if (top.kind !== "list" || listKey === null || startedRef.current.has(listKey)) {
      return;
    }
    startedRef.current.add(listKey);
    const { command, sports, date } = top;

    let cancelled = false;
    setDataByKey((prev) => ({ ...prev, [listKey]: { status: "loading" } }));
    props.load(command, sports, date)
      .then((events) => {
        if (!cancelled) {
          setDataByKey((prev) => ({ ...prev, [listKey]: { status: "ready", events } }));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDataByKey((prev) => ({ ...prev, [listKey]: { status: "error", error: messageOf(error) } }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [listKey]);

  const push = useCallback((screen: Screen) => {
    setHistory((prev) => [...prev, screen]);
  }, []);

  const back = useCallback(() => {
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const updateTop = useCallback(<T extends Screen>(fn: (current: T) => Partial<T>) => {
    setHistory((prev) => {
      const current = prev[prev.length - 1] as T;
      return [...prev.slice(0, -1), { ...current, ...fn(current) }];
    });
  }, []);

  const moveMenuCursor = useCallback((delta: number, length: number) => {
    updateTop<MenuScreen | SportsScreen>((current) => ({ cursor: (current.cursor + delta + length) % length }));
  }, [updateTop]);

  const menuItems: MenuItem[] = [
    {
      label: "Today's schedule",
      hint: "Live and upcoming events",
      activate: () => push(makeListScreen("today", optionalSports(props.defaultSports), today())),
    },
    {
      label: "Today's results",
      hint: "Finished events and scores",
      activate: () => push(makeListScreen("results", optionalSports(props.defaultSports), today())),
    },
    {
      label: "Filter by sport",
      hint: "Pick one sport to follow",
      activate: () => push({ kind: "sports", cursor: 0 }),
    },
    {
      label: "Quit",
      hint: "Exit sportsh",
      activate: () => exit(),
    },
  ];

  const sportItems: { label: string; sports?: readonly string[] }[] = [
    { label: "All sports", sports: undefined },
    ...SPORTS.map((sport: Sport) => ({ label: sportLabel(sport), sports: [sport] as readonly string[] })),
  ];

  const listData = listKey === null ? null : dataByKey[listKey];
  const allEvents = listData?.status === "ready" ? listData.events : [];
  const filteredEvents = top.kind === "list" ? allEvents.filter((event) => eventMatches(event, top.query)) : [];
  const listCursor = top.kind === "list" ? Math.min(top.cursor, Math.max(0, filteredEvents.length - 1)) : 0;

  const detailParticipants = top.kind === "detail"
    ? participantsOf(top.event).filter((participant) => participantMatches(participant, top.query))
    : [];
  const detailSchedule = top.kind === "detail" ? scheduleEntries(top.event, top.date) : [];
  const detailInfo = top.kind === "detail" ? infoLines(top.event) : [];
  const detailFieldVisible = top.kind === "detail"
    ? fieldRows(size.rows, detailSchedule.length, detailInfo.length, Boolean(top.inputMode || top.query))
    : 0;
  const detailMaxOffset = Math.max(0, detailParticipants.length - detailFieldVisible);

  useInput((input, key) => {
    const current = top;
    const inInput = (current.kind === "list" || current.kind === "detail") && current.inputMode;

    if (!inInput && input === "q") {
      exit();
      return;
    }

    if (current.kind === "menu") {
      if (key.upArrow || input === "k") {
        moveMenuCursor(-1, menuItems.length);
      } else if (key.downArrow || input === "j") {
        moveMenuCursor(1, menuItems.length);
      } else if (key.return) {
        menuItems[current.cursor]?.activate();
      }
      return;
    }

    if (current.kind === "sports") {
      if (key.escape || input === "b") {
        back();
      } else if (key.upArrow || input === "k") {
        moveMenuCursor(-1, sportItems.length);
      } else if (key.downArrow || input === "j") {
        moveMenuCursor(1, sportItems.length);
      } else if (key.return) {
        const choice = sportItems[current.cursor];
        if (choice) {
          push(makeListScreen("today", choice.sports, today()));
        }
      }
      return;
    }

    if (current.kind === "list") {
      if (current.inputMode) {
        if (key.escape) {
          updateTop<ListScreen>(() => ({ inputMode: false, query: "", cursor: 0 }));
        } else if (key.return) {
          updateTop<ListScreen>(() => ({ inputMode: false }));
        } else if (key.backspace || key.delete) {
          updateTop<ListScreen>((c) => ({ query: c.query.slice(0, -1), cursor: 0 }));
        } else if (key.upArrow) {
          moveListCursor(-1);
        } else if (key.downArrow) {
          moveListCursor(1);
        } else if (input && !key.ctrl && !key.meta) {
          updateTop<ListScreen>((c) => ({ query: c.query + input, cursor: 0 }));
        }
        return;
      }

      if (key.escape) {
        if (current.query) {
          updateTop<ListScreen>(() => ({ query: "", cursor: 0 }));
        } else {
          back();
        }
      } else if (input === "b") {
        back();
      } else if (input === "/") {
        updateTop<ListScreen>(() => ({ inputMode: true }));
      } else if (key.leftArrow) {
        updateTop<ListScreen>((c) => ({ date: addDays(c.date, -1), cursor: 0 }));
      } else if (key.rightArrow) {
        updateTop<ListScreen>((c) => ({ date: addDays(c.date, 1), cursor: 0 }));
      } else if (key.upArrow || input === "k") {
        moveListCursor(-1);
      } else if (key.downArrow || input === "j") {
        moveListCursor(1);
      } else if (key.return) {
        const event = filteredEvents[listCursor];
        if (event) {
          push({ kind: "detail", event, date: current.date, offset: 0, query: "", inputMode: false });
        }
      }
      return;
    }

    // detail
    if (current.inputMode) {
      if (key.escape) {
        updateTop<DetailScreen>(() => ({ inputMode: false, query: "", offset: 0 }));
      } else if (key.return) {
        updateTop<DetailScreen>(() => ({ inputMode: false }));
      } else if (key.backspace || key.delete) {
        updateTop<DetailScreen>((c) => ({ query: c.query.slice(0, -1), offset: 0 }));
      } else if (input && !key.ctrl && !key.meta) {
        updateTop<DetailScreen>((c) => ({ query: c.query + input, offset: 0 }));
      }
      return;
    }

    if (key.escape) {
      if (current.query) {
        updateTop<DetailScreen>(() => ({ query: "", offset: 0 }));
      } else {
        back();
      }
    } else if (input === "b") {
      back();
    } else if (input === "/") {
      updateTop<DetailScreen>(() => ({ inputMode: true }));
    } else if (key.upArrow || input === "k") {
      updateTop<DetailScreen>((c) => ({ offset: Math.max(0, c.offset - 1) }));
    } else if (key.downArrow || input === "j") {
      updateTop<DetailScreen>((c) => ({ offset: Math.min(detailMaxOffset, c.offset + 1) }));
    }

    function moveListCursor(delta: number) {
      const length = filteredEvents.length;
      updateTop<ListScreen>((c) => ({ cursor: length === 0 ? 0 : Math.min(length - 1, Math.max(0, c.cursor + delta)) }));
    }
  });

  return h(
    Box,
    { flexDirection: "column" },
    renderScreen({
      top,
      menuItems,
      sportItems,
      listData,
      filteredEvents,
      listCursor,
      totalEvents: allEvents.length,
      detailParticipants,
      detailSchedule,
      detailInfo,
      detailFieldVisible,
      size,
    }),
    h(Footer, { screen: top }),
  );
}

function renderScreen({
  top,
  menuItems,
  sportItems,
  listData,
  filteredEvents,
  listCursor,
  totalEvents,
  detailParticipants,
  detailSchedule,
  detailInfo,
  detailFieldVisible,
  size,
}: {
  top: Screen;
  menuItems: MenuItem[];
  sportItems: { label: string; sports?: readonly string[] }[];
  listData: ListData | null;
  filteredEvents: readonly SportsEvent[];
  listCursor: number;
  totalEvents: number;
  detailParticipants: readonly EventParticipant[];
  detailSchedule: ScheduleEntry[];
  detailInfo: string[];
  detailFieldVisible: number;
  size: { rows: number; cols: number };
}): React.ReactNode {
  if (top.kind === "menu") {
    return renderMenu("sportsh", menuItems.map((item) => ({ label: item.label, hint: item.hint })), top.cursor);
  }

  if (top.kind === "sports") {
    return renderMenu("Filter by sport", sportItems.map((item) => ({ label: item.label })), top.cursor);
  }

  if (top.kind === "detail") {
    return renderDetail(top, detailParticipants, detailSchedule, detailInfo, detailFieldVisible, size);
  }

  return renderList(top, listData, filteredEvents, listCursor, totalEvents, size);
}

function renderMenu(
  title: string,
  items: { label: string; hint?: string }[],
  cursor: number,
): React.ReactNode {
  return h(
    Box,
    { flexDirection: "column", gap: 1, paddingX: 1 },
    h(
      Box,
      { borderStyle: "round", borderColor: "gray", paddingX: 1 },
      h(Text, { bold: true }, title),
    ),
    h(
      Box,
      { flexDirection: "column" },
      ...items.map((item, index) => h(
        Text,
        { key: item.label },
        h(Text, { color: "yellow", bold: true }, index === cursor ? "› " : "  "),
        h(Text, { bold: true, inverse: index === cursor }, item.label),
        item.hint ? h(Text, { color: "gray" }, `  — ${item.hint}`) : undefined,
      )),
    ),
  );
}

function renderList(
  screen: ListScreen,
  listData: ListData | null,
  filteredEvents: readonly SportsEvent[],
  cursor: number,
  totalEvents: number,
  size: { rows: number; cols: number },
): React.ReactNode {
  const titleParts = [
    titleForCommand(screen.command),
    formatHeadingDate(screen.date),
    filteredEvents.length > 0 ? `${cursor + 1}/${filteredEvents.length}` : undefined,
    screen.query && filteredEvents.length !== totalEvents ? `of ${totalEvents}` : undefined,
  ].filter(Boolean);

  const header = h(
    Box,
    { borderStyle: "round", borderColor: "gray", paddingX: 1 },
    h(Text, { bold: true }, titleParts.join("  /  ")),
  );

  const filterLine = (screen.inputMode || screen.query)
    ? h(
      Text,
      undefined,
      h(Text, { color: "gray" }, "filter: "),
      h(Text, { color: "yellow" }, screen.query),
      screen.inputMode ? h(Text, { color: "yellow" }, "▌") : undefined,
    )
    : undefined;

  let body: React.ReactNode;
  if (!listData || listData.status === "loading") {
    body = h(Text, { color: "gray" }, "Loading…");
  } else if (listData.status === "error") {
    body = h(Text, { color: "red" }, listData.error);
  } else if (filteredEvents.length === 0) {
    body = h(Text, { color: "yellow" }, screen.query ? "No events match the filter." : emptyMessage(screen.command));
  } else {
    const maxCards = Math.max(1, Math.floor((size.rows - LIST_CHROME_ROWS) / COMPACT_CARD_HEIGHT));
    const { start, end } = window(filteredEvents.length, cursor, maxCards);
    const width = Math.max(20, size.cols - 2);
    body = h(
      Box,
      { flexDirection: "column" },
      start > 0 ? h(Text, { color: "gray", dimColor: true }, `  ↑ ${start} more`) : undefined,
      ...filteredEvents.slice(start, end).map((event, index) => h(CompactEventCard, {
        event,
        key: event.id,
        referenceDate: screen.date,
        selected: start + index === cursor,
        width,
      })),
      end < filteredEvents.length ? h(Text, { color: "gray", dimColor: true }, `  ↓ ${filteredEvents.length - end} more`) : undefined,
    );
  }

  return h(
    Box,
    { flexDirection: "column", paddingX: 1 },
    header,
    filterLine,
    body,
  );
}

function renderDetail(
  screen: DetailScreen,
  participants: readonly EventParticipant[],
  schedule: ScheduleEntry[],
  info: string[],
  fieldVisible: number,
  size: { rows: number; cols: number },
): React.ReactNode {
  const width = Math.max(20, size.cols - 2);
  const all = participantsOf(screen.event);
  const total = all.length;
  const nameWidth = Math.min(20, schedule.reduce((max, entry) => Math.max(max, entry.name.length), 0));

  const scheduleSection = h(
    Box,
    { flexDirection: "column" },
    h(SectionHeading, { label: "Schedule" }),
    schedule.length === 0
      ? h(Text, { color: "gray" }, "  To be confirmed")
      : schedule.map((entry, index) => h(
        Box,
        { key: `${entry.name}:${index}`, width },
        h(
          Text,
          { wrap: "truncate" },
          h(Text, { color: "white" }, `  ${entry.name.padEnd(nameWidth, " ")}  `),
          h(Text, { color: "yellow" }, entry.when),
          entry.tag === "live" ? h(Text, { color: "green", bold: true }, "  ● LIVE") : undefined,
          entry.tag === "today" ? h(Text, { color: "yellow", bold: true }, "  ◆ today") : undefined,
          entry.tag === "done" ? h(Text, { color: "gray", dimColor: true }, "  ✓ done") : undefined,
          entry.detail ? h(Text, { color: "gray" }, `  ${entry.detail}`) : undefined,
        ),
      )),
  );

  const infoSection = info.length > 0
    ? h(
      Box,
      { flexDirection: "column" },
      h(SectionHeading, { label: "Info" }),
      ...info.map((line, index) => h(
        Box,
        { key: `info:${index}`, width },
        h(Text, { wrap: "truncate", color: "white" }, `  ${line}`),
      )),
    )
    : undefined;

  const filterLine = (screen.inputMode || screen.query)
    ? h(
      Text,
      undefined,
      h(Text, { color: "gray" }, "  filter: "),
      h(Text, { color: "yellow" }, screen.query),
      screen.inputMode ? h(Text, { color: "yellow" }, "▌") : undefined,
    )
    : undefined;

  let fieldBody: React.ReactNode;
  if (total === 0) {
    fieldBody = h(
      Text,
      undefined,
      h(Text, { color: "gray" }, "  No parsed start list yet. "),
      screen.event.startListUrl
        ? h(Text, { color: "cyan" }, compactUrl(screen.event.startListUrl))
        : h(Text, { color: "gray" }, "No start-list source URL available."),
    );
  } else if (participants.length === 0) {
    fieldBody = h(Text, { color: "yellow" }, "  No entrants match the filter.");
  } else {
    const offset = Math.min(screen.offset, Math.max(0, participants.length - fieldVisible));
    fieldBody = h(
      Box,
      { flexDirection: "column" },
      offset > 0 ? h(Text, { color: "gray", dimColor: true }, `  ↑ ${offset} more`) : undefined,
      ...participants.slice(offset, offset + fieldVisible).map((participant) => h(ParticipantRow, {
        key: `${participant.name}:${all.indexOf(participant)}`,
        participant,
        position: all.indexOf(participant) + 1,
        width,
      })),
      offset + fieldVisible < participants.length
        ? h(Text, { color: "gray", dimColor: true }, `  ↓ ${participants.length - offset - fieldVisible} more`)
        : undefined,
    );
  }

  const fieldNote = total === 0
    ? undefined
    : screen.query
      ? `${participants.length} of ${total}`
      : `${total}`;

  const fieldSection = h(
    Box,
    { flexDirection: "column" },
    h(SectionHeading, { label: "Field", note: fieldNote }),
    filterLine,
    fieldBody,
  );

  return h(
    Box,
    { flexDirection: "column", gap: 1, paddingX: 1 },
    h(DetailHeader, { event: screen.event, width }),
    scheduleSection,
    infoSection,
    fieldSection,
  );
}

type ScheduleEntry = { name: string; when: string; tag: "live" | "today" | "done" | ""; detail?: string };

function scheduleEntries(event: SportsEvent, referenceDate: Date): ScheduleEntry[] {
  if (event.sessions && event.sessions.length > 0) {
    return event.sessions.map((session) => ({
      name: session.name,
      when: formatScheduleWhen(session.startTime, referenceDate),
      tag: session.status ? statusTag(session.status) : dayTag(session.startTime, referenceDate),
      detail: session.detail,
    }));
  }

  const facts = event.facts ?? [];
  const startFact = facts.find((fact) => fact.label.toLowerCase() === "start");
  const endFact = facts.find((fact) => fact.label.toLowerCase() === "end");
  const entries: ScheduleEntry[] = [];

  const startValue = event.startTime ?? startFact?.value;
  if (startValue) {
    // For a whole-event entry the event's own status is more reliable than a date comparison.
    entries.push({ name: "Start", when: formatScheduleWhen(startValue, referenceDate), tag: statusTag(event.status) || dayTag(startValue, referenceDate) });
  }
  if (endFact && endFact.value !== startValue) {
    entries.push({ name: "End", when: formatScheduleWhen(endFact.value, referenceDate), tag: dayTag(endFact.value, referenceDate) });
  }

  return entries;
}

function statusTag(status: SportsEvent["status"]): "live" | "done" | "" {
  return status === "live" ? "live" : status === "final" ? "done" : "";
}

function infoLines(event: SportsEvent): string[] {
  const lines: string[] = [];
  const summary = event.resultSummary ?? event.detail;
  if (summary) {
    lines.push(summary);
  }
  if (event.competition) {
    lines.push(`Competition: ${event.competition}`);
  }
  for (const fact of event.facts ?? []) {
    const label = fact.label.toLowerCase();
    if (label === "start" || label === "end") {
      continue; // Shown in the schedule section.
    }
    lines.push(`${fact.label}: ${fact.value}`);
  }
  if (event.startListUrl) {
    lines.push(`Start list: ${compactUrl(event.startListUrl)}`);
  }
  return lines;
}

/** Rows available for the scrollable field once the other detail sections are laid out. */
function fieldRows(rows: number, scheduleCount: number, infoCount: number, hasFilter: boolean): number {
  const headerRows = 4; // border (2) + identity + source
  const scheduleRows = 1 + Math.max(1, scheduleCount); // heading + entries
  const infoRows = infoCount > 0 ? 1 + infoCount : 0; // heading + lines
  const fieldChrome = 1 + (hasFilter ? 1 : 0) + 2; // heading + filter + scroll indicators
  const footerRows = 1;
  const gaps = 4; // gap:1 between the stacked sections
  const used = headerRows + scheduleRows + infoRows + fieldChrome + footerRows + gaps;
  return Math.max(3, rows - used);
}

function Footer({ screen }: { screen: Screen }): React.ReactNode {
  let hint: string;
  if ((screen.kind === "list" || screen.kind === "detail") && screen.inputMode) {
    hint = "type to filter · ↵ apply · esc clear";
  } else if (screen.kind === "menu") {
    hint = "↑/↓ move · ↵ select · q quit";
  } else if (screen.kind === "sports") {
    hint = "↑/↓ move · ↵ select · b back · q quit";
  } else if (screen.kind === "list") {
    hint = "↑/↓ move · ←/→ day · / filter · ↵ open · b back · q quit";
  } else {
    hint = "↑/↓ scroll · / filter · b back · q quit";
  }

  return h(
    Box,
    { paddingX: 1 },
    h(Text, { color: "gray", dimColor: true }, hint),
  );
}

function makeListScreen(command: Command, sports: readonly string[] | undefined, date: Date): ListScreen {
  return { kind: "list", command, sports, date, cursor: 0, query: "", inputMode: false };
}

/** Centered fixed-size scroll window that always contains `cursor`. */
function window(length: number, cursor: number, maxCards: number): { start: number; end: number } {
  if (length <= maxCards) {
    return { start: 0, end: length };
  }
  const half = Math.floor(maxCards / 2);
  const start = Math.min(Math.max(0, cursor - half), length - maxCards);
  return { start, end: start + maxCards };
}

function eventMatches(event: SportsEvent, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return [
    event.name,
    event.sport,
    event.status,
    event.source,
    event.competition,
    event.detail,
    event.resultSummary,
  ].some((value) => value?.toLowerCase().includes(q));
}

function participantMatches(participant: EventParticipant, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return [participant.name, participant.team, participant.nationality, participant.role]
    .some((value) => value?.toLowerCase().includes(q));
}

function listKeyFor(command: Command, sports: readonly string[] | undefined, date: Date): string {
  const sportsKey = sports && sports.length > 0 ? [...sports].join(",") : "all";
  return `${command}|${sportsKey}|${date.toISOString().slice(0, 10)}`;
}

function optionalSports(sports: readonly string[]): readonly string[] | undefined {
  return sports.length > 0 ? sports : undefined;
}

function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function messageOf(error: unknown): string {
  if (error instanceof AggregateError) {
    const causes = error.errors.map((cause) => (cause instanceof Error ? cause.message : String(cause)));
    return [error.message, ...causes.map((cause) => `- ${cause}`)].join("\n");
  }

  return error instanceof Error ? error.message : String(error);
}
