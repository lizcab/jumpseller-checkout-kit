# Jumpseller Checkout Kit — Diseño

**Fecha:** 2026-06-01
**Autor:** aatronco
**Estado:** Diseño aprobado, pendiente de plan de implementación

## Problema

El checkout v2 de Jumpseller es una SPA en React que no se puede modificar
directamente. La única vía de personalización es inyectar código vía Google Tag
Manager con tags de tipo **Custom HTML**.

Hoy existe un script puntual (tienda `sairam.cl`) que inserta un bloque
informativo de política de cambios antes del botón de confirmar pedido. Ese
script resuelve un caso, pero no es reutilizable: cada nueva personalización
(ocultar un campo, autocompletarlo, insertar otra alerta, en otra tienda)
implicaría clonar y adaptar todo el patrón a mano.

## Objetivo

Un framework reutilizable para **cualquier** tienda Jumpseller que permita, por
campo del checkout, tres acciones: **ocultar**, **autocompletar** e insertar una
**alerta** (arriba o abajo de un ancla); más el caso combinado
**autocompletar-luego-ocultar**. Distribuido vía CDN para que cada tienda solo
declare su configuración en un tag pequeño de GTM.

### No-objetivos (v1, YAGNI)

- Tests E2E contra el checkout real.
- Editor no-code / UI de configuración (el público es equipo técnico con JS).
- Tipos de acción más allá de los cuatro definidos.
- Bundler pesado (webpack/rollup); basta un build por concatenación.

## Decisiones tomadas (brainstorming)

- **Selectores reales:** disponibles / se consiguen → los ejemplos del catálogo
  serán exactos, no genéricos.
- **Público:** equipo técnico cómodo con JS → API con nivel imperativo expuesto,
  no solo config rígida.
- **Distribución:** loader desde jsDelivr (repo público en GitHub) → el tag de
  GTM es pequeño y pasa solo la config de esa tienda.
- **Forma de API:** enfoque híbrido (declarativo + funciones expuestas).

## Arquitectura — tres capas

```
GitHub repo (jumpseller-checkout-kit)
        │  publica vía jsDelivr CDN (pin por tag de git)
        ▼
GTM Custom HTML tag (por tienda) — pequeño:
   <script src=".../dist/checkout-kit.js"></script>
   <script>CheckoutKit.run([ ...acciones de ESTA tienda... ]);</script>
        │  el motor monta UN observer compartido
        ▼
   Checkout React SPA (sairam.cl, etc.)
```

1. **El motor (`checkout-kit.js`)** — código genérico, idéntico para todas las
   tiendas. Contiene el observer compartido, el ciclo de vida, las primitivas y
   el intérprete del array declarativo. Vive en el repo, se sirve por CDN.
2. **La config por tienda** — el array de acciones embebido en el tag de GTM.
   Es lo único que cambia entre tiendas.
3. **El catálogo de campos + ejemplos** (`docs/FIELD-CATALOG.md`) — biblioteca
   de recetas: cada campo del checkout con su selector real y el snippet listo
   para cada una de las tres acciones.

**Razón:** toda la lógica frágil (timing, React, idempotencia) queda concentrada
en un solo lugar versionado. Un bug se arregla una vez y se propaga vía CDN.

## El motor por dentro

Un solo `MutationObserver`, un registro de acciones, todas idempotentes. Es la
generalización del script de Sairam.

```
CheckoutKit.run(actions)
   ├─ guard de URL (¿contiene 'v2/checkout'?) ── no ─→ return
   ├─ guard de "ya iniciado" (namespace en window)
   ├─ registra las acciones en un array interno
   ├─ apply() inmediato
   └─ monta UN MutationObserver(document.body) con debounce (~80ms)
            └─ en cada tick: apply() recorre el registro y ejecuta cada acción
```

### Diferencias frente al script de Sairam

| Tema        | Sairam (actual)        | Motor generalizado                          |
|-------------|------------------------|---------------------------------------------|
| Observers   | uno por script         | **uno compartido** para todas las acciones  |
| Apagado     | `disconnect()` a 30s   | **no se apaga**; vive toda la sesión (elimina el punto frágil del límite de 30s) |
| Re-aplicar  | implícito              | explícito e **idempotente por tipo**        |
| Pasos SPA   | implícito por selector | scoping por paso vía `page` opcional        |

### Idempotencia por tipo (crítico)

El observer dispara en cada render, así que cada acción debe ser segura de
re-ejecutar:

- **`hide`** — re-oculta si React lo trae de vuelta. Stateless.
- **`alert`** — dedup por `id`; si el nodo ya existe, no hace nada (como
  `BLOCK_ID` en Sairam).
- **`autofill`** — rellena si el campo está **vacío** y marca el **elemento** con
  un data-attribute (`data-ck-autofilled`), de modo que un elemento remontado
  vacío se vuelve a rellenar pero se respeta la edición del usuario, para no pisar
  lo que el usuario escriba después.
- **`autofillThenHide`** — secuencia: autofill (una vez) → hide (idempotente).
  El orden importa: el valor entra al estado de React antes de ocultar.

### Guards y anti-loop

- **Dos niveles de dedup** (heredado de Sairam): namespace en `window` para no
  montar dos observers; `id` por nodo para no duplicar inserciones.
