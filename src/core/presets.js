const ICONS_HREF = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css';
const STYLE_ID = 'js-checkout-kit-policy-styles';

export function ensurePolicyStyles() {
  if (!document.querySelector('link[href="' + ICONS_HREF + '"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = ICONS_HREF;
    document.head.appendChild(link);
  }
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.js-ck-wrap { max-width: 500px; margin: 0 auto; }',
      '.js-ck-alert { border: 1px solid #eee; background: #fcfcfc; color: #444; border-radius: 8px; padding: 12px 16px; text-align: center; }',
      '.js-ck-title { font-size: .875rem; font-weight: 700; color: #222; margin-bottom: 4px; }',
      '.js-ck-body  { font-size: .875rem; margin-bottom: 8px; }',
      '.js-ck-link  { font-size: .75rem; color: #888; text-decoration: none; transition: opacity .2s; }',
      '.js-ck-link:hover { opacity: .7; text-decoration: underline; }'
    ].join('\n');
    document.head.appendChild(style);
  }
}

// Bloque informativo de política (generaliza el caso Sairam). Devuelve {html, ensureStyles}
// pensado para esparcirse dentro de una acción 'alert'.
export function policyAlert(o) {
  o = o || {};
  const title = o.title || 'Cambios hasta 30 días';
  const body = o.body || 'Válido para productos <strong>sellados, con celofán original y sin uso.</strong>';
  const link = o.link || '#';
  const linkText = o.linkText || 'Revisar derecho a retracto y políticas';
  return {
    ensureStyles: ensurePolicyStyles,
    html:
      '<div class="js-ck-wrap"><div class="js-ck-alert" role="alert">' +
        '<div class="js-ck-title"><i class="bi bi-info-circle" style="margin-right:4px;"></i>' + title + '</div>' +
        '<p class="js-ck-body">' + body + '</p>' +
        '<div style="padding-top:8px;border-top:1px solid #eee;">' +
          '<a class="js-ck-link" href="' + link + '" target="_blank" rel="noopener">' + linkText +
          ' <i class="bi bi-box-arrow-up-right" style="margin-left:2px;"></i></a>' +
        '</div>' +
      '</div></div>'
  };
}
