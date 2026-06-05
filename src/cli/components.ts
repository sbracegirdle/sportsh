import React from "react";
import { Box, Text } from "ink";
import type { EventParticipant, Sport, SportsEvent } from "../domain/events.ts";
import { formatEventTime } from "./format.ts";
import { nationalityFlag } from "./flags.ts";

const h = React.createElement;

export type Command = "events" | "today" | "results" | "startlist";

export const SPORTS: readonly Sport[] = [
  "cricket",
  "cycling",
  "f1",
  "rally",
  "triathlon",
  "marathon",
  "afl",
];

/** Fixed terminal height (in rows) of a CompactEventCard, used for viewport math. */
export const COMPACT_CARD_HEIGHT = 5;

export function participantsOf(event: SportsEvent): EventParticipant[] {
  return event.startList ?? event.participants?.map((name) => ({ name })) ?? [];
}

/**
 * Single, fixed-height card for the interactive (navigable) list. Lines are
 * truncated rather than wrapped so the height stays predictable — that is what
 * lets the viewport keep the selected card on screen.
 */
export function CompactEventCard({
  event,
  referenceDate,
  selected,
  width,
}: {
  event: SportsEvent;
  referenceDate: Date;
  selected: boolean;
  width: number;
}): React.ReactNode {
  const time = formatEventTime(event.startTime, referenceDate);
  const statusColor = event.status === "live" ? "green" : event.status === "final" ? "blue" : "gray";
  const accent = sportColor(event.sport);
  const secondary = event.resultSummary ?? event.detail ?? `via ${event.source}`;

  return h(
    Box,
    {
      borderStyle: "round",
      borderColor: selected ? "yellow" : accent,
      flexDirection: "column",
      paddingX: 1,
      paddingY: 0,
      marginBottom: 1,
      width,
    },
    h(
      Text,
      { wrap: "truncate" },
      h(Text, { color: "yellow", bold: true }, selected ? "› " : "  "),
      h(Text, { color: accent, bold: true }, event.sport.toUpperCase()),
      "  ",
      h(Text, { color: statusColor, bold: true }, statusLabel(event.status)),
      time ? "  " : "",
      time ? h(Text, { color: "yellow" }, time) : undefined,
      "  ",
      h(Text, { bold: true, inverse: selected }, event.name),
    ),
    h(Text, { wrap: "truncate", color: "gray" }, secondary),
  );
}

/** Identity header for the details page: sport, status, name and source. */
export function DetailHeader({
  event,
  width,
}: {
  event: SportsEvent;
  width: number;
}): React.ReactNode {
  const accent = sportColor(event.sport);
  const statusColor = event.status === "live" ? "green" : event.status === "final" ? "blue" : "gray";

  return h(
    Box,
    { borderStyle: "round", borderColor: accent, flexDirection: "column", paddingX: 1, width },
    h(
      Text,
      { wrap: "truncate" },
      h(Text, { color: accent, bold: true }, event.sport.toUpperCase()),
      "  ",
      h(Text, { color: statusColor, bold: true }, statusLabel(event.status)),
      "  ",
      h(Text, { bold: true }, event.name),
    ),
    h(
      Text,
      { wrap: "truncate" },
      h(Text, { color: "gray" }, "via "),
      h(Text, { color: "cyan" }, event.source),
      h(Text, { color: "gray" }, `  ${compactUrl(event.sourceUrl)}`),
    ),
  );
}

/** Small bold uppercase heading used to separate detail-page sections. */
export function SectionHeading({ label, note }: { label: string; note?: string }): React.ReactNode {
  return h(
    Text,
    undefined,
    h(Text, { bold: true, color: "gray" }, label.toUpperCase()),
    note ? h(Text, { color: "gray", dimColor: true }, `  ${note}`) : undefined,
  );
}

export function ParticipantRow({
  participant,
  position,
  width,
}: {
  participant: EventParticipant;
  position: number;
  width: number;
}): React.ReactNode {
  return h(
    Box,
    { width },
    h(
      Text,
      { wrap: "truncate" },
      h(Text, { color: "gray" }, `${String(position).padStart(3, " ")}. `),
      h(Text, { color: "white" }, participant.name),
      nationalityText(participant.nationality),
      participant.team ? h(Text, { color: "gray" }, ` · ${participant.team}`) : undefined,
      participant.role ? h(Text, { color: "gray" }, ` · ${participant.role}`) : undefined,
    ),
  );
}

