#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import type { SportsEvent } from "./domain/events.ts";
import { listEvents, listResults } from "./core/today.ts";
import { createDefaultProviders } from "./providers/index.ts";
import { App } from "./cli/App.ts";
import { InteractiveApp } from "./cli/InteractiveApp.ts";
import type { Command } from "./cli/components.ts";
import { parseArgs } from "./cli/args.ts";

const args = parseArgs(process.argv.slice(2));

try {
  const providers = createDefaultProviders();

  const load = async (
    command: Command,
    sports?: readonly string[],
    date: Date = args.date,
  ): Promise<SportsEvent[]> => {
    const options = {
      date,
      sports: sports ?? (args.sports.length > 0 ? args.sports : undefined),
      fresh: args.fresh,
    };
    const events = command === "results"
      ? await listResults(providers, options)
      : await listEvents(providers, options);
    return args.event
      ? events.filter((event) => event.name.toLowerCase().includes(args.event?.toLowerCase() ?? ""))
      : events;
  };

  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

  if (interactive) {
    const sports = args.sports.length > 0 ? args.sports : undefined;
    const initialHistory = args.command
      ? [
        { kind: "menu" as const, cursor: 0 },
        {
          kind: "list" as const,
          command: args.command,
          sports,
          date: args.date,
          cursor: 0,
          query: "",
          inputMode: false,
        },
      ]
      : [{ kind: "menu" as const, cursor: 0 }];

    render(React.createElement(InteractiveApp, {
      initialHistory,
      load,
      defaultSports: args.sports,
    }));
  } else {
    // Piped / non-TTY: keep the original one-shot render.
    const command = args.command ?? "today";
    const events = await load(command);
    render(React.createElement(App, {
      command,
      date: args.date,
      events,
      eventFilter: args.event,
      selectedSports: args.sports,
    }));
  }
} catch (error) {
  if (error instanceof AggregateError) {
    console.error(error.message);
    for (const cause of error.errors) {
      console.error(`- ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exit(1);
}
