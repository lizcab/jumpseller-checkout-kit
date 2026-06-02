// Asigna un valor a un campo controlado por React de forma que el value tracker
// interno de React lo reconozca, y luego dispara el evento que React escucha.
export function setNativeValue(el, value) {
  const proto =
    el.tagName === 'SELECT'   ? window.HTMLSelectElement.prototype :
    el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype :
                                window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(el, value);
  const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
  el.dispatchEvent(new Event(eventType, { bubbles: true }));
}