/** Full, multi-line card used by the non-interactive (piped) output. */
export function EventCard({
  command,
  event,
  referenceDate,
  selectedSports,
}: {
  command: Command;
  event: SportsEvent;
  referenceDate: Date;
  selectedSports: readonly string[];
}): React.ReactNode {
  const time = formatEventTime(event.startTime, referenceDate);
  const statusColor = event.status === "live" ? "green" : event.status === "final" ? "blue" : "gray";
  const detail = event.resultSummary ?? event.detail;
  const facts = event.facts ?? [];
  const startList = participantsOf(event);
  const accent = sportColor(event.sport);

  return h(
    Box,
    {
      borderStyle: "round",
      borderColor: accent,
      flexDirection: "column",
      paddingX: 1,
      paddingY: 0,
      marginBottom: 1,
    },
    h(
      Text,
      undefined,
      h(Text, { color: accent, bold: true }, event.sport.toUpperCase()),
      "  ",
      h(Text, { color: statusColor, bold: true }, statusLabel(event.status)),
      "  ",
      time ? h(Text, { color: "yellow" }, `${time}  `) : undefined,
      h(Text, { bold: true }, event.name),
    ),
    h(
      Text,
      undefined,
      h(Text, { color: "gray" }, "via "),
      h(Text, { color: "cyan" }, event.source),
      h(Text, { color: "gray" }, `  ${compactUrl(event.sourceUrl)}`),
    ),
    detail ? h(Text, { color: event.status === "final" ? "green" : "white" }, detail) : undefined,
    facts.length > 0
      ? h(
        Text,
        undefined,
        facts.map((fact, index) => h(
          React.Fragment,
          { key: `${fact.label}:${index}` },
          index > 0 ? h(Text, { color: "gray" }, "  /  ") : undefined,
          h(Text, { color: "gray" }, `${fact.label}: `),
          h(Text, { color: "white" }, fact.value),
        )),
      )
      : undefined,
    command === "startlist"
      ? h(StartListPanel, { event, participants: startList })
      : startList.length > 0
        ? h(StartList, { participants: startList })
        : undefined,
    command !== "startlist" && (startList.length > 0 || event.startListUrl)
      ? h(StartListCommand, { event, referenceDate, selectedSports })
      : undefined,
    command !== "startlist" && event.startListUrl && startList.length === 0
      ? h(
        Text,
        undefined,
        h(Text, { color: "gray" }, "Start list: "),
        h(Text, { color: "cyan" }, compactUrl(event.startListUrl)),
      )
      : undefined,
  );
}

function StartList({
  participants,
  limit = 8,
}: {
  participants: readonly EventParticipant[];
  limit?: number;
}): React.ReactNode {
  const visible = participants.slice(0, limit);
  const hiddenCount = participants.length - visible.length;

  return h(
    Text,
    undefined,
    h(Text, { color: "gray" }, "Field: "),
    visible.map((participant, index) => h(
      React.Fragment,
      { key: `${participant.name}:${index}` },
      index > 0 ? h(Text, { color: "gray" }, "  /  ") : undefined,
      h(Text, { color: "white" }, participant.name),
      nationalityText(participant.nationality),
      participant.team ? h(Text, { color: "gray" }, ` · ${participant.team}`) : undefined,
      participant.role ? h(Text, { color: "gray" }, ` · ${participant.role}`) : undefined,
    )),
    hiddenCount > 0 ? h(Text, { color: "gray" }, `  /  +${hiddenCount} more`) : undefined,
  );
}

/** Renders a nationality as a flag emoji when resolvable, otherwise the raw text in parentheses. */
function nationalityText(nationality: string | undefined): React.ReactNode {
  if (!nationality) {
    return undefined;
  }
  const flag = nationalityFlag(nationality);
  return flag
    ? h(Text, undefined, ` ${flag}`)
    : h(Text, { color: "gray" }, ` (${nationality})`);
}

function StartListPanel({
  event,
  participants,
}: {
  event: SportsEvent;
  participants: readonly EventParticipant[];
}): React.ReactNode {
  if (participants.length === 0) {
    return h(
      Text,
      undefined,
      h(Text, { color: "yellow" }, "No parsed start list yet. "),
      event.startListUrl
        ? h(Text, { color: "cyan" }, compactUrl(event.startListUrl))
        : h(Text, { color: "gray" }, "No start-list source URL available."),
    );
  }

  return h(StartList, { participants, limit: participants.length });
}

function StartListCommand({
  event,
  referenceDate,
  selectedSports,
}: {
  event: SportsEvent;
  referenceDate: Date;
  selectedSports: readonly string[];
}): React.ReactNode {
  const sport = selectedSports[0] ?? event.sport;
  const command = `sportsh startlist --sport ${sport} --date ${referenceDate.toISOString().slice(0, 10)} --event ${quote(event.name)}`;

  return h(
    Text,
    undefined,
    h(Text, { color: "gray" }, "Open field: "),
    h(Text, { color: "cyan" }, command),
  );
}

export function sportColor(sport: SportsEvent["sport"]): string {
  return sport === "cricket" ? "cyan" : "magenta";
}

export function statusLabel(status: SportsEvent["status"]): string {
  return status === "scheduled" ? "UPCOMING" : status.toUpperCase();
}

export function sportLabel(sport: Sport): string {
  return sport === "f1" || sport === "afl" ? sport.toUpperCase() : `${sport[0].toUpperCase()}${sport.slice(1)}`;
}

export function compactUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "");
}

export function titleForCommand(command: Command): string {
  if (command === "results") {
    return "Results";
  }

  if (command === "startlist") {
    return "Start list";
  }

  return command === "today" ? "Today" : "Events";
}

export function emptyMessage(command: Command): string {
  if (command === "results") {
    return "No results found.";
  }

  if (command === "startlist") {
    return "No matching event found.";
  }

  return "No events found.";
}

function quote(value: string): string {
  return JSON.stringify(value);
}
