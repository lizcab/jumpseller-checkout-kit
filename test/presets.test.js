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
