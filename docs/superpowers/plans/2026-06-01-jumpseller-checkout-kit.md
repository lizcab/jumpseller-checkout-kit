# Jumpseller Checkout Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un framework reutilizable, distribuido por CDN, para personalizar el checkout v2 de Jumpseller (SPA React no modificable) vía tags Custom HTML de GTM: ocultar/autocompletar campos y agregar alertas.

**Architecture:** Tres capas. (1) Un motor genérico con UN `MutationObserver` compartido y un registro de acciones idempotentes. (2) Una API híbrida: nivel imperativo (`hide`/`autofill`/`addAlert`) sobre el que se construye un nivel declarativo (`run([...])`). (3) Un catálogo de recetas por campo. Toda la lógica frágil (timing, autofill seguro en React, idempotencia) vive aislada en módulos pequeños y testeables.

**Tech Stack:** JavaScript vanilla (módulos ES en `src/`), esbuild (bundle a IIFE para GTM + minificación), Vitest + jsdom (tests), jsDelivr (distribución).

---

## Estructura de archivos

```
src/
  core/
    react.js      # setNativeValue: autofill que React reconoce
    actions.js    # factories de cierres idempotentes: makeHide/Autofill/Alert/AutofillThenHide + onPage
    engine.js     # createEngine: registro + observer compartido + lifecycle; singleton `engine`
    api.js        # API imperativa (hide/autofill/autofillThenHide/addAlert/onChange) sobre el singleton
    run.js        # dispatcher declarativo: traduce objetos {type,...} a llamadas de la API
    presets.js    # policyAlert + ensurePolicyStyles (estilos del bloque de Sairam)
  index.js        # ensambla window.CheckoutKit
test/
  react.test.js
  actions.test.js
  engine.test.js
  run.test.js
  presets.test.js
dist/
  checkout-kit.js / checkout-kit.min.js   # generados por el build
docs/
  FIELD-CATALOG.md
  stores/sairam.md
examples/
  gtm-tag.html
  mock-checkout.html
package.json · vitest.config.js · README.md
```

Cada módulo tiene una responsabilidad. `actions.js` es DOM puro y no conoce el motor (testeable contra jsdom). `api.js` conecta acciones al singleton. `run.js` solo despacha por tipo.

---

## Task 1: Scaffold del proyecto

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "jumpseller-checkout-kit",
  "version": "0.1.0",
  "description": "Personalizaciones del checkout v2 de Jumpseller vía GTM Custom HTML",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "build": "esbuild src/index.js --bundle --format=iife --outfile=dist/checkout-kit.js && esbuild src/index.js --bundle --format=iife --minify --outfile=dist/checkout-kit.min.js"
  },
  "devDependencies": {
    "esbuild": "^0.21.0",
    "jsdom": "^24.0.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Crear `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'https://tienda.example/v2/checkout' }
    }
  }
});
```

- [ ] **Step 3: Instalar dependencias**

Run: `npm install`
Expected: crea `node_modules/` y `package-lock.json` sin errores.

- [ ] **Step 4: Verificar que Vitest corre (sin tests aún)**

Run: `npm test`
Expected: Vitest arranca y reporta "No test files found" (o exit 0). No debe fallar por config.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.js
git commit -m "chore: scaffold del proyecto (vitest + esbuild)"
```

---

## Task 2: `react.js` — autofill seguro en React

**Files:**
- Create: `src/core/react.js`
- Test: `test/react.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
// test/react.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { setNativeValue } from '../src/core/react.js';

describe('setNativeValue', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('asigna el valor y dispara el evento input en un <input>', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    let fired = null;
    input.addEventListener('input', (e) => { fired = e; });

    setNativeValue(input, 'Santiago');

    expect(input.value).toBe('Santiago');
    expect(fired).not.toBeNull();
    expect(fired.bubbles).toBe(true);
  });

  it('usa el evento change en un <select>', () => {
    const select = document.createElement('select');
    const opt = document.createElement('option');
    opt.value = 'RM'; select.appendChild(opt);
    document.body.appendChild(select);
    let fired = null;
    select.addEventListener('change', (e) => { fired = e; });

    setNativeValue(select, 'RM');

    expect(select.value).toBe('RM');
    expect(fired).not.toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run test/react.test.js`
