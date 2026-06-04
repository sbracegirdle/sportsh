# sportsh

A React-based CLI for checking sports schedules and recent results.

Initial scope:

- `sportsh today`
- `sportsh events`
- `sportsh results`
- Cricket from ESPNcricinfo
- Cycling from Course du Jour
- Raw HTTP page caching
- A separated domain/core/provider/CLI architecture

## Run

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

## Commands

```sh
sportsh today [--sport cricket,cycling] [--fresh]
sportsh events [--date YYYY-MM-DD] [--sport cricket,cycling] [--fresh]
sportsh results [--date YYYY-MM-DD] [--sport cricket,cycling] [--fresh]
```

Every event shows its source site because this CLI is a front-end over existing sports websites.