- **Anti-loop:** como el motor escribe en el DOM y el observer escucha el DOM,
  se evita el bucle infinito con debounce + idempotencia (si nada cambió de
  estado, `apply()` no produce mutaciones nuevas) y, opcionalmente, pausando el
  observer durante la escritura.

### Autofill seguro en React (landmine técnico)

`input.value = 'x'` no funciona: React lleva su propio value tracker y revierte
el cambio al siguiente render. Hay que usar el setter nativo del prototipo y
disparar el evento que React escucha:

```js
var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
setter.call(input, value);
input.dispatchEvent(new Event('input', { bubbles: true }));
```

Para `<select>` se usa el prototipo `HTMLSelectElement` + evento `change`. Esta
lógica vive aislada en `src/core/react.js`.

## API

### Nivel declarativo — `CheckoutKit.run([...])`

Cada entrada es un objeto con `type` y sus campos. Vocabulario v1:

```js
CheckoutKit.run([
  { type: 'hide',
    selector: '#checkout_company',
    page: '#information-page' },          // page opcional (scoping por paso)

  { type: 'autofill',
    selector: '#checkout_city',
    value: 'Santiago' },                  // value: string | () => string

  { type: 'autofillThenHide',
    selector: '#checkout_city',
    value: 'Santiago' },

  { type: 'alert',
    anchor: '#save_place_order',
    position: 'before',                   // 'before' | 'after'
    id: 'policy_v1',                      // dedup
    html: '…tu HTML…' },                  // o usar un preset
]);
```

### Nivel imperativo (escape hatch)

Las mismas primitivas como funciones; todas se registran en el observer
compartido, así que también sobreviven re-renders:

```js
CheckoutKit.hide('#x', { page });
CheckoutKit.autofill('#x', value, { page });
CheckoutKit.addAlert({ anchor, position, id, html });
CheckoutKit.onChange(fn);   // callback en cada tick estabilizado, lógica a medida
```

**El nivel declarativo se implementa SOBRE el imperativo:** `run()` es un loop
que traduce cada objeto a una llamada de primitiva. Una sola fuente de verdad.

### Presets

`CheckoutKit.presets.policyAlert({ title, body, link })` genera el HTML con los
estilos del bloque de Sairam (Bootstrap Icons incluido). El caso Sairam queda
como **un ejemplo más** del catálogo, no como código especial.

### Notas de diseño de la API

- **`value` acepta string o función:** estática cubre el 90%; función deja la
  puerta abierta a valores dinámicos sin cambiar la API.
- **`page` como scoping opcional:** si se omite, la acción aplica donde aparezca
  el selector; si se indica, solo en ese paso del checkout.

## Estructura del repo

```
jumpseller-checkout-kit/
├── src/
│   ├── core/
│   │   ├── observer.js      # observer compartido + debounce + lifecycle
│   │   ├── react.js         # setter nativo + dispatch (autofill seguro)
│   │   ├── actions.js       # hide / autofill / autofillThenHide / alert
│   │   ├── run.js           # intérprete del array declarativo
│   │   └── presets.js       # policyAlert y futuros presets
│   └── index.js             # arma window.CheckoutKit y expone la API
├── dist/
│   └── checkout-kit.js      # build final servido por jsDelivr
├── docs/
│   ├── FIELD-CATALOG.md     # biblioteca de recetas: cada campo + snippet
│   └── stores/
│       └── sairam.md        # config real de Sairam (ejemplo vivo)
├── examples/
│   ├── gtm-tag.html         # plantilla del tag Custom HTML para pegar en GTM
│   └── mock-checkout.html   # checkout simulado para validación manual
└── README.md
```

## Distribución y versionado

- jsDelivr sirve cualquier repo público de GitHub:
  `https://cdn.jsdelivr.net/gh/aatronco/jumpseller-checkout-kit@<tag>/dist/checkout-kit.js`
- **Pin por tag de git** (`@v1`, `@v1.2.0`), nunca `@main`: despliegue
  controlado, una tienda en producción no se rompe sola al subir un cambio.
  (jsDelivr cachea ~7 días, así que `@main` no es ni predecible.)

## Build

Script mínimo: concatenar `src/` → `dist/checkout-kit.js`, con paso opcional de
minificación. Sin bundler pesado (YAGNI).

## Testing

- **Unitarios (jsdom):** idempotencia de `hide`, el truco de React en
  `autofill`, dedup de `alert`, traducción de `run()` a primitivas.
- **Manual:** `examples/mock-checkout.html` simula el checkout para validar a
  ojo.
- **Fuera de v1:** E2E contra el checkout real.

## Input pendiente (para implementación) — RESUELTO

- **HTML / selectores reales del checkout v2 de Jumpseller.** ✅ Entregado y
  procesado: `docs/FIELD-CATALOG.md` ya contiene los selectores reales. Hallazgo
  clave: **Región (`#region`) y Comuna (`#municipality`) son componentes
  react-select**, no `<select>` nativos → se pueden ocultar pero NO autocompletar
  con el kit. El resto son inputs nativos (`#email`, `#name`, `#surname`, `#city`,
  `#address`, `#complement`, `#taxid`, `#phone`, textarea `#additional_information`)
  donde hide/autofill/autofillThenHide funcionan.
