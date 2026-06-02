import { run } from './core/run.js';
import { hide, autofill, autofillThenHide, addAlert, onChange } from './core/api.js';
import * as presets from './core/presets.js';

window.CheckoutKit = {
  run: run,
  hide: hide,
  autofill: autofill,
  autofillThenHide: autofillThenHide,
  addAlert: addAlert,
  onChange: onChange,
  presets: presets
};
