import { engine } from './engine.js';
import { makeHide, makeAutofill, makeAlert, makeAutofillThenHide } from './actions.js';

function add(actionFn) {
  engine.register(actionFn);
  engine.start();
}

export function hide(selector, opts) {
  opts = opts || {};
  add(makeHide({ selector: selector, page: opts.page }));
}

export function autofill(selector, value, opts) {
  opts = opts || {};
  add(makeAutofill({ selector: selector, value: value, page: opts.page }));
}

export function autofillThenHide(selector, value, opts) {
  opts = opts || {};
  add(makeAutofillThenHide({ selector: selector, value: value, page: opts.page }));
}

export function addAlert(spec) {
  add(makeAlert(spec));
}

export function onChange(fn) {
  engine.register(fn);
  engine.start();
}
