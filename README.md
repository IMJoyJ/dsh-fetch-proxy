# dsh-fetch-proxy

Route DeepSeek Harness's native `fetch` through an HTTP/HTTPS forward proxy,
with a configurable settings card.

## Why

Node ≤ 22's global `fetch` does **not** read the `HTTP(S)_PROXY` environment
variables, and DSH plugins such as the Google Vertex adapter (`@google/genai`)
issue raw `fetch(url, init)` calls. The only reliable seam is undici's global
dispatcher — this plugin swaps it with a `ProxyAgent`, so every bare `fetch`
call goes through your proxy.

## Features

- **Host half** (`lib/index.js`) — installs an undici `ProxyAgent` as the
  global dispatcher; disabling the plugin restores the previous dispatcher.
- **Client half** (`lib/client.js`) — a Settings → Plugins → Plugin
  configuration card that edits the `fetch-proxy` settings namespace (proxy URL
  and an enable toggle), with `/en` locale support.
- **Hot reload** — the dispatcher is re-applied on every settings change.
- **Surgical** — no telemetry, no network calls beyond the proxy itself.

## Install

Mount the plugin in your profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: fetch-proxy
      name: dsh-fetch-proxy
      config:
        proxyUrl: http://127.0.0.1:13580
        enabled: true
```

If the package is reachable from the profile's `node_modules` (a `link:`/`file:`
dependency or a junction), the bare package name resolves. Otherwise install it
via `dsh plugin --profile <name> add ...` and keep the row as above.

## Configuration

Settings namespace `fetch-proxy`:

| Key | Default | Meaning |
| --- | --- | --- |
| `proxyUrl` | `http://127.0.0.1:13580` | HTTP(S) forward proxy URL |
| `enabled` | `true` | `false` restores the default dispatcher (direct connect) |

`cordis.patch.yml` supplies the base; `settings.yaml` (or the settings card)
overrides it live.

## How it works

```text
native fetch (undici)
        │
        ▼
setGlobalDispatcher(new ProxyAgent(url))   ← host half, applied at mount + on change
        │
        ▼
HTTP(S) forward proxy (e.g. http://127.0.0.1:13580)
```

`undici@8.9.0` is pinned to **node 26.7.0's built-in undici** so
`Symbol.for('undici.globalDispatcher.1')` is shared between the external
package and the native fetch. `setGlobalDispatcher` only affects the native
fetch when the npm undici and node's built-in undici share that global-symbol
contract, so this pin must track the running node's `process.versions.undici`
(after a node upgrade, check it and bump this dependency to match).

## Development

There is no build step — both halves are hand-written JavaScript. Validate
syntax:

```sh
node --check lib/index.js
node --check lib/client.js
```

## License

[MIT](./LICENSE) © 2026 IMJoyJ
