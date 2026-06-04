import React from "react";
import { Box, Text } from "ink";
import type { SportsEvent } from "../domain/events.ts";

export type AppProps = {
  events: readonly SportsEvent[];
  selectedSports: readonly string[];
};

export function App(props: AppProps): React.ReactNode {
  const title = props.selectedSports.length > 0 ? `Today: ${props.selectedSports.join(", ")}` : "Today";

  return React.createElement(
    Box,
    { flexDirection: "column", gap: 1 },
    React.createElement(Text, { bold: true }, title),
    props.events.length === 0
      ? React.createElement(Text, { color: "yellow" }, "No events found.")
      : props.events.map((event) => React.createElement(EventRow, { event, key: event.id })),
  );
}

function EventRow({ event }: { event: SportsEvent }): React.ReactNode {
  const time = event.startTime ? `${event.startTime} ` : "";
  const statusColor = event.status === "live" ? "green" : event.status === "final" ? "blue" : "gray";
  const detail = event.resultSummary ?? event.detail;

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
      time,
      event.name,
    ),
    detail ? React.createElement(Text, { color: "gray" }, `  ${detail}`) : undefined,
  );
}

function sportColor(sport: SportsEvent["sport"]): string {
  return sport === "cricket" ? "cyan" : "magenta";
}