Expected: FAIL — "Failed to resolve import '../src/core/react.js'" o "setNativeValue is not a function".

- [ ] **Step 3: Implementar `src/core/react.js`**

```js
// Asigna un valor a un campo controlado por React de forma que el value tracker
// interno de React lo reconozca, y luego dispara el evento que React escucha.
export function setNativeValue(el, value) {
  const proto =
    el.tagName === 'SELECT'   ? window.HTMLSelectElement.prototype :
    el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype :
                                window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(el, value);
  const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
  el.dispatchEvent(new Event(eventType, { bubbles: true }));
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run test/react.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/react.js test/react.test.js
git commit -m "feat: setNativeValue para autofill seguro en React"
```

---

## Task 3: `actions.js` — `onPage` + `makeHide`

**Files:**
- Create: `src/core/actions.js`
- Test: `test/actions.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
// test/actions.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { onPage, makeHide } from '../src/core/actions.js';

beforeEach(() => { document.body.innerHTML = ''; });

describe('onPage', () => {
  it('true cuando no se pide scoping', () => {
    expect(onPage(undefined)).toBe(true);
  });
  it('refleja la presencia del elemento de página', () => {
    expect(onPage('#information-page')).toBe(false);
    document.body.innerHTML = '<div id="information-page"></div>';
    expect(onPage('#information-page')).toBe(true);
  });
});

describe('makeHide', () => {
  it('oculta los elementos que matchean y es idempotente', () => {
    document.body.innerHTML = '<input id="f" />';
    const hide = makeHide({ selector: '#f' });
    hide();
    expect(document.querySelector('#f').style.display).toBe('none');
    hide(); // re-aplicar no rompe
    expect(document.querySelector('#f').style.display).toBe('none');
  });

  it('respeta el scoping por page', () => {
    document.body.innerHTML = '<input id="f" />';
    const hide = makeHide({ selector: '#f', page: '#information-page' });
    hide();
    expect(document.querySelector('#f').style.display).toBe('');
    document.body.innerHTML = '<div id="information-page"></div><input id="f" />';
    hide();
    expect(document.querySelector('#f').style.display).toBe('none');
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run test/actions.test.js`
Expected: FAIL — import no resuelve / `makeHide is not a function`.

- [ ] **Step 3: Implementar `src/core/actions.js` (parcial: onPage + makeHide)**

```js
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
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run test/actions.test.js`
Expected: PASS (onPage + makeHide).

- [ ] **Step 5: Commit**

```bash
git add src/core/actions.js test/actions.test.js
git commit -m "feat: onPage + makeHide (acción idempotente con scoping)"
```

---

## Task 4: `makeAutofill`

**Files:**
- Modify: `src/core/actions.js`
- Test: `test/actions.test.js`

- [ ] **Step 1: Agregar el test que falla**

Añadir a `test/actions.test.js`:

```js
import { onPage, makeHide, makeAutofill } from '../src/core/actions.js';

describe('makeAutofill', () => {
  it('rellena el campo una sola vez y dispara input', () => {
    document.body.innerHTML = '<input id="city" />';
    const fill = makeAutofill({ selector: '#city', value: 'Santiago' });
    fill();
    expect(document.querySelector('#city').value).toBe('Santiago');

    // si el usuario edita, un segundo apply NO lo pisa
    document.querySelector('#city').value = 'Valpo';
    fill();
    expect(document.querySelector('#city').value).toBe('Valpo');
  });

  it('acepta value como función', () => {
    document.body.innerHTML = '<input id="city" />';
    const fill = makeAutofill({ selector: '#city', value: () => 'Calc' });
    fill();
    expect(document.querySelector('#city').value).toBe('Calc');
  });

  it('no hace nada si el campo aún no existe', () => {
    const fill = makeAutofill({ selector: '#missing', value: 'x' });
    expect(() => fill()).not.toThrow();
  });
});
```

