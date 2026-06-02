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
