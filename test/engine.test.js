// test/engine.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createEngine } from '../src/core/engine.js';

beforeEach(() => { document.body.innerHTML = ''; });
afterEach(() => { delete window.__JS_CHECKOUT_KIT__; });

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

  it('register + start con el motor corriendo aplica la acción una sola vez (no doble apply)', () => {
    const eng = createEngine({ skipGuards: true });
    eng.start();
    let runs = 0;
    eng.register(() => { runs++; });  // started → apply una vez
    eng.start();                       // started → noop, NO re-apply
    expect(runs).toBe(1);
    eng.stop();
  });

  it('una segunda instancia no monta otro observer (guard de namespace en window)', () => {
    delete window.__JS_CHECKOUT_KIT__;
    const a = createEngine();          // guards activos; la URL de jsdom contiene v2/checkout
    expect(a.start()).toBe(true);
    const b = createEngine();
    expect(b.start()).toBe(false);     // bloqueada por el namespace
    a.stop();                          // limpia el flag de namespace
  });
});