Actualizar el `import` existente para incluir `makeAutofill`.

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run test/actions.test.js`
Expected: FAIL — `makeAutofill is not a function`.

- [ ] **Step 3: Agregar `makeAutofill` a `src/core/actions.js`**

```js
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
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run test/actions.test.js`
Expected: PASS (incluye los 3 nuevos).

- [ ] **Step 5: Commit**

```bash
git add src/core/actions.js test/actions.test.js
git commit -m "feat: makeAutofill (rellena una vez, respeta edición del usuario)"
```

---

## Task 5: `makeAlert`

**Files:**
- Modify: `src/core/actions.js`
- Test: `test/actions.test.js`

- [ ] **Step 1: Agregar el test que falla**

Añadir a `test/actions.test.js` (y agregar `makeAlert` al import):

```js
describe('makeAlert', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="page"><button id="btn">OK</button></div>';
  });

  it('inserta antes del ancla y deduplica por id', () => {
    const alert = makeAlert({ anchor: '#btn', position: 'before', id: 'a1', html: '<div class="blk">hola</div>' });
    alert();
    const node = document.getElementById('a1');
    expect(node).not.toBeNull();
    expect(node.nextElementSibling.id).toBe('btn'); // quedó antes del botón
    alert(); // segundo apply no duplica
    expect(document.querySelectorAll('.blk').length).toBe(1);
  });

  it('inserta después cuando position=after', () => {
    const alert = makeAlert({ anchor: '#btn', position: 'after', id: 'a2', html: '<div>x</div>' });
    alert();
    expect(document.getElementById('btn').nextElementSibling.id).toBe('a2');
  });

  it('llama ensureStyles antes de insertar', () => {
    let called = 0;
    const alert = makeAlert({ anchor: '#btn', id: 'a3', html: '<div>x</div>', ensureStyles: () => { called++; } });
    alert();
    expect(called).toBe(1);
  });

  it('no hace nada si el ancla no existe', () => {
    const alert = makeAlert({ anchor: '#nope', id: 'a4', html: '<div>x</div>' });
    expect(() => alert()).not.toThrow();
    expect(document.getElementById('a4')).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run test/actions.test.js`
Expected: FAIL — `makeAlert is not a function`.

- [ ] **Step 3: Agregar `makeAlert` a `src/core/actions.js`**

```js
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
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run test/actions.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/actions.js test/actions.test.js
git commit -m "feat: makeAlert (inserta antes/después, dedup por id)"
```

---

## Task 6: `makeAutofillThenHide`

**Files:**
- Modify: `src/core/actions.js`
- Test: `test/actions.test.js`

- [ ] **Step 1: Agregar el test que falla**

Añadir a `test/actions.test.js` (y `makeAutofillThenHide` al import):

```js
describe('makeAutofillThenHide', () => {
  it('rellena una vez y deja el campo oculto', () => {
    document.body.innerHTML = '<input id="city" />';
    const action = makeAutofillThenHide({ selector: '#city', value: 'Santiago' });
    action();
    const el = document.querySelector('#city');
    expect(el.value).toBe('Santiago');
    expect(el.style.display).toBe('none');
    action(); // idempotente
    expect(el.value).toBe('Santiago');
    expect(el.style.display).toBe('none');
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run test/actions.test.js`
Expected: FAIL — `makeAutofillThenHide is not a function`.

- [ ] **Step 3: Agregar `makeAutofillThenHide` a `src/core/actions.js`**

```js
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
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run test/actions.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/actions.js test/actions.test.js
git commit -m "feat: makeAutofillThenHide (compone autofill + hide)"
```

---

## Task 7: `engine.js` — registro + observer compartido + lifecycle

**Files:**
- Create: `src/core/engine.js`
- Test: `test/engine.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
// test/engine.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { createEngine } from '../src/core/engine.js';

beforeEach(() => { document.body.innerHTML = ''; });

describe('createEngine', () => {
  it('apply() ejecuta todas las acciones registradas', () => {
    const eng = createEngine({ skipGuards: true });
    let a = 0, b = 0;
    eng.register(() => { a++; });
    eng.register(() => { b++; });
    eng.apply();
    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  it('una acción que lanza no rompe a las demás', () => {
    const eng = createEngine({ skipGuards: true });
    let ok = 0;
    eng.register(() => { throw new Error('boom'); });
    eng.register(() => { ok++; });
    expect(() => eng.apply()).not.toThrow();
    expect(ok).toBe(1);
  });

  it('start() respeta el guard de URL', () => {
    const eng = createEngine({ urlMatch: 'no-match-zzz' });
    expect(eng.start()).toBe(false);
  });

  it('start() corre apply una vez y reacciona a mutaciones del DOM', async () => {
    const eng = createEngine({ skipGuards: true, debounceMs: 5 });
    let runs = 0;
    eng.register(() => { runs++; });
    eng.start();
    expect(runs).toBe(1); // apply inmediato
    document.body.appendChild(document.createElement('div')); // dispara el observer
    await new Promise((r) => setTimeout(r, 30));
    expect(runs).toBeGreaterThanOrEqual(2);
    eng.stop();
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run test/engine.test.js`
Expected: FAIL — `createEngine is not a function`.

- [ ] **Step 3: Implementar `src/core/engine.js`**

```js
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
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run test/engine.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/engine.js test/engine.test.js
git commit -m "feat: motor con observer compartido, idempotencia y guards"
```

---

## Task 8: `api.js` — API imperativa sobre el singleton

**Files:**
- Create: `src/core/api.js`

(No lleva test propio: es cableado fino entre `actions.js` y el singleton `engine`, ya cubiertos. Su comportamiento se ejercita vía `run.js` en Task 9 y el mock manual en Task 13.)

- [ ] **Step 1: Implementar `src/core/api.js`**

```js
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
```

- [ ] **Step 2: Verificar que el módulo importa sin errores**

Run: `node --input-type=module -e "import('./src/core/api.js').then(m=>console.log(Object.keys(m).join(',')))"`
Expected: imprime `hide,autofill,autofillThenHide,addAlert,onChange` (en jsdom-less node el import resuelve; las funciones no se ejecutan, así que no tocan `window`).

> Nota: si el paso anterior falla por referencia a `window` en import-time, es un bug — `engine.js` solo toca `window` dentro de `start()`, no al cargar. No debería fallar.

- [ ] **Step 3: Commit**

```bash
git add src/core/api.js
git commit -m "feat: API imperativa (hide/autofill/autofillThenHide/addAlert/onChange)"
```

---

## Task 9: `run.js` — dispatcher declarativo

**Files:**
- Create: `src/core/run.js`
- Test: `test/run.test.js`

- [ ] **Step 1: Escribir el test que falla (mockeando la API)**

```js
// test/run.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/core/api.js', () => ({
  hide: vi.fn(),
  autofill: vi.fn(),
  autofillThenHide: vi.fn(),
  addAlert: vi.fn(),
  onChange: vi.fn()
}));

import { run } from '../src/core/run.js';
import * as api from '../src/core/api.js';

beforeEach(() => { vi.clearAllMocks(); });

describe('run', () => {
  it('despacha cada tipo a la función correcta', () => {
    run([
      { type: 'hide', selector: '#a', page: '#p' },
      { type: 'autofill', selector: '#b', value: 'X' },
      { type: 'autofillThenHide', selector: '#c', value: 'Y' },
      { type: 'alert', anchor: '#d', position: 'after', id: 'i', html: '<i></i>' }
    ]);
    expect(api.hide).toHaveBeenCalledWith('#a', { page: '#p' });
    expect(api.autofill).toHaveBeenCalledWith('#b', 'X', { page: undefined });
    expect(api.autofillThenHide).toHaveBeenCalledWith('#c', 'Y', { page: undefined });
    expect(api.addAlert).toHaveBeenCalledWith({ anchor: '#d', position: 'after', id: 'i', html: '<i></i>', ensureStyles: undefined });
  });

  it('ignora entradas sin array y no lanza con tipos desconocidos', () => {
    expect(() => run(null)).not.toThrow();
    expect(() => run([{ type: 'nope' }])).not.toThrow();
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run test/run.test.js`
Expected: FAIL — `run is not a function`.

- [ ] **Step 3: Implementar `src/core/run.js`**

```js
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
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run test/run.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/run.js test/run.test.js
git commit -m "feat: run() despacha el array declarativo a la API"
```

---

## Task 10: `presets.js` — `policyAlert` (caso Sairam como receta)

**Files:**
- Create: `src/core/presets.js`
- Test: `test/presets.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
// test/presets.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { policyAlert, ensurePolicyStyles } from '../src/core/presets.js';

beforeEach(() => { document.head.innerHTML = ''; document.body.innerHTML = ''; });

describe('policyAlert', () => {
  it('devuelve html y ensureStyles, con los valores provistos', () => {
    const p = policyAlert({ title: 'T', body: 'B', link: 'https://x/y', linkText: 'L' });
    expect(typeof p.html).toBe('string');
    expect(typeof p.ensureStyles).toBe('function');
    expect(p.html).toContain('T');
    expect(p.html).toContain('B');
    expect(p.html).toContain('https://x/y');
    expect(p.html).toContain('L');
  });

  it('usa textos por defecto si no se pasan', () => {
    const p = policyAlert();
    expect(p.html).toContain('Cambios hasta 30 días');
  });
});

describe('ensurePolicyStyles', () => {
  it('inyecta el link de iconos y el <style> una sola vez', () => {
    ensurePolicyStyles();
    ensurePolicyStyles();
    expect(document.querySelectorAll('style#js-checkout-kit-policy-styles').length).toBe(1);
    expect(document.querySelectorAll('link[href*="bootstrap-icons"]').length).toBe(1);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run test/presets.test.js`
Expected: FAIL — import no resuelve.

- [ ] **Step 3: Implementar `src/core/presets.js`**

```js
const ICONS_HREF = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css';
const STYLE_ID = 'js-checkout-kit-policy-styles';

export function ensurePolicyStyles() {
  if (!document.querySelector('link[href="' + ICONS_HREF + '"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = ICONS_HREF;
    document.head.appendChild(link);
  }
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.js-ck-wrap { max-width: 500px; margin: 0 auto; }',
      '.js-ck-alert { border: 1px solid #eee; background: #fcfcfc; color: #444; border-radius: 8px; padding: 12px 16px; text-align: center; }',
      '.js-ck-title { font-size: .875rem; font-weight: 700; color: #222; margin-bottom: 4px; }',
      '.js-ck-body  { font-size: .875rem; margin-bottom: 8px; }',
      '.js-ck-link  { font-size: .75rem; color: #888; text-decoration: none; transition: opacity .2s; }',
      '.js-ck-link:hover { opacity: .7; text-decoration: underline; }'
    ].join('\n');
    document.head.appendChild(style);
  }
}

// Bloque informativo de política (generaliza el caso Sairam). Devuelve {html, ensureStyles}
// pensado para esparcirse dentro de una acción 'alert'.
export function policyAlert(o) {
  o = o || {};
  const title = o.title || 'Cambios hasta 30 días';
  const body = o.body || 'Válido para productos <strong>sellados, con celofán original y sin uso.</strong>';
  const link = o.link || '#';
  const linkText = o.linkText || 'Revisar derecho a retracto y políticas';
  return {
    ensureStyles: ensurePolicyStyles,
    html:
      '<div class="js-ck-wrap"><div class="js-ck-alert" role="alert">' +
        '<div class="js-ck-title"><i class="bi bi-info-circle" style="margin-right:4px;"></i>' + title + '</div>' +
        '<p class="js-ck-body">' + body + '</p>' +
        '<div style="padding-top:8px;border-top:1px solid #eee;">' +
          '<a class="js-ck-link" href="' + link + '" target="_blank" rel="noopener">' + linkText +
          ' <i class="bi bi-box-arrow-up-right" style="margin-left:2px;"></i></a>' +
        '</div>' +
      '</div></div>'
  };
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run test/presets.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/presets.js test/presets.test.js
git commit -m "feat: preset policyAlert (caso Sairam como receta reutilizable)"
```

---

## Task 11: `index.js` — ensamblar `window.CheckoutKit`

**Files:**
- Create: `src/index.js`

- [ ] **Step 1: Implementar `src/index.js`**

```js
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
```

- [ ] **Step 2: Correr toda la suite de tests (regresión)**

Run: `npm test`
Expected: PASS — todos los tests de las tareas 2–10 verdes.

- [ ] **Step 3: Commit**

```bash
git add src/index.js
git commit -m "feat: expone window.CheckoutKit (API pública)"
```

---

## Task 12: Build con esbuild

**Files:**
- (genera) `dist/checkout-kit.js`, `dist/checkout-kit.min.js`

- [ ] **Step 1: Correr el build**

Run: `npm run build`
Expected: crea `dist/checkout-kit.js` y `dist/checkout-kit.min.js` sin errores.

- [ ] **Step 2: Verificar que el bundle es un IIFE y define CheckoutKit**

Run: `node -e "const s=require('fs').readFileSync('dist/checkout-kit.js','utf8'); if(!/window\.CheckoutKit/.test(s)) throw new Error('falta CheckoutKit'); if(!/^\(\(\)|^\(function|^\(\(\)=>/.test(s.trim())) console.log('aviso: revisar wrapper IIFE'); console.log('OK', s.length, 'bytes');"`
Expected: imprime `OK <n> bytes`. El bundle contiene `window.CheckoutKit`.

- [ ] **Step 3: Commit (incluyendo dist para que jsDelivr lo sirva)**

```bash
git add dist/checkout-kit.js dist/checkout-kit.min.js
git commit -m "build: dist inicial servible por jsDelivr"
```

> Decisión: versionamos `dist/` en el repo porque jsDelivr sirve archivos del repo por tag de git (no hace build). El despliegue a tiendas se hace con un tag (`git tag v1 && git push --tags`) y pin en la URL del CDN.

---

## Task 13: Ejemplos — mock de checkout y plantilla de GTM

**Files:**
- Create: `examples/mock-checkout.html`
- Create: `examples/gtm-tag.html`

- [ ] **Step 1: Crear `examples/mock-checkout.html`**

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Mock checkout — Checkout Kit</title>
</head>
<body>
  <!-- Simula el paso de información del checkout v2 -->
  <div id="information-page">
    <label>Ciudad <input id="checkout_city" /></label><br />
    <label>Empresa <input id="checkout_company" /></label><br />
    <button id="save_place_order">Confirmar pedido</button>
  </div>

  <hr />
  <button id="rerender">Simular re-render de React (quita y repone el form)</button>

  <!-- En producción esto sería el bundle del CDN; aquí cargamos el build local -->
  <script src="../dist/checkout-kit.js"></script>
  <script>
    // Engaña el guard de URL para poder probar en local.
    history.replaceState(null, '', location.pathname + '?p=/v2/checkout');

    CheckoutKit.run([
      { type: 'autofillThenHide', selector: '#checkout_city', value: 'Santiago' },
      { type: 'hide', selector: '#checkout_company', page: '#information-page' },
      Object.assign(
        { type: 'alert', anchor: '#save_place_order', position: 'before', id: 'policy_v1' },
        CheckoutKit.presets.policyAlert({ link: 'https://sairam.cl/refund-policy' })
      )
    ]);

    // Botón para verificar idempotencia: tras re-render, el observer reaplica todo.
    document.getElementById('rerender').addEventListener('click', function () {
      const page = document.getElementById('information-page');
      const clone = page.cloneNode(true);
      page.replaceWith(clone);
    });
  </script>
</body>
</html>
```

> El guard real busca `v2/checkout` en `location.href`; el `replaceState` con `?p=/v2/checkout` lo satisface en local sin tocar el código del motor.

- [ ] **Step 2: Crear `examples/gtm-tag.html` (plantilla para pegar en GTM)**

```html
<!-- Pegar como tag "Custom HTML" en GTM. Reemplazar <usuario> y el tag de versión. -->
<script src="https://cdn.jsdelivr.net/gh/aatronco/jumpseller-checkout-kit@v1/dist/checkout-kit.min.js"></script>
<script>
  (function () {
    if (!window.CheckoutKit) return;
    CheckoutKit.run([
      // --- acciones de ESTA tienda ---
      { type: 'autofillThenHide', selector: '#checkout_city', value: 'Santiago' },
      Object.assign(
        { type: 'alert', anchor: '#save_place_order', position: 'before', id: 'policy_v1' },
        CheckoutKit.presets.policyAlert({ link: 'https://sairam.cl/refund-policy' })
      )
    ]);
  })();
</script>
```

- [ ] **Step 3: Verificación manual**

Abrir `examples/mock-checkout.html` en un navegador. Verificar:
1. El campo Ciudad queda con valor "Santiago" y oculto.
2. El campo Empresa queda oculto.
3. La alerta de política aparece arriba del botón Confirmar.
4. Al pulsar "Simular re-render", todo se vuelve a aplicar (la alerta no se duplica).

- [ ] **Step 4: Commit**

```bash
git add examples/mock-checkout.html examples/gtm-tag.html
git commit -m "docs: ejemplos (mock de checkout + plantilla de tag GTM)"
```

---

## Task 14: `FIELD-CATALOG.md` + config de Sairam

**Files:**
- Create: `docs/FIELD-CATALOG.md`
- Create: `docs/stores/sairam.md`

> **Input pendiente:** los selectores reales de cada campo del checkout v2 salen del HTML que entregará el usuario. Esta tarea deja el catálogo **completo para lo confirmado** (`#information-page`, `#save_place_order`, y el caso Sairam) más el formato exacto para agregar filas. Cuando llegue el HTML, se agregan filas siguiendo ese formato (no requiere tocar código del motor).

- [ ] **Step 1: Crear `docs/FIELD-CATALOG.md`**

```markdown
# Catálogo de campos del checkout — recetas

Cada campo del checkout v2 de Jumpseller con su selector y el snippet listo para
cada acción. Copia la entrada que necesites dentro del array de `CheckoutKit.run([...])`.

## Anclas confirmadas

| Elemento            | Selector             | Notas                                  |
|---------------------|----------------------|----------------------------------------|
| Paso de información | `#information-page`  | Úsalo como `page` para scoping         |
| Botón confirmar     | `#save_place_order`  | Ancla típica para alertas (`before`)   |

## Acciones por campo

> Pendiente de completar con el HTML real del checkout. Formato de cada fila:

| Campo  | Selector            | Ocultar | Autocompletar | Autocompletar+Ocultar | Alerta |
|--------|---------------------|---------|---------------|------------------------|--------|
| Ciudad | `#checkout_city` *  | ✓       | ✓             | ✓                      | —      |

\* Selector tentativo — confirmar contra el HTML real.

### Snippets

**Ocultar un campo**
```js
{ type: 'hide', selector: '#checkout_company', page: '#information-page' }
```

**Autocompletar (una vez; respeta edición del usuario)**
```js
{ type: 'autofill', selector: '#checkout_city', value: 'Santiago' }
// value dinámico:
{ type: 'autofill', selector: '#checkout_city', value: () => 'Santiago' }
```

**Autocompletar y luego ocultar**
```js
{ type: 'autofillThenHide', selector: '#checkout_city', value: 'Santiago' }
```

**Alerta arriba del botón confirmar (con preset de política)**
```js
Object.assign(
  { type: 'alert', anchor: '#save_place_order', position: 'before', id: 'policy_v1' },
  CheckoutKit.presets.policyAlert({ link: 'https://mitienda.cl/refund-policy' })
)
```

**Alerta con HTML propio (debajo de un ancla)**
```js
{ type: 'alert', anchor: '#save_place_order', position: 'after', id: 'envio_v1',
  html: '<div style="text-align:center">Envío gratis sobre $30.000</div>' }
```

## Cómo agregar un campo nuevo
1. Inspecciona el checkout real y copia el selector estable del campo.
2. Agrega una fila a la tabla con los ✓ de las acciones soportadas.
3. Si necesitas un snippet especial, documéntalo bajo "Snippets".
```

- [ ] **Step 2: Crear `docs/stores/sairam.md`**

```markdown
# Sairam (sairam.cl) — config del Checkout Kit

Tag Custom HTML en GTM. Pin de versión: `@v1`.

```html
<script src="https://cdn.jsdelivr.net/gh/aatronco/jumpseller-checkout-kit@v1/dist/checkout-kit.min.js"></script>
<script>
  (function () {
    if (!window.CheckoutKit) return;
    CheckoutKit.run([
      Object.assign(
        { type: 'alert', anchor: '#save_place_order', position: 'before', id: 'policy_v1' },
        CheckoutKit.presets.policyAlert({
          title: 'Cambios hasta 30 días',
          body: 'Válido para productos <strong>sellados, con celofán original y sin uso.</strong>',
          link: 'https://sairam.cl/refund-policy'
        })
      )
    ]);
  })();
</script>
```

Equivale al script original de Sairam, ahora como una receta del kit.
```

- [ ] **Step 3: Commit**

```bash
git add docs/FIELD-CATALOG.md docs/stores/sairam.md
git commit -m "docs: catálogo de campos + config de Sairam"
```

---

## Task 15: `README.md`

**Files:**
- Create: `README.md`

- [ ] **Step 1: Crear `README.md`**

```markdown
# Jumpseller Checkout Kit

Personaliza el checkout v2 de Jumpseller (SPA React, no modificable) inyectando
código vía tags **Custom HTML** de Google Tag Manager. Permite, por campo:
**ocultar**, **autocompletar**, **autocompletar-luego-ocultar** y agregar
**alertas**.

## Cómo funciona
Un único `MutationObserver` compartido reaplica acciones idempotentes en cada
re-render de React. Se distribuye por jsDelivr; cada tienda solo declara su
config en GTM.

## Uso (tag en GTM)
```html
<script src="https://cdn.jsdelivr.net/gh/aatronco/jumpseller-checkout-kit@v1/dist/checkout-kit.min.js"></script>
<script>
  CheckoutKit.run([
    { type: 'autofillThenHide', selector: '#checkout_city', value: 'Santiago' },
    { type: 'hide', selector: '#checkout_company' }
  ]);
</script>
```

Recetas por campo: ver [`docs/FIELD-CATALOG.md`](docs/FIELD-CATALOG.md).

## API
- `CheckoutKit.run(actions)` — array declarativo (`hide` / `autofill` / `autofillThenHide` / `alert`).
- `CheckoutKit.hide(selector, {page})`
- `CheckoutKit.autofill(selector, value, {page})` — `value`: string o función.
- `CheckoutKit.autofillThenHide(selector, value, {page})`
- `CheckoutKit.addAlert({anchor, position, id, html, ensureStyles})`
- `CheckoutKit.onChange(fn)` — callback en cada tick estabilizado.
- `CheckoutKit.presets.policyAlert({title, body, link, linkText})`

## Desarrollo
```bash
npm install
npm test          # Vitest + jsdom
npm run build     # genera dist/
```

## Despliegue
1. `npm run build` y commit de `dist/`.
2. `git tag v1.x.y && git push --tags`.
3. Actualizar el pin `@v1` en los tags de GTM cuando quieras propagar.

> Pin siempre a un tag, nunca a `@main`: jsDelivr cachea ~7 días y `@main`
> tocaría todas las tiendas en vivo sin control.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README con uso, API y despliegue"
```

---

## Cierre

- [ ] **Suite completa verde**

Run: `npm test`
Expected: todos los tests PASS.

- [ ] **Build final**

Run: `npm run build`
Expected: `dist/` regenerado.

- [ ] **Tag de versión inicial (cuando se decida publicar)**

```bash
git tag v1.0.0
git push origin main --tags
```
