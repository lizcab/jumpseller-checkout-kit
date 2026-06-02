# Guía paso a paso: usar el Checkout Kit en Google Tag Manager

Esta guía es para personas **sin experiencia técnica**. Síguela en orden, sin
saltarte pasos.

---

> # 🚨🚨 LEE ESTO ANTES DE TOCAR NADA 🚨🚨
>
> ## ⚠️ PUEDES PERDER EL SOPORTE DE JUMPSELLER
>
> El checkout de Jumpseller **no está hecho para ser modificado**. Inyectar
> código por Tag Manager es un "atajo" **NO oficial**.
>
> **Si lo modificas, asume que:**
>
> - 🛑 **El soporte de Jumpseller puede dejar de ayudarte.** Si algo del checkout
>   falla y tienes código inyectado, te pueden pedir que lo quites antes de
>   revisar, o directamente **no dar soporte**.
> - 🛑 **Una actualización de Jumpseller puede romper tu cambio en cualquier
>   momento**, sin aviso. Los `id` de los campos pueden cambiar y tu script deja
>   de funcionar (o peor, rompe el checkout).
> - 🛑 **Si rompes el checkout, NADIE PUEDE COMPRAR.** Estás tocando la página
>   donde tus clientes pagan. Un error aquí = ventas perdidas.
> - 🛑 **Tú eres el único responsable** de lo que inyectes.
>
> ## ✅ Regla de oro: PRUEBA primero, en modo vista previa, y revisa que se pueda comprar de principio a fin ANTES de publicar.

---

> # 🔒🔒 ADVERTENCIA DE SEGURIDAD: NO USES UN REPOSITORIO DE TERCEROS 🔒🔒
>
> Este kit se carga desde un archivo en GitHub. **NO uses el repositorio de otra
> persona** (por ejemplo `aatronco/...`) en tu tienda en producción.
>
> **¿Por qué?** Ese archivo se ejecuta en el checkout de TUS clientes **cada vez
> que cargan la página**. Si el dueño de ese repositorio cambia el archivo (a
> propósito o por un hackeo), ese código nuevo corre en tu tienda **sin que te
> enteres**. Podría robar datos de tus clientes.
>
> ## ✅ SIEMPRE haz tu propia copia (fork) y usa TU copia. Así controlas exactamente qué código se ejecuta.
>
> El **Paso 1** te enseña a hacerlo. No te lo saltes.

---

---

> # 📋 REQUISITO PREVIO: tu checkout debe ser el VERTICAL de una sola página
>
> Este kit está hecho y verificado para el checkout **vertical de una página**:
> ese donde **todo el formulario (contacto, envío, facturación y pago) se ve en
> una sola pantalla**, hacia abajo.
>
> **Si tu tienda usa el checkout por PASOS (multipágina)** — donde avanzas con
> botones "Siguiente" entre pantallas separadas — **los campos y el
> comportamiento pueden no coincidir** y el kit puede no funcionar (o funcionar a
> medias).
>
> ### ¿Cómo sé cuál tengo?
> Abre tu checkout (agrega un producto y ve a pagar):
> - **Vertical (✅ compatible):** ves contacto, dirección, envío y pago todo en
>   la misma página, desplazándote hacia abajo.
> - **Por pasos (⚠️ no garantizado):** completas una pantalla y pulsas
>   "Siguiente" para pasar a la próxima.
>
> Puedes cambiar el tipo de checkout en el admin de Jumpseller (preferencias del
> checkout). **Si no estás en el vertical de una página, no sigas con esta guía.**

---

## Paso 1 — Haz tu propia copia del kit (fork)

1. Crea una cuenta gratis en GitHub si no tienes: https://github.com/signup
2. Entra al kit original: https://github.com/aatronco/jumpseller-checkout-kit
3. Arriba a la derecha, haz clic en el botón **"Fork"**.
4. Confirma. GitHub creará una copia en **tu** cuenta, con una dirección como:
   `https://github.com/TU-USUARIO/jumpseller-checkout-kit`
5. **Anota tu usuario de GitHub.** Lo usarás más abajo. En esta guía aparece como
   `TU-USUARIO` — reemplázalo siempre por el tuyo real.

> 💡 A partir de ahora, todo el código que use tu tienda sale de **tu** copia, no
> de la de un tercero.

### Paso 1.b — Crea una "versión" (tag) en tu copia

Esto evita que un cambio futuro te rompa el checkout sin avisar.

1. En tu copia (tu fork), entra a la pestaña **"Releases"** (a la derecha) →
   **"Create a new release"**.
2. En **"Choose a tag"** escribe `v1` y créalo.
3. Pon un título (ej. `v1`) y haz clic en **"Publish release"**.

