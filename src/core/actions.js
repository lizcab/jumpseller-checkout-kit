import { setNativeValue } from './react.js';

// True si no se pide scoping, o si el elemento de página está presente.
export function onPage(page) {
  return !page || !!document.querySelector(page);
}

// hide: idempotente — re-oculta los elementos que matchean en cada apply.
export function makeHide({ selector, page }) {
  return function () {
    if (!onPage(page)) return;
    document.querySelectorAll(selector).forEach(function (el) {
      if (el.style.display !== 'none') el.style.display = 'none';
    });
  };
}

// autofill: rellena el campo exactamente una vez (respeta ediciones posteriores).
export function makeAutofill({ selector, value, page }) {
  let done = false;
  return function () {
    if (done || !onPage(page)) return;
    const el = document.querySelector(selector);
    if (!el) return;
    const v = typeof value === 'function' ? value() : value;
    setNativeValue(el, v);
    done = true;
  };
}
