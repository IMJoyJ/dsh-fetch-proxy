// dsh-fetch-proxy client half — registers a card in Settings → Plugins →
// "Plugin configuration" that edits the `fetch-proxy` settings namespace.
//
// Hand-written CJS bundle (no build chain): the shell's `window.__ModuleLoader__`
// loads this file and hands it a `require` resolving only against the frozen
// seed table plus the graph edges declared in `package.json`'s `dsh.client.inject`.
window.__ModuleLoader__.load({
  id: "dsh-fetch-proxy",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const { jsx, jsxs } = require("react/jsx-runtime");
    const { Button, Input, Pill } = require("@deepseek-ai/dsh-client-ui-primitives");

    // Minimal zustand-compatible observable store, replacing the now-removed
    // `@deepseek-ai/dsh-client-runtime/client` export (renamed to client-store in 0.1.2-alpha).
    function createSnapshotStore(initial) {
      let state = initial;
      const listeners = new Set();
      return {
        getSnapshot() { return state; },
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        set(next) {
          state = next;
          for (const listener of listeners) listener();
        }
      };
    }

    // cordis service dependencies (exposed as ctx.<name> via the service proxy).
    const NAMESPACE = "fetch-proxy";
    const inject = ["slots", "locale", "settingsScope"];

    // ── locale dictionaries (en + zh; zh is the fallback in the lookup chain) ──
    const LOCALE = {
      en: {
        fetchProxyTitle: "Fetch Proxy",
        fetchProxyDescription: "HTTP forward proxy for native fetch (e.g. Google Vertex, web search).",
        fetchProxyUrlLabel: "Proxy URL",
        fetchProxyUrlHint: "e.g. http://127.0.0.1:13580",
        fetchProxyEnabledLabel: "Enable proxy routing",
        save: "Save",
        discard: "Discard",
        unsaved: "Unsaved changes",
        saving: "Saving…",
        saveFailed: "Save failed",
        readOnly: "Read-only",
        collapse: "Hide settings",
        expand: "Show settings"
      },
      zh: {
        fetchProxyTitle: "网络代理",
        fetchProxyDescription: "为原生 fetch（如 Google Vertex、网页搜索）配置 HTTP 转发代理。",
        fetchProxyUrlLabel: "代理地址",
        fetchProxyUrlHint: "例如 http://127.0.0.1:13580",
        fetchProxyEnabledLabel: "启用代理",
        save: "保存",
        discard: "丢弃",
        unsaved: "有未保存的修改",
        saving: "保存中…",
        saveFailed: "保存失败",
        readOnly: "只读",
        collapse: "收起设置",
        expand: "展开设置"
      }
    };

    // ── tiny CSS (own, minimal; scoped to the card to avoid clashing) ──
    const css = ".fpcard{display:block;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:10px 14px;background:var(--dsw-alias-bg-base)}.fpcard_header{display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:none;border:none;cursor:pointer;padding:2px 0}.fpcard_name{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);flex:1}.fpcard_desc{font-size:12px;color:var(--dsw-alias-label-tertiary)}.fpcard_body{padding:8px 0 4px;display:flex;flex-direction:column;gap:12px}.fpcard_row{display:flex;flex-direction:column;gap:4px;align-items:flex-start}.fpcard_label{font-size:12px;font-weight:500;color:var(--dsw-alias-label-primary)}.fpcard_hint{font-size:11px;color:var(--dsw-alias-label-tertiary)}.fpcard_footer{display:flex;justify-content:flex-end;gap:8px;padding-top:4px}";
    if (typeof document !== "undefined") {
      const tagId = "dsh-fetch-proxy/card.css";
      if (document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
        const tag = document.createElement("style");
        tag.dataset.plugin = "dsh-fetch-proxy";
        tag.dataset.pluginCss = tagId;
        tag.textContent = css;
        document.head.appendChild(tag);
      }
    }

    // ── the card component ──
    // props come from the slot assembly: `t` (locale), `useFetchProxyCard` (the
    // hook bound from inject().hooks), and the staged-form actions.
    function FetchProxyCard(props) {
      const React2 = React;
      const { t } = props;
      const state = props.useFetchProxyCard((s) => s);
      const [open, setOpen] = React2.useState(false);

      if (state.status === "unavailable") return null;

      const title = t("fetchProxyTitle");
      const writable = state.writable;
      const busy = state.saving;

      return jsxs("li", { className: "fpcard", children: [
        jsx("button", {
          type: "button",
          className: "fpcard_header",
          "aria-expanded": open,
          onClick: () => setOpen(!open),
          children: jsxs("span", { className: "fpcard_name", children: [
            title,
            jsx("span", { className: "fpcard_desc", children: t("fetchProxyDescription") })
          ] })
        }),
        open ? jsxs("div", { className: "fpcard_body", children: [
          !writable ? jsx("p", { className: "fpcard_hint", children: t("readOnly") }) : null,
          jsx("div", { className: "fpcard_row", children: [
            jsx("label", { className: "fpcard_label", children: t("fetchProxyUrlLabel") }),
            jsx(Input, {
              value: state.proxyUrl ?? "",
              disabled: !writable,
              placeholder: "http://127.0.0.1:13580",
              onChange: (event) => props.edit("proxyUrl", event.target.value)
            }),
            jsx("p", { className: "fpcard_hint", children: t("fetchProxyUrlHint") })
          ] }),
          jsx("div", { className: "fpcard_row", children: [
            jsx("label", { className: "fpcard_label", children: t("fetchProxyEnabledLabel") }),
            jsx(Pill, {
              active: state.enabled !== false,
              disabled: !writable,
              onClick: () => props.setEnabled(state.enabled === false)
            })
          ] }),
          jsx("div", { className: "fpcard_footer", children: [
            jsx(Button, {
              variant: "ghost",
              size: "sm",
              disabled: !state.dirty || busy,
              onClick: props.discard,
              children: t("discard")
            }),
            jsx(Button, {
              variant: "primary",
              size: "sm",
              disabled: !state.dirty || busy,
              onClick: props.save,
              children: t(state.saving ? "saving" : "save")
            })
          ] })
        ] }) : null
      ] });
    }

    // ── staged-form controller over the settings scope ──
    // Mirrors the official card's pattern: a createSnapshotStore (zustand-backed,
    // stable getSnapshot references) over scope.getSnapshot, with local staged
    // edits flushed on save and reset on discard.
    class FetchProxyController {
      constructor(scope) {
        this.scope = scope;
        this.staged = null; // null = not dirty (follows scope value)
        this.store = createSnapshotStore(this.projection());
        scope.subscribe(() => {
          this.staged = null;
          this.publish();
        });
      }
      projection() {
        const snap = this.scope.getSnapshot();
        const value = snap.value ?? {};
        const staged = this.staged ?? {};
        return {
          status: snap.status,
          writable: snap.writable,
          available: snap.status !== "unavailable",
          proxyUrl: staged.proxyUrl !== undefined ? staged.proxyUrl : value.proxyUrl ?? snap.base?.proxyUrl,
          enabled: staged.enabled !== undefined ? staged.enabled : value.enabled ?? snap.base?.enabled !== false,
          dirty: this.staged !== null,
          saving: false
        };
      }
      getSnapshot() {
        return this.store.getSnapshot();
      }
      subscribe(listener) {
        return this.store.subscribe(listener);
      }
      publish() {
        this.store.set(this.projection());
      }
      edit(field, text) {
        this.staged = { ...(this.staged ?? this.stageBase()), [field]: text };
        this.publish();
      }
      setEnabled(next) {
        this.staged = { ...(this.staged ?? this.stageBase()), enabled: next };
        this.publish();
      }
      discard() {
        this.staged = null;
        this.publish();
      }
      async save() {
        if (this.staged === null) return;
        const staged = this.staged;
        const tasks = [];
        for (const [field, value] of Object.entries(staged)) {
          if (value === undefined || value === null || value === "") tasks.push(this.scope.unset(field));
          else tasks.push(this.scope.set(field, field === "enabled" ? value === true : value));
        }
        await Promise.all(tasks);
        this.staged = null;
        this.publish();
      }
      stageBase() {
        const snap = this.scope.getSnapshot();
        const value = snap.value ?? {};
        return { proxyUrl: value.proxyUrl ?? snap.base?.proxyUrl, enabled: value.enabled ?? snap.base?.enabled !== false };
      }
      inject() {
        return {
          // `hooks.fetchProxyCard` must be an observable (subscribe + getSnapshot),
          // which `bindInjectHooks` wraps into a `useFetchProxyCard(selector)` hook.
          hooks: { fetchProxyCard: this },
          save: () => this.save(),
          discard: () => this.discard(),
          edit: (field, text) => this.edit(field, text),
          setEnabled: (next) => this.setEnabled(next)
        };
      }
    }

    function apply(ctx) {
      ctx.locale.register("fetch-proxy", { en: LOCALE.en, zh: LOCALE.zh });

      const scope = ctx.settingsScope.bind({ namespace: NAMESPACE });
      const controller = new FetchProxyController(scope);

      ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
        name: "settings.plugin.item",
        key: "fetch-proxy",
        locale: "fetch-proxy",
        inject: () => controller.inject()
      }, FetchProxyCard));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
