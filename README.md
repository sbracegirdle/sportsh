# sportsh

A CLI for checking sports schedules and recent results.

## Usage

```sh
sportsh today [--sport cricket,cycling,f1,rally,triathlon,marathon,afl] [--fresh]
sportsh events [--date YYYY-MM-DD] [--sport cricket,cycling,f1,rally,triathlon,marathon,afl] [--fresh]
sportsh results [--date YYYY-MM-DD] [--sport cricket,cycling,f1,rally,triathlon,marathon,afl] [--fresh]
```

Every event shows its source site because this CLI is a front-end over existing sports websites. `sportsh` should be a responsible consumer: disclose and promote sources clearly, and do not use sources that signal they do not want automated access, such as Cloudflare challenge pages or persistent blocking.

Supported sport keys:

- `cricket`
- `cycling`
- `f1`
- `rally`
- `triathlon`
- `marathon`
- `afl`


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
