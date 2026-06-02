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

// alert: inserta un bloque HTML una sola vez (dedup por id), antes/después de un ancla.
export function makeAlert({ anchor, position = 'before', id, html, ensureStyles }) {
  return function () {
    if (id && document.getElementById(id)) return;
    const anchorEl = document.querySelector(anchor);
    if (!anchorEl || !anchorEl.parentNode) return;
    if (typeof ensureStyles === 'function') ensureStyles();
    const tpl = document.createElement('template');
    tpl.innerHTML = String(html).trim();
    const node = tpl.content.firstElementChild;
    if (!node) return;
    if (id && !node.id) node.id = id;
    if (position === 'after') {
      anchorEl.parentNode.insertBefore(node, anchorEl.nextSibling);
    } else {
      anchorEl.parentNode.insertBefore(node, anchorEl);
    }
  };
}

// autofillThenHide: rellena una vez y luego mantiene el campo oculto. El orden
// importa: el valor entra al estado de React antes de ocultar.
export function makeAutofillThenHide({ selector, value, page }) {
  const fill = makeAutofill({ selector, value, page });
  const hide = makeHide({ selector, page });
  return function () {
    fill();
    hide();
  };
}
