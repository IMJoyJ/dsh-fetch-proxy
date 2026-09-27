// dsh-fetch-proxy client half — a Plugins-page card editing this entry's
// volatile Config fields (`proxyUrl`, `enabled`) through the page owner's
// form face (`form.state` + `form.mutate`), shown while the Host serves the
// `fetch-proxy` namespace.
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

    // Minimal zustand-compatible observable store over the page owner's form
    // snapshot, with local staged edits flushed on save and reset on discard.
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
    const inject = ["slots", "locale", "configForms"];

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
    const css = ".fpcard{display:block;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:10px 14px;background:var(--dsw-alias-bg-base)}.fpcard_header{display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:none;border:none;cursor:pointer;padding:2px 0}.fpcard_name{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);flex:1}.fpcard_desc{font-size:12px;color:var(--dsw-alias-label-tertiary)}.fpcard_body{padding:8px 0 4px;display:flex;flex-direction:column;gap:12px}.fpcard_row{display:flex;flex-direction:column;gap:4px;align-items:flex-start}.fpcard_label{font-size:12px;font-weight:500;color:var(--dsw-alias-label-primary)}.fpcard_hint{font-size:11px;color:var(--dsw-alias-label-tertiary)}.fpcard_error{font-size:12px;color:var(--dsw-alias-color-error, #ef4444)}.fpcard_footer{display:flex;justify-content:flex-end;gap:8px;padding-top:4px}";
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
    // Owner props come from the Plugins page assembly (`view`, `form`); the
    // rest (`t`, `useFetchProxyCard`, staged-form actions) from inject().hooks.
    function FetchProxyCard(props) {
      const React2 = React;
      const { t } = props;
      const state = props.useFetchProxyCard((s) => s);
      const [open, setOpen] = React2.useState(false);

      if (props.view === "summary") return t("fetchProxyDescription");
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
          state.saveError ? jsx("p", { className: "fpcard_error", children: t("saveFailed") }) : null,
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

    // ── staged-form controller over the page owner's ConfigForm ──
    // Mirrors the official card's pattern: a createSnapshotStore (zustand-backed,
    // stable getSnapshot references) over the shared form snapshot, with local
    // staged edits flushed through one atomic `form.mutate` on save.
    class FetchProxyController {
      constructor(form) {
        this.form = form;
        this.staged = null; // null = not dirty (follows the accepted value)
        this.saving = false;
        this.saveError = false;
        this.store = createSnapshotStore(this.projection());
        this.unsubscribe = form.subscribe(() => {
          this.staged = null;
          this.publish();
        });
      }
      accepted() {
        const snap = this.form.getSnapshot();
        return snap.value ?? snap.base ?? {};
      }
      projection() {
        const snap = this.form.getSnapshot();
        const value = this.accepted();
        const staged = this.staged ?? {};
        return {
          status: snap.status,
          writable: snap.writable,
          available: snap.status !== "unavailable",
          proxyUrl: staged.proxyUrl !== undefined ? staged.proxyUrl : value.proxyUrl,
          enabled: staged.enabled !== undefined ? staged.enabled : value.enabled !== false,
          dirty: this.staged !== null,
          saving: this.saving,
          saveError: this.saveError
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
      dispose() {
        if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = null;
        }
      }
      edit(field, text) {
        this.staged = { ...(this.staged ?? this.stageBase()), [field]: text };
        this.saveError = false;
        this.publish();
      }
      setEnabled(next) {
        this.staged = { ...(this.staged ?? this.stageBase()), enabled: next };
        this.saveError = false;
        this.publish();
      }
      discard() {
        this.staged = null;
        this.saveError = false;
        this.publish();
      }
      async save() {
        if (this.staged === null || this.saving) return;
        const staged = this.staged;
        const ops = [];
        for (const [field, value] of Object.entries(staged)) {
          if (value === undefined || value === null || value === "") {
            ops.push({ op: "unset", path: [field] });
          } else if (field === "enabled") {
            ops.push({ op: "set", path: [field], value: value === true });
          } else {
            ops.push({ op: "set", path: [field], value });
          }
        }
        if (ops.length === 0) {
          this.staged = null;
          this.publish();
          return;
        }
        this.saving = true;
        this.saveError = false;
        this.publish();
        try {
          const revision = this.form.getSnapshot().revision;
          const ok = await this.form.mutate(ops, revision);
          this.staged = null;
          this.saveError = !ok;
        } catch (_err) {
          this.saveError = true;
        } finally {
          this.saving = false;
          this.publish();
        }
      }
      stageBase() {
        const value = this.accepted();
        return { proxyUrl: value.proxyUrl, enabled: value.enabled !== false };
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
      ctx.effect(() => ctx.locale.register("fetch-proxy", { en: LOCALE.en, zh: LOCALE.zh }), "dsh-fetch-proxy: dictionaries");
      const t = ctx.locale.bind("fetch-proxy");
      ctx.effect(() => ctx.configForms.whileServed([NAMESPACE], () => {
        const controller = new FetchProxyController(ctx.configForms.get(NAMESPACE));
        const offSlot = ctx.slots.inject("plugins.item", () => ctx.slots.register({
          name: "plugins.item",
          id: "fetch-proxy",
          order: 80,
          label: () => t("fetchProxyTitle"),
          locale: "fetch-proxy",
          inject: () => controller.inject()
        }, FetchProxyCard));
        return () => {
          offSlot();
          controller.dispose();
        };
      }), "dsh-fetch-proxy: page");
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