Ahora tu archivo vive en una dirección **fija**:

```
https://cdn.jsdelivr.net/gh/TU-USUARIO/jumpseller-checkout-kit@v1/dist/checkout-kit.min.js
```

(Reemplaza `TU-USUARIO`. Esta es la dirección que pegarás en Tag Manager.)

---

## Paso 2 — Abre Google Tag Manager de tu tienda

1. Entra a https://tagmanager.google.com y elige el contenedor (GTM) que está
   conectado a tu tienda Jumpseller.

> ¿No tienes GTM conectado? En el admin de Jumpseller: **Preferencias → Google
> Tag Manager**, pega tu ID `GTM-XXXXXX` y guarda. Si no sabes hacerlo, pídeselo
> a quien administre tu tienda **antes de continuar**.

---

## Paso 3 — Crea el Tag (Custom HTML)

1. En GTM, menú izquierdo → **"Etiquetas" (Tags)** → **"Nueva" (New)**.
2. Ponle un nombre claro, ej. `Checkout - ocultar ciudad`.
3. En **"Configuración de la etiqueta"** elige el tipo **"HTML personalizado"
   (Custom HTML)**.
4. Pega EXACTAMENTE este código en el cuadro de HTML
   (👉 cambia `TU-USUARIO` por el tuyo):

```html
<script src="https://cdn.jsdelivr.net/gh/TU-USUARIO/jumpseller-checkout-kit@v1/dist/checkout-kit.min.js"></script>
<script>
  (function () {
    if (!window.CheckoutKit) return;
    CheckoutKit.run([

      // EJEMPLO: poner "Santiago" en el campo Ciudad y luego ocultarlo
      { type: 'autofillThenHide', selector: '#city', value: 'Santiago' }

    ]);
  })();
</script>
```

> ## ⚠️ MUY IMPORTANTE sobre ocultar campos
> Solo oculta un campo si lo **autocompletas con un valor válido primero** (como
> en el ejemplo). Si ocultas un campo **obligatorio** sin rellenarlo, **nadie
> podrá terminar la compra**. El ejemplo de Ciudad es seguro porque primero pone
> "Santiago" y recién después lo oculta.

---

## Paso 4 — Pon el disparador (Trigger)

1. Más abajo, en **"Activación" (Triggering)**, haz clic y elige
   **"Todas las páginas" (All Pages)**.

   El kit ya trae un "seguro": **solo actúa dentro del checkout** (páginas con
   `v2/checkout` en la dirección) y no hace nada en el resto de la web, aunque el
   disparador sea "Todas las páginas".

2. Guarda la etiqueta (**Save**).

---

## Paso 5 — PRUEBA antes de publicar (no te saltes esto)

1. Arriba a la derecha en GTM, haz clic en **"Vista previa" (Preview)**.
2. Escribe la dirección de tu tienda y abre el checkout (agrega un producto al
   carrito y avanza a pagar).
3. **Verifica con tus propios ojos:**
   - ✅ El campo **Ciudad** ya no se ve.
   - ✅ Puedes completar TODO el formulario y llegar hasta el botón de pago.
   - ✅ El pedido se puede realizar de principio a fin.
4. Si algo se ve raro o el checkout se rompe → **NO publiques**. Quita el código
   del tag o desactívalo.

---

## Paso 6 — Publica

Solo si el Paso 5 salió perfecto:

1. En GTM, haz clic en **"Enviar" (Submit)** → **"Publicar" (Publish)**.
2. Listo. El cambio ya está en vivo.

---

## Otros ejemplos (cámbialos dentro del `CheckoutKit.run([...])`)

**Solo autocompletar la ciudad (sin ocultarla):**
```js
{ type: 'autofill', selector: '#city', value: 'Santiago' }
```

**Mostrar un aviso de política antes del botón de pago:**
```js
Object.assign(
  { type: 'alert', anchor: '#save_place_order', position: 'before', id: 'aviso_1' },
  CheckoutKit.presets.policyAlert({ link: 'https://TU-TIENDA.cl/refund-policy' })
)
```

Para más campos y combinaciones, mira **[FIELD-CATALOG.md](FIELD-CATALOG.md)**.

> ## ⚠️ Recordatorio final
> Región y Comuna **NO se pueden autocompletar** (son menús especiales). Solo se
> pueden ocultar — y ocultarlos puede impedir comprar. No los toques salvo que
> sepas exactamente lo que haces.

---

## Si algo sale mal

1. Entra a GTM → desactiva o borra el tag → **Publica**.
2. El checkout vuelve a la normalidad de inmediato (el kit no deja rastros).
3. Recién entonces investiga qué pasó en modo vista previa.
