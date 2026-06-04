Use Node with TypeScript files executed by Node's native type stripping. Keep TypeScript syntax erasable; avoid enums, namespaces, parameter properties, decorators, and JSX.

Architecture:
- `src/domain` contains shared domain types only. It must not import CLI or provider code.
- `src/core` contains use cases and orchestration over domain interfaces. It must not perform HTTP or terminal rendering directly.
- `src/providers` contains external integrations, HTTP fetching, caching, and parsing for specific data sources.
- `src/cli` contains the React/Ink CLI surface. It should render domain data and call core use cases.

Provider rules:
- Keep one provider per source/sport where practical.
- Cache fetched pages/results through `src/providers/shared/cache.ts`; do not add ad hoc cache writes in provider files.
- Prefer parsing cached/fetched source pages into the common `SportsEvent` model before returning data to core code.
- If a site changes markup, fix that provider without changing the domain model or CLI unless the product behavior changes.
- Providers should expose generic event listing and spoiler-oriented results through the domain provider interface. Avoid command-specific provider methods like `today`.
- Add sport-specific enrichment as domain facts where the source provides it, such as cricket series/venue/weather and cycling course/start/end/weather. Do not invent facts that are not present or clearly derivable.

CLI rules:
- Keep output readable in narrow terminals.
- Do not let Ink components know about provider-specific page shapes.
- Add flags at the CLI boundary, pass plain options into core code.
- Always render the source name and source URL for each event/result. `sportsh` is a front-end to existing sites, not an authoritative data source.
- Keep `results` separate from event listing commands because results imply spoilers.

Testing:
- Use Node's built-in `node:test` runner and `node:assert/strict`.
- Put tests under `test/**/*.test.ts`.
- Prefer parser/core tests with local fixtures over network-dependent tests.
- Run `npm test` for the test suite and `npm run typecheck` for TypeScript checks.
