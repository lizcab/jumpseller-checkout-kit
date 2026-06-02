// test/actions.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { onPage, makeHide, makeAutofill, makeAlert, makeAutofillThenHide } from '../src/core/actions.js';

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
