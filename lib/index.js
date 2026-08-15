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
// Dependencies: `undici@6.21.2` (pinned to Node 22.18's bundled undici so
// `Symbol.for('undici.globalDispatcher.1')` is shared between the external
// package and the native fetch).
import z from "@deepseek-ai/schemastery";
import { settingsNamespace, installSettingsSection } from "@deepseek-ai/dsh-settings";
import { ProxyAgent, setGlobalDispatcher, getGlobalDispatcher } from "undici";

export const name = "fetch-proxy";
export const inject = [];

/** Settings namespace carrying this plugin's live configuration. */
const NAMESPACE = settingsNamespace("fetch-proxy");

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

  const applyConfig = () => {
    const resolved = current();
    const enabled = resolved.enabled !== false;
    if (enabled) {
      const url = firstProxyUrl(resolved);
      setGlobalDispatcher(new ProxyAgent(url));
      ctx.logger?.info("fetch-proxy: native fetch routed through %s", url);
    } else {
      setGlobalDispatcher(previous);
      ctx.logger?.info("fetch-proxy: disabled, native fetch uses the default dispatcher");
    }
  };

  installSettingsSection(ctx, NAMESPACE, Config, config, {
    setSource: (source) => {
      current = source;
    },
    onChange: applyConfig
  });

  applyConfig();

  return () => {
    setGlobalDispatcher(previous);
  };
}
