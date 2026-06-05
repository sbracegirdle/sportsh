# sportsh

A CLI for checking sports schedules and recent results.

## Usage

```sh
sportsh                                                                       # interactive menu
sportsh today [--sport cricket,cycling,f1,rally,triathlon,marathon,afl] [--fresh]
sportsh events [--date YYYY-MM-DD] [--sport cricket,cycling,f1,rally,triathlon,marathon,afl] [--fresh]
sportsh results [--date YYYY-MM-DD] [--sport cricket,cycling,f1,rally,triathlon,marathon,afl] [--fresh]
sportsh startlist [--date YYYY-MM-DD] [--sport SPORT] [--event EVENT]
```

### Interactive mode

When run in a terminal, `sportsh` is interactive. Running it with no command opens a menu (today's schedule, today's results, or filter by sport); running it with a command jumps straight to that list. The list scrolls to keep the highlighted event on screen, showing `↑ N more` / `↓ N more` when entries are off-screen.

Pressing `↵` on an event opens its **details page**, which has a *Schedule* section (sessions for session-based sports such as F1, otherwise the start time / date range), an *Info* section, and the *Field* (start list). The schedule tags each entry as `● LIVE`, `◆ today`, or `✓ done`.

- `↑`/`↓` (or `k`/`j`) — move the selection (or scroll the start list)
- `PgUp`/`PgDn` — page through the current view by a screenful
- `←`/`→` — previous / next day (on a list)
- `↵` (Enter) — open the highlighted item (a menu choice, or an event's details page)
- `/` — filter: on a list narrows events by name/sport/status; on a details page narrows the field by name/team/nationality. Type to filter, `↵` to apply, `Esc` to clear.
- `b` / `Esc` — go back to the previous screen
- `q` — quit

When output is piped or not a TTY, `sportsh` falls back to printing a one-shot, non-interactive view.

Every event shows its source site because this CLI is a front-end over existing sports websites. `sportsh` should be a responsible consumer: disclose and promote sources clearly, and do not use sources that signal they do not want automated access, such as Cloudflare challenge pages or persistent blocking.

Supported sport keys:

- `cricket`
- `cycling`
- `f1`
- `rally`
- `triathlon`
- `marathon`
- `afl`

`events` cards include an `Open field:` command when a parsed start list is available. `startlist` renders the full in-app field when parsed entrants exist, or shows the responsible source URL when the event's field is not parsed yet.


## Development

```sh
npm install
npm run today
npm run events -- --date 2026-06-04
npm run results -- --sport cricket
```

Node runs the TypeScript source directly using native type stripping.

## Cache

Fetched pages are cached under:

```text
$SPORTSH_CACHE_DIR
$XDG_CACHE_HOME/sportsh
~/.cache/sportsh
```

Use `--fresh` to bypass the TTL.
