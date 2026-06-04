export type CliArgs = {
  command: "today";
  sports: string[];
  fresh: boolean;
};

export function parseArgs(argv: readonly string[]): CliArgs {
  const args = [...argv];
  const command = args[0] === "today" || !args[0] ? "today" : fail(`Unknown command: ${args[0]}`);
  const sports: string[] = [];
  let fresh = false;

  for (let index = command === "today" && args[0] === "today" ? 1 : 0; index < args.length; index += 1) {
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

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    fail(`Unknown option: ${arg}`);
  }

  return { command, sports, fresh };
}

function printHelp(): void {
  console.log(`sportsh

Usage:
  sportsh today [--sport cricket,cycling] [--fresh]

Options:
  -s, --sport   Limit sports to cricket, cycling, or a comma-separated list
  --fresh       Ignore cached pages and fetch again
  -h, --help    Show help
`);
}

function fail(message: string): never {
  console.error(message);
  console.error("Run `sportsh --help` for usage.");
  process.exit(1);
}
