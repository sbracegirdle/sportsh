# sportsh

A React-based CLI for checking sports schedules and recent results.

Initial scope:

- `sportsh today`
- Cricket from ESPNcricinfo
- Cycling from Course du Jour
- Raw HTTP page caching
- A separated domain/core/provider/CLI architecture

## Run

```sh
npm install
npm run today
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
