# Catálogo de campos del checkout — recetas

Cada campo del checkout v2 de Jumpseller con su selector y el snippet listo para
cada acción. Copia la entrada que necesites dentro del array de `CheckoutKit.run([...])`.

## Anclas confirmadas

| Elemento            | Selector             | Notas                                  |
|---------------------|----------------------|----------------------------------------|
| Paso de información | `#information-page`  | Úsalo como `page` para scoping         |
| Botón confirmar     | `#save_place_order`  | Ancla típica para alertas (`before`)   |

## Acciones por campo

> Pendiente de completar con el HTML real del checkout. Formato de cada fila:

| Campo  | Selector            | Ocultar | Autocompletar | Autocompletar+Ocultar | Alerta |
|--------|---------------------|---------|---------------|------------------------|--------|
| Ciudad | `#checkout_city` *  | ✓       | ✓             | ✓                      | —      |

\* Selector tentativo — confirmar contra el HTML real.

### Snippets

**Ocultar un campo**
```js
{ type: 'hide', selector: '#checkout_company', page: '#information-page' }
```

**Autocompletar (una vez; respeta edición del usuario)**
```js
{ type: 'autofill', selector: '#checkout_city', value: 'Santiago' }
// value dinámico:
{ type: 'autofill', selector: '#checkout_city', value: () => 'Santiago' }
```

**Autocompletar y luego ocultar**
```js
{ type: 'autofillThenHide', selector: '#checkout_city', value: 'Santiago' }
```

**Alerta arriba del botón confirmar (con preset de política)**
```js
Object.assign(
  { type: 'alert', anchor: '#save_place_order', position: 'before', id: 'policy_v1' },
  CheckoutKit.presets.policyAlert({ link: 'https://mitienda.cl/refund-policy' })
)
```

**Alerta con HTML propio (debajo de un ancla)**
```js
{ type: 'alert', anchor: '#save_place_order', position: 'after', id: 'envio_v1',
  html: '<div style="text-align:center">Envío gratis sobre $30.000</div>' }
```

## Cómo agregar un campo nuevo
1. Inspecciona el checkout real y copia el selector estable del campo.
2. Agrega una fila a la tabla con los ✓ de las acciones soportadas.
3. Si necesitas un snippet especial, documéntalo bajo "Snippets".
