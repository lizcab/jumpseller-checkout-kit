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
