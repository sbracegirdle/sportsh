import React from "react";
import { Box, Text } from "ink";
import type { SportsEvent } from "../domain/events.ts";
import { formatHeadingDate } from "./format.ts";
import {
  type Command,
  EventCard,
  emptyMessage,
  titleForCommand,
} from "./components.ts";

const h = React.createElement;

export type AppProps = {
  command: Command;
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

  return h(
    Box,
    { flexDirection: "column", gap: 1, paddingX: 1 },
    h(
      Box,
      { borderStyle: "round", borderColor: "gray", paddingX: 1 },
      h(Text, { bold: true }, titleParts.join("  /  ")),
    ),
    props.events.length === 0
      ? h(Text, { color: "yellow" }, emptyMessage(props.command))
      : props.events.map((event) => h(EventCard, {
        command: props.command,
        event,
        key: event.id,
        referenceDate: props.date,
        selectedSports: props.selectedSports,
      })),
  );
}
