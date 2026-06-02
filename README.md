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
    { type: 'autofillThenHide', selector: '#city', value: 'Santiago' },
    { type: 'hide', selector: '.form-group:has(#complement)' }
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
