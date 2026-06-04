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
    { flexDirection: "column", gap: 1 },
    React.createElement(Text, { bold: true }, titleParts.join(": ")),
    props.events.length === 0
      ? React.createElement(Text, { color: "yellow" }, "No events found.")
      : props.events.map((event) => React.createElement(EventRow, { event, key: event.id, referenceDate: props.date })),
  );
}

function EventRow({ event, referenceDate }: { event: SportsEvent; referenceDate: Date }): React.ReactNode {
  const time = formatEventTime(event.startTime, referenceDate);
  const statusColor = event.status === "live" ? "green" : event.status === "final" ? "blue" : "gray";
  const detail = event.resultSummary ?? event.detail;
  const facts = event.facts ?? [];

  return React.createElement(
    Box,
    { flexDirection: "column" },
    React.createElement(
      Text,
      undefined,
      React.createElement(Text, { color: sportColor(event.sport) }, event.sport),
      "  ",
      React.createElement(Text, { color: statusColor }, event.status),
      "  ",
      time ? `${time}  ` : "",
      event.name,
    ),
    React.createElement(Text, { color: "gray" }, `  Source: ${event.source} (${event.sourceUrl})`),
    detail ? React.createElement(Text, { color: "gray" }, `  ${detail}`) : undefined,
    facts.length > 0
      ? React.createElement(Text, { color: "gray" }, `  ${facts.map((fact) => `${fact.label}: ${fact.value}`).join(" · ")}`)
      : undefined,
  );
}

function sportColor(sport: SportsEvent["sport"]): string {
  return sport === "cricket" ? "cyan" : "magenta";
}
