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
