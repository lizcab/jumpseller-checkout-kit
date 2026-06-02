(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/core/engine.js
  var URL_MATCH = "v2/checkout";
  var NAMESPACE = "__JS_CHECKOUT_KIT__";
  function createEngine(opts) {
    opts = opts || {};
    const urlMatch = opts.urlMatch !== void 0 ? opts.urlMatch : URL_MATCH;
    const debounceMs = opts.debounceMs !== void 0 ? opts.debounceMs : 80;
    const skipGuards = !!opts.skipGuards;
    const registry = [];
    let observer = null;
    let timer = null;
    let started = false;
    function apply() {
      if (observer) observer.disconnect();
      for (let i = 0; i < registry.length; i++) {
        try {
          registry[i]();
        } catch (e) {
        }
      }
      if (observer) {
        observer.takeRecords();
        observer.observe(document.body, { childList: true, subtree: true });
      }
    }
    function register(fn) {
      registry.push(fn);
      if (started) apply();
      return fn;
    }
    function start() {
      if (started) return true;
      if (!skipGuards) {
        if (urlMatch && window.location.href.indexOf(urlMatch) === -1) return false;
        window[NAMESPACE] = window[NAMESPACE] || {};
        if (window[NAMESPACE].started) return false;
        window[NAMESPACE].started = true;
      }
      started = true;
      apply();
      observer = new MutationObserver(function() {
        clearTimeout(timer);
        timer = setTimeout(apply, debounceMs);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return true;
    }
    function stop() {
      if (observer) observer.disconnect();
      observer = null;
      clearTimeout(timer);
      started = false;
      if (!skipGuards && window[NAMESPACE]) window[NAMESPACE].started = false;
    }
    return { register, apply, start, stop };
  }
  var engine = createEngine();

  // src/core/react.js
  function setNativeValue(el, value) {
    const proto = el.tagName === "SELECT" ? window.HTMLSelectElement.prototype : el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, value);
    const eventType = el.tagName === "SELECT" ? "change" : "input";
    el.dispatchEvent(new Event(eventType, { bubbles: true }));
  }

  // src/core/actions.js
  function onPage(page) {
    return !page || !!document.querySelector(page);
  }
  function makeHide({ selector, page }) {
    return function() {
      if (!onPage(page)) return;
      document.querySelectorAll(selector).forEach(function(el) {
        if (el.style.display !== "none") el.style.display = "none";
      });
    };
  }
  function makeAutofill({ selector, value, page }) {
    return function() {
      if (!onPage(page)) return;
      const el = document.querySelector(selector);
      if (!el) return;
      if (el.dataset.ckAutofilled || el.value) return;
      const v = typeof value === "function" ? value() : value;
      setNativeValue(el, v);
      el.dataset.ckAutofilled = "1";
    };
  }
  function makeAlert({ anchor, position = "before", id, html, ensureStyles }) {
    return function() {
      if (id && document.getElementById(id)) return;
      const anchorEl = document.querySelector(anchor);
      if (!anchorEl || !anchorEl.parentNode) return;
      if (typeof ensureStyles === "function") ensureStyles();
      const tpl = document.createElement("template");
      tpl.innerHTML = String(html).trim();
      const node = tpl.content.firstElementChild;
      if (!node) return;
      if (id && !node.id) node.id = id;
      if (position === "after") {
        anchorEl.parentNode.insertBefore(node, anchorEl.nextSibling);
      } else {
        anchorEl.parentNode.insertBefore(node, anchorEl);
      }
    };
  }
  function makeAutofillThenHide({ selector, value, page }) {
    const fill = makeAutofill({ selector, value, page });
    const hide2 = makeHide({ selector, page });
    return function() {
      fill();
      hide2();
    };
  }

  // src/core/api.js
  function add(actionFn) {
    engine.register(actionFn);
    engine.start();
  }
  function hide(selector, opts) {
    opts = opts || {};
    add(makeHide({ selector, page: opts.page }));
  }
  function autofill(selector, value, opts) {
    opts = opts || {};
    add(makeAutofill({ selector, value, page: opts.page }));
  }
  function autofillThenHide(selector, value, opts) {
    opts = opts || {};
    add(makeAutofillThenHide({ selector, value, page: opts.page }));
  }
  function addAlert(spec) {
    add(makeAlert(spec));
  }
  function onChange(fn) {
    engine.register(fn);
    engine.start();
  }

  // src/core/run.js
  function run(actions) {
    if (!Array.isArray(actions)) return;
    actions.forEach(function(a) {
      switch (a.type) {
        case "hide":
          hide(a.selector, { page: a.page });
          break;
        case "autofill":
          autofill(a.selector, a.value, { page: a.page });
          break;
        case "autofillThenHide":
          autofillThenHide(a.selector, a.value, { page: a.page });
          break;
        case "alert":
          addAlert({ anchor: a.anchor, position: a.position, id: a.id, html: a.html, ensureStyles: a.ensureStyles });
          break;
        default:
          if (typeof console !== "undefined") console.warn("[CheckoutKit] tipo de acci\xF3n desconocido:", a.type);
      }
    });
  }

  // src/core/presets.js
  var presets_exports = {};
  __export(presets_exports, {
    ensurePolicyStyles: () => ensurePolicyStyles,
    policyAlert: () => policyAlert
  });
  var ICONS_HREF = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css";
  var STYLE_ID = "js-checkout-kit-policy-styles";
  function ensurePolicyStyles() {
    if (!document.querySelector('link[href="' + ICONS_HREF + '"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = ICONS_HREF;
      document.head.appendChild(link);
    }
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = [
        ".js-ck-wrap { max-width: 500px; margin: 0 auto; }",
        ".js-ck-alert { border: 1px solid #eee; background: #fcfcfc; color: #444; border-radius: 8px; padding: 12px 16px; text-align: center; }",
        ".js-ck-title { font-size: .875rem; font-weight: 700; color: #222; margin-bottom: 4px; }",
        ".js-ck-body  { font-size: .875rem; margin-bottom: 8px; }",
        ".js-ck-link  { font-size: .75rem; color: #888; text-decoration: none; transition: opacity .2s; }",
        ".js-ck-link:hover { opacity: .7; text-decoration: underline; }"
      ].join("\n");
      document.head.appendChild(style);
    }
  }
  function policyAlert(o) {
    o = o || {};
    const title = o.title || "Cambios hasta 30 d\xEDas";
    const body = o.body || "V\xE1lido para productos <strong>sellados, con celof\xE1n original y sin uso.</strong>";
    const link = o.link || "#";
    const linkText = o.linkText || "Revisar derecho a retracto y pol\xEDticas";
    return {
      ensureStyles: ensurePolicyStyles,
      html: '<div class="js-ck-wrap"><div class="js-ck-alert" role="alert"><div class="js-ck-title"><i class="bi bi-info-circle" style="margin-right:4px;"></i>' + title + '</div><p class="js-ck-body">' + body + '</p><div style="padding-top:8px;border-top:1px solid #eee;"><a class="js-ck-link" href="' + link + '" target="_blank" rel="noopener">' + linkText + ' <i class="bi bi-box-arrow-up-right" style="margin-left:2px;"></i></a></div></div></div>'
    };
  }

  // src/index.js
  window.CheckoutKit = {
    run,
    hide,
    autofill,
    autofillThenHide,
    addAlert,
    onChange,
    presets: presets_exports
  };
})();
