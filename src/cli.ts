#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { getTodayEvents } from "./core/today.ts";
import { createDefaultProviders } from "./providers/index.ts";
import { App } from "./cli/App.ts";
import { parseArgs } from "./cli/args.ts";

const args = parseArgs(process.argv.slice(2));

try {
  const events = await getTodayEvents(createDefaultProviders(), {
    sports: args.sports.length > 0 ? args.sports : undefined,
    fresh: args.fresh,
  });

  render(React.createElement(App, {
    events,
    selectedSports: args.sports,
  }));
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
