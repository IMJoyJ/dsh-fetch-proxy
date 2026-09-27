// dsh-fetch-proxy host half — route Node's native undici `fetch` (used by
// `@google/genai` and every other bare-fetch caller) through an HTTP/HTTPS
// proxy. Node's global fetch does NOT read HTTP(S)_PROXY on its own, and
// @google/genai issues raw `fetch(url, init)` calls, so the reliable seam is
// undici's global dispatcher.
//
// Configuration lives in this entry's volatile Config fields, edited through
// the Plugins page card (or the profile patch) and committed live by the
// Loader without a remount:
//   fetch-proxy:
//     proxyUrl: http://127.0.0.1:13580   # HTTP(S) forward proxy
//     enabled: true                       # false restores the default dispatcher
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

export const Config = z.object({
  /** HTTP(S) forward-proxy URL native fetch is routed through. */
  proxyUrl: z.string().comment("HTTP(S) forward proxy URL (e.g. http://127.0.0.1:13580)").default("http://127.0.0.1:13580").volatile(),
  /** Disable routing: the dispatcher is restored so fetch connects directly. */
  enabled: z.boolean().default(true).volatile()
});

const DEFAULT_PROXY_URL = "http://127.0.0.1:13580";

/** Read one volatile field, falling back to a plain value when the Loader passed one through. */
function readVolatile(ref, fallback) {
  if (ref !== null && typeof ref === "object" && typeof ref.get === "function") return ref.get();
  return ref ?? fallback;
}

function firstProxyUrl(config) {
  const configured = readVolatile(config?.proxyUrl, DEFAULT_PROXY_URL);
  return typeof configured === "string" && configured.trim().length > 0
    ? configured.trim()
    : DEFAULT_PROXY_URL;
}

export function apply(ctx, config) {
  const previous = getGlobalDispatcher();

  // Last applied dispatcher state, so identical re-applies are no-ops. The
  // applyConfig below runs at startup and again on every volatile commit, and
  // without the guard each identical call would build a second ProxyAgent for
  // the same route and double-log.
  let applied = null;

  const applyConfig = () => {
    const enabled = readVolatile(config?.enabled, true) !== false;
    const url = enabled ? firstProxyUrl(config) : null;
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

  // 0.1.7 settings seam: volatile Config fields are edited through Settings
  // forms and committed into the running references by the Loader, which emits
  // `loader/volatile-update` on this fiber for volatile-only changes (an
  // ordinary-field change remounts instead). `configure({ auto: false })`
  // marks this instance as owning its own Plugins-page card, so no
  // auto-generated form is built for it. If the settings service never
  // mounts, the unconditional first apply below stands on its own.
  ctx.inject(["settings"], (settingsCtx) => {
    settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber));
  });
  ctx.on("loader/volatile-update", applyConfig);

  // First apply, unconditional: the composition config is applied as-is here;
  // a later volatile commit supersedes this call once the settings scope
  // resolves. The `applied` guard keeps the two from double-applying the same
  // dispatcher state.
  applyConfig();

  return () => {
    setGlobalDispatcher(previous);
  };
}
