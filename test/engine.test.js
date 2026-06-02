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
