# Catálogo de campos del checkout — recetas

Cada campo del checkout v2 de Jumpseller con su selector real y el snippet listo
para cada acción. Copia la entrada que necesites dentro del array de
`CheckoutKit.run([...])`.

> **⚠️ Requisito:** selectores verificados contra el checkout **vertical de una
> sola página** (`/v2/checkout/vertical/`), que monta TODAS las secciones en el
> mismo DOM a la vez. En el checkout **por pasos (multipágina)** los campos
> aparecen/desaparecen al navegar y estos selectores y comportamientos **pueden
> no coincidir**. Usa el `id` de sección como `page` para scoping.

## Anclas / secciones (para scoping con `page`)

| Sección                       | Selector            | Contenido                                  |
|-------------------------------|---------------------|--------------------------------------------|
| Información (contacto + envío) | `#information-page` | email, teléfono, nombre, dirección, ciudad |
| Métodos de envío              | `#shipping-page`    | opciones de despacho                       |
| Facturación                   | `#billing-page`     | RUT, "facturación = envío"                 |
| Pago                          | `#payment-page`     | métodos de pago                            |
| Botón confirmar               | `#save_place_order` | ancla típica para alertas (`before`)       |

## Campos — inputs nativos (hide / autofill / autofillThenHide funcionan)

| Campo                   | Selector                  | Tipo      | Hide | Autofill | Autofill+Hide |
|-------------------------|---------------------------|-----------|:----:|:--------:|:-------------:|
| E-mail                  | `#email`                  | input     | ✓    | ✓        | ✓             |
| Teléfono                | `#phone`                  | input tel | ✓    | ✓        | ✓             |
| Nombre                  | `#name`                   | input     | ✓    | ✓        | ✓             |
| Apellidos               | `#surname`                | input     | ✓    | ✓        | ✓             |
| Ciudad                  | `#city`                   | input     | ✓    | ✓        | ✓             |
| Dirección               | `#address`                | input     | ✓    | ✓        | ✓             |
| Depto/casa (complemento)| `#complement`             | input     | ✓    | ✓        | ✓             |
| Instrucciones especiales| `#additional_information` | textarea  | ✓    | ✓        | ✓             |
| RUT                     | `#taxid`                  | input     | ✓    | ✓        | ✓             |

## Campos especiales — leer antes de usar

| Campo                | Selector                                      | Hide | Autofill | Nota |
|----------------------|-----------------------------------------------|:----:|:--------:|------|
| Región / Estado      | `#region` (input interno `#react-select-2-input`) | ✓ | ✗ | **react-select**, no `<select>` nativo |
| Comuna               | `#municipality` (input interno `#react-select-3-input`) | ✓ | ✗ | **react-select**, no `<select>` nativo |
| Prefijo país (tel)   | `#prefix` / botón `#rfs-btn`                   | ✓    | ✗        | dropdown de banderas (react) |
| Método de entrega    | `#radio_delivery`, `#radio_store_pickup`, `#radio_point_pickup` | ✓ | — | radios |
| Método de pago       | `#payment-page input.radioOp` (values `1297404` Stripe, `1420285` Webpay) | ✓ | — | radios |
| Facturación = envío  | `#billing-page input[type="checkbox"]`        | ✓    | —        | checkbox sin id |

> **⚠️ Región y Comuna NO se pueden autocompletar con `autofill`.** Son
> componentes **react-select**: rellenar su input de texto interno NO selecciona
> la opción (react-select ignora cambios externos al value). El `autofill`/
> `autofillThenHide` del kit solo sirve para inputs/textarea/select nativos.
> Para estos, lo viable es **ocultarlos** (`hide`), no autocompletarlos.

## Snippets

**Ocultar la fila completa de un campo (label + input)**

Ocultar solo el input por su `id` deja huérfana la etiqueta flotante. Para ocultar
toda la fila, apunta al wrapper con `:has()` (lo soporta el kit sin cambios):

```js
{ type: 'hide', selector: '.form-group:has(#city)', page: '#information-page' }
// nombre/apellidos no están en .form-group, usa el wrapper más cercano:
{ type: 'hide', selector: '.floating-label-wrap:has(#name)' }
```

**Autocompletar (una vez; respeta la edición del usuario)**
```js
{ type: 'autofill', selector: '#city', value: 'Santiago' }
// value dinámico:
{ type: 'autofill', selector: '#city', value: () => 'Santiago' }
```
> Si el campo ya trae un valor (el checkout a veces pre-rellena `#city`), el
> `autofill` lo respeta y no lo pisa.

**Autocompletar y luego ocultar** (el caso "ciudad fija")
```js
// oculta solo el input:
{ type: 'autofillThenHide', selector: '#city', value: 'Santiago' }
// para ocultar también la etiqueta, combina autofill + hide del wrapper:
{ type: 'autofill', selector: '#city', value: 'Santiago' },
{ type: 'hide', selector: '.form-group:has(#city)' }
```

**Alerta arriba del botón confirmar (preset de política — caso Sairam)**
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
1. Inspecciona el checkout real y copia el `id` estable del campo (los inputs
   nativos tienen `id` propio; los dropdowns son react-select — ver arriba).
2. Agrega una fila a la tabla correspondiente (nativo vs especial).
3. Si necesitas ocultar la fila completa, usa el patrón `wrapper:has(#id)`.
