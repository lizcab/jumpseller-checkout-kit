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
