import React from "react";
import { Box, Text } from "ink";
import type { SportsEvent } from "../domain/events.ts";
import { formatEventTime, formatHeadingDate } from "./format.ts";

export type AppProps = {
  command: "events" | "today" | "results";
  date: Date;
  events: readonly SportsEvent[];
  selectedSports: readonly string[];
};

export function App(props: AppProps): React.ReactNode {
  const titleParts = [
    props.command === "results" ? "Results" : props.command === "today" ? "Today" : "Events",
    props.command === "today" ? undefined : formatHeadingDate(props.date),
    props.selectedSports.length > 0 ? props.selectedSports.join(", ") : undefined,
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
      ? React.createElement(Text, { color: "yellow" }, props.command === "results" ? "No results found." : "No events found.")
      : props.events.map((event) => React.createElement(EventRow, { event, key: event.id, referenceDate: props.date })),
  );
}

function EventRow({ event, referenceDate }: { event: SportsEvent; referenceDate: Date }): React.ReactNode {
  const time = formatEventTime(event.startTime, referenceDate);
  const statusColor = event.status === "live" ? "green" : event.status === "final" ? "blue" : "gray";
  const detail = event.resultSummary ?? event.detail;
  const facts = event.facts ?? [];
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
