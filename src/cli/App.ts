import React from "react";
import { Box, Text } from "ink";
import type { SportsEvent } from "../domain/events.ts";
import { formatEventTime, formatHeadingDate } from "./format.ts";

export type AppProps = {
  command: "events" | "today" | "results" | "startlist";
  date: Date;
  eventFilter?: string;
  events: readonly SportsEvent[];
  selectedSports: readonly string[];
};

export function App(props: AppProps): React.ReactNode {
  const titleParts = [
    titleForCommand(props.command),
    props.command === "today" ? undefined : formatHeadingDate(props.date),
    props.selectedSports.length > 0 ? props.selectedSports.join(", ") : undefined,
    props.eventFilter,
  ].filter(Boolean);

  return React.createElement(
    Box,
    { flexDirection: "column", gap: 1, paddingX: 1 },
    React.createElement(
      Box,
      { borderStyle: "round", borderColor: "gray", paddingX: 1 },
      React.createElement(Text, { bold: true }, titleParts.join("  /  ")),
    ),
    props.events.length === 0
      ? React.createElement(Text, { color: "yellow" }, emptyMessage(props.command))
      : props.events.map((event) => React.createElement(EventRow, {
        command: props.command,
        event,
        key: event.id,
        referenceDate: props.date,
        selectedSports: props.selectedSports,
      })),
  );
}

function EventRow({
  command,
  event,
  referenceDate,
  selectedSports,
}: {
  command: AppProps["command"];
  event: SportsEvent;
  referenceDate: Date;
  selectedSports: readonly string[];
}): React.ReactNode {
  const time = formatEventTime(event.startTime, referenceDate);
  const statusColor = event.status === "live" ? "green" : event.status === "final" ? "blue" : "gray";
  const detail = event.resultSummary ?? event.detail;
  const facts = event.facts ?? [];
  const startList = event.startList ?? event.participants?.map((name) => ({ name })) ?? [];
  const accent = sportColor(event.sport);

  return React.createElement(
    Box,
    {
      borderStyle: "round",
      borderColor: accent,
      flexDirection: "column",
      paddingX: 1,
      paddingY: 0,
      marginBottom: 1,
    },
    React.createElement(
      Text,
      undefined,
      React.createElement(Text, { color: accent, bold: true }, event.sport.toUpperCase()),
      "  ",
      React.createElement(Text, { color: statusColor, bold: true }, statusLabel(event.status)),
      "  ",
      time ? React.createElement(Text, { color: "yellow" }, `${time}  `) : undefined,
      React.createElement(Text, { bold: true }, event.name),
    ),
    React.createElement(
      Text,
      undefined,
      React.createElement(Text, { color: "gray" }, "via "),
      React.createElement(Text, { color: "cyan" }, event.source),
      React.createElement(Text, { color: "gray" }, `  ${compactUrl(event.sourceUrl)}`),
    ),
    detail ? React.createElement(Text, { color: event.status === "final" ? "green" : "white" }, detail) : undefined,
    facts.length > 0
      ? React.createElement(
        Text,
        undefined,
        facts.map((fact, index) => React.createElement(
          React.Fragment,
          { key: `${fact.label}:${index}` },
          index > 0 ? React.createElement(Text, { color: "gray" }, "  /  ") : undefined,
          React.createElement(Text, { color: "gray" }, `${fact.label}: `),
          React.createElement(Text, { color: "white" }, fact.value),
        )),
      )
      : undefined,
    command === "startlist"
      ? React.createElement(StartListPanel, { event, participants: startList })
      : startList.length > 0
        ? React.createElement(StartList, { participants: startList })
        : undefined,
    command !== "startlist" && (startList.length > 0 || event.startListUrl)
      ? React.createElement(StartListCommand, { event, referenceDate, selectedSports })
      : undefined,
    command !== "startlist" && event.startListUrl && startList.length === 0
      ? React.createElement(
        Text,
        undefined,
        React.createElement(Text, { color: "gray" }, "Start list: "),
        React.createElement(Text, { color: "cyan" }, compactUrl(event.startListUrl)),
      )
      : undefined,
  );
}

function StartListPanel({ event, participants }: { event: SportsEvent; participants: NonNullable<SportsEvent["startList"]> }): React.ReactNode {
  if (participants.length === 0) {
    return React.createElement(
      Text,
      undefined,
      React.createElement(Text, { color: "yellow" }, "No parsed start list yet. "),
      event.startListUrl
        ? React.createElement(Text, { color: "cyan" }, compactUrl(event.startListUrl))
        : React.createElement(Text, { color: "gray" }, "No start-list source URL available."),
    );
  }

  return React.createElement(StartList, { participants, limit: participants.length });
}

function StartList({ participants, limit = 8 }: { participants: NonNullable<SportsEvent["startList"]>; limit?: number }): React.ReactNode {
  const visible = participants.slice(0, limit);
  const hiddenCount = participants.length - visible.length;

  return React.createElement(
    Text,
    undefined,
    React.createElement(Text, { color: "gray" }, "Field: "),
    visible.map((participant, index) => React.createElement(
      React.Fragment,
      { key: `${participant.name}:${index}` },
      index > 0 ? React.createElement(Text, { color: "gray" }, "  /  ") : undefined,
      React.createElement(Text, { color: "white" }, participant.name),
      participant.nationality ? React.createElement(Text, { color: "gray" }, ` (${participant.nationality})`) : undefined,
      participant.team ? React.createElement(Text, { color: "gray" }, ` · ${participant.team}`) : undefined,
      participant.role ? React.createElement(Text, { color: "gray" }, ` · ${participant.role}`) : undefined,
    )),
    hiddenCount > 0 ? React.createElement(Text, { color: "gray" }, `  /  +${hiddenCount} more`) : undefined,
  );
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

  return React.createElement(
    Text,
    undefined,
    React.createElement(Text, { color: "gray" }, "Open field: "),
    React.createElement(Text, { color: "cyan" }, command),
  );
}

function sportColor(sport: SportsEvent["sport"]): string {
  return sport === "cricket" ? "cyan" : "magenta";
}

function statusLabel(status: SportsEvent["status"]): string {
  return status === "scheduled" ? "UPCOMING" : status.toUpperCase();
}

function compactUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "");
}

function titleForCommand(command: AppProps["command"]): string {
  if (command === "results") {
    return "Results";
  }

  if (command === "startlist") {
    return "Start list";
  }

  return command === "today" ? "Today" : "Events";
}

function emptyMessage(command: AppProps["command"]): string {
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
