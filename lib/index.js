// dsh-fetch-proxy host half — route Node's native undici `fetch` (used by
// `@google/genai` and every other bare-fetch caller) through an HTTP/HTTPS
// proxy. Node ≤ 22's global fetch does NOT read HTTP(S)_PROXY, and @google/genai
// issues raw `fetch(url, init)` calls, so the only reliable seam is undici's
// global dispatcher.
//
// Configuration is a settings namespace `fetch-proxy`, hot-reloaded:
//   fetch-proxy:
//     proxyUrl: http://127.0.0.1:13580   # HTTP(S) forward proxy
//     enabled: true                       # false restores the default dispatcher
// The composition config (cordis.patch.yml) supplies the base; settings.yaml
// overrides it live, and the dispatcher is re-applied on every change.
//
// Dependencies: `undici@8.9.0` — pinned to EXACTLY Node 26.7.0's bundled
// undici version so `Symbol.for('undici.globalDispatcher.1')` is shared
// between the external package and the native fetch. `setGlobalDispatcher`
// only affects the native fetch when the npm undici and Node's built-in undici
// resolve to the same global-symbol contract, so this pin must track the
// running Node's built-in undici major/minor (check `process.versions.undici`
// after a Node upgrade).
import z from "@deepseek-ai/schemastery";
import { ProxyAgent, setGlobalDispatcher, getGlobalDispatcher } from "undici";

export const name = "fetch-proxy";
export const inject = [];

/** Settings namespace carrying this plugin's live configuration. */
const NAMESPACE = "fetch-proxy";

export const Config = z.object({
  /** HTTP(S) forward-proxy URL native fetch is routed through. */
  proxyUrl: z.string().comment("HTTP(S) forward proxy URL (e.g. http://127.0.0.1:13580)").default("http://127.0.0.1:13580"),
  /** Disable routing: the dispatcher is restored so fetch connects directly. */
  enabled: z.boolean().default(true)
});

const DEFAULT_PROXY_URL = "http://127.0.0.1:13580";

function firstProxyUrl(config) {
  const configured = config?.proxyUrl;
  return typeof configured === "string" && configured.trim().length > 0
    ? configured.trim()
    : DEFAULT_PROXY_URL;
}

export function apply(ctx, config) {
  const previous = getGlobalDispatcher();
  let current = () => config;

  // Last applied dispatcher state, so identical re-applies are no-ops. The
  // applyConfig below runs twice at startup whenever a settings provider
  // exists — once unconditionally for the no-settings composition path and
  // once from installSection's attach-time onChange — and without the guard
  // the second, identical call would build a second ProxyAgent for the same
  // route and double-log.
  let applied = null;

  const applyConfig = () => {
    const resolved = current();
    const enabled = resolved.enabled !== false;
    const url = enabled ? firstProxyUrl(resolved) : null;
    if (applied !== null && applied.enabled === enabled && applied.url === url) return;
    if (enabled) {
      setGlobalDispatcher(new ProxyAgent(url));
      ctx.logger?.info("fetch-proxy: native fetch routed through %s", url);
    } else {
      setGlobalDispatcher(previous);
      ctx.logger?.info("fetch-proxy: disabled, native fetch uses the default dispatcher");
    }
    applied = { enabled, url };
  };

  // Settings seam: dsh-settings-file mounts its service asynchronously, so a
  // direct ctx.get("settings") at apply time can read `undefined` even when
  // the provider is about to come up — the namespace registration would then
  // be dropped silently and the Web settings card would never appear
  // (reproduced on restarts that applied this plugin before the provider).
  // ctx.inject defers this callback until the service is ready; installSection
  // registers the composition entry as the base layer and drives the
  // setSource/onChange hooks at attach, on every committed change, and when
  // the provider detaches (it falls back to the composition entry). If the
  // settings service never mounts, the callback never fires and the
  // unconditional first apply below is the only one.
  ctx.inject(["settings"], (settingsCtx) => {
    settingsCtx.settings.installSection(ctx, NAMESPACE, Config, config, {
      setSource: (get) => {
        current = get;
      },
      onChange: applyConfig
    });
  });

  // First apply, unconditional: with no settings provider (dev/standalone)
  // installSection is never reached, so the composition config is applied
  // as-is here. With a provider the attach-time onChange supersedes this call
  // once the settings scope resolves; the `applied` guard keeps the two from
  // double-applying the same dispatcher state.
  applyConfig();

  return () => {
    setGlobalDispatcher(previous);
  };
}
