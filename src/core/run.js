import { hide, autofill, autofillThenHide, addAlert } from './api.js';

// Traduce el array declarativo a llamadas de la API imperativa.
export function run(actions) {
  if (!Array.isArray(actions)) return;
  actions.forEach(function (a) {
    switch (a.type) {
      case 'hide':
        hide(a.selector, { page: a.page }); break;
      case 'autofill':
        autofill(a.selector, a.value, { page: a.page }); break;
      case 'autofillThenHide':
        autofillThenHide(a.selector, a.value, { page: a.page }); break;
      case 'alert':
        addAlert({ anchor: a.anchor, position: a.position, id: a.id, html: a.html, ensureStyles: a.ensureStyles }); break;
      default:
        if (typeof console !== 'undefined') console.warn('[CheckoutKit] tipo de acción desconocido:', a.type);
    }
  });
}
