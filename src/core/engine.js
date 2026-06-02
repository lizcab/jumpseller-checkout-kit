const URL_MATCH = 'v2/checkout';
const NAMESPACE = '__JS_CHECKOUT_KIT__';

export function createEngine(opts) {
  opts = opts || {};
  const urlMatch = opts.urlMatch !== undefined ? opts.urlMatch : URL_MATCH;
  const debounceMs = opts.debounceMs !== undefined ? opts.debounceMs : 80;
  const skipGuards = !!opts.skipGuards;

  const registry = [];
  let observer = null;
  let timer = null;
  let started = false;

  // Pausa el observer mientras escribimos para no auto-dispararnos en bucle.
  function apply() {
    if (observer) observer.disconnect();
    for (let i = 0; i < registry.length; i++) {
      try { registry[i](); } catch (e) { /* una acción mala no debe romper el resto */ }
    }
    if (observer) {
      observer.takeRecords();
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function register(fn) {
    registry.push(fn);
    if (started) apply(); // una acción nueva se aplica de inmediato si el motor ya corre
    return fn;
  }

  function start() {
    if (started) { apply(); return true; }
    if (!skipGuards) {
      if (urlMatch && window.location.href.indexOf(urlMatch) === -1) return false;
      window[NAMESPACE] = window[NAMESPACE] || {};
      if (window[NAMESPACE].started) return false; // otra instancia ya monta el observer
      window[NAMESPACE].started = true;
    }
    started = true;
    apply();
    observer = new MutationObserver(function () {
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
  }

  return { register, apply, start, stop };
}

export const engine = createEngine();
