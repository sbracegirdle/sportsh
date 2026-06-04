export type CliArgs = {
  command: "events" | "today" | "results" | "startlist";
  date: Date;
  event?: string;
  sports: string[];
  fresh: boolean;
};

export function parseArgs(argv: readonly string[]): CliArgs {
  const args = [...argv];
  const command = commandFromArg(args[0]);
  const sports: string[] = [];
  let event: string | undefined;
  let fresh = false;
  let date = new Date();

  for (let index = args[0] && ["events", "today", "results", "startlist"].includes(args[0]) ? 1 : 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--fresh") {
      fresh = true;
      continue;
    }

    if (arg === "--sport" || arg === "-s") {
      const value = args[index + 1] ?? fail(`${arg} requires a value`);
      sports.push(...value.split(",").map((sport) => sport.trim()).filter(Boolean));
      index += 1;
      continue;
    }

    if (arg === "--date" || arg === "-d") {
      const value = args[index + 1] ?? fail(`${arg} requires a YYYY-MM-DD value`);
      date = parseDate(value);
      index += 1;
      continue;
    }

    if (arg === "--event" || arg === "-e") {
      event = args[index + 1] ?? fail(`${arg} requires an event name`);
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    fail(`Unknown option: ${arg}`);
  }

  return { command, date, event, sports, fresh };
}

function printHelp(): void {
  console.log(`sportsh

Usage:
  sportsh today [--sport cricket,cycling,f1,rally,triathlon,marathon,afl] [--fresh]
  sportsh events [--date YYYY-MM-DD] [--sport cricket,cycling,f1,rally,triathlon,marathon,afl] [--fresh]
  sportsh results [--date YYYY-MM-DD] [--sport cricket,cycling,f1,rally,triathlon,marathon,afl] [--fresh]
  sportsh startlist [--date YYYY-MM-DD] [--sport SPORT] [--event EVENT]

Options:
  -s, --sport   Limit sports to one or more comma-separated sport keys
  -d, --date    Date to list, in YYYY-MM-DD format
  -e, --event   Filter to an event name for start lists
  --fresh       Ignore cached pages and fetch again
  -h, --help    Show help
`);
}

function commandFromArg(arg: string | undefined): CliArgs["command"] {
  if (!arg) {
    return "today";
  }

  if (arg === "events" || arg === "today" || arg === "results" || arg === "startlist") {
    return arg;
  }

  if (arg === "--help" || arg === "-h") {
    printHelp();
    process.exit(0);
  }

  return fail(`Unknown command: ${arg}`);
}

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(`Invalid date: ${value}`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    fail(`Invalid date: ${value}`);
  }

  return date;
}

function fail(message: string): never {
  console.error(message);
  console.error("Run `sportsh --help` for usage.");
  process.exit(1);
}
