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
