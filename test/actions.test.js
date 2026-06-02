// test/actions.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { onPage, makeHide, makeAutofill } from '../src/core/actions.js';

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
