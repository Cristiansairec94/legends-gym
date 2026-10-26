/*
 * QR de recepción — Demo Gym (/inscripcion/)
 *
 * Recepción configura plan, duración y forma de pago; el botón "Continuar en el celular"
 * muestra un QR con esa misma configuración para que la persona siga el formulario y pague
 * desde su teléfono. También permite copiar el enlace o enviarlo por WhatsApp.
 *
 * Activación (una vez por dispositivo de recepción):
 *   /inscripcion/?modo=recepcion              activa y recuerda el modo en este navegador
 *   /inscripcion/?modo=recepcion&ref=caja1    además atribuye las inscripciones a "caja1"
 *   /inscripcion/?modo=cliente                desactiva el modo en este navegador
 * Nunca se muestra en pantallas de celular (< 768 px), aunque el modo esté activo.
 *
 * El enlace del cliente copia los parámetros actuales de la página (plan, duration, mode, …),
 * quita "modo" y agrega utm_source=recepcion, utm_medium=qr|whatsapp|enlace y utm_content=<ref>.
 * No transporta sesión ni precio: el servidor debe seguir calculando el cobro.
 *
 * Requiere window.qrcode (qrcode-generator, MIT). build.sh lo concatena en dist/ porque la CSP
 * del sitio (script-src 'self') no permite cargarlo desde un CDN.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'dgym_recepcion';
  var MOBILE_QUERY = '(max-width: 767px)';

  var PLAN_LABELS = { inicio: 'Plan Inicio', pro: 'Plan Pro' };
  var MODE_LABELS = { prepaid: 'Pago único', automatic: 'Cargo automático' };

  // ---- Estado del modo recepción (persistido por dispositivo) ----

  function storage(action, value) {
    try {
      if (action === 'get') return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (action === 'set') localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      if (action === 'clear') localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* almacenamiento bloqueado: el modo dura solo esta carga */ }
    return null;
  }

  var params = new URLSearchParams(location.search);
  var modo = params.get('modo');
  var state = storage('get');

  if (modo === 'cliente' || modo === 'off') { storage('clear'); state = null; }
  if (modo === 'recepcion') {
    state = { active: true, ref: params.get('ref') || (state && state.ref) || '' };
    storage('set', state);
  }
  if (!state || !state.active) return;

  // ---- Enlace para el cliente ----

  function customerUrl(medium) {
    var url = new URL(location.href);
    url.hash = '';
    ['modo', 'ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) { url.searchParams.delete(k); });
    // La página guarda utm_* junto a la inscripción; utm_content identifica a quien atendió.
    url.searchParams.set('utm_source', 'recepcion');
    url.searchParams.set('utm_medium', medium);
    if (state.ref) url.searchParams.set('utm_content', state.ref);
    return url.toString();
  }

  function summary() {
    var p = new URLSearchParams(location.search);
    var plan = p.get('plan'), duration = p.get('duration'), mode = p.get('mode');
    var parts = [];
    if (plan) parts.push(PLAN_LABELS[plan] || 'Plan ' + plan);
    if (duration) parts.push(duration === '1' ? '1 mes' : duration + ' meses');
    if (mode) parts.push(MODE_LABELS[mode] || mode);
    return { text: parts.join(' · '), amount: readTodayCharge(), complete: !!(plan && duration && mode) };
  }

  // Lee el "Cobro de hoy" que ya calcula la página; si no está, se omite.
  function readTodayCharge() {
    var el = document.getElementById('summary-today');
    var text = el ? el.textContent.trim() : '';
    return /\$\s?[\d.]+/.test(text) ? text : '';
  }

  // ---- Estilos ----

  var css = [
    '#dgymqr-open{position:fixed;right:24px;bottom:24px;z-index:9998;display:flex;align-items:center;gap:10px;',
    'padding:14px 20px;border:0;border-radius:999px;background:var(--accent-strong,#00549a);color:#fff;font-weight:600;font-size:16px;line-height:1.2;font-family:inherit;',
    'box-shadow:0 8px 24px rgba(0,0,0,.18);cursor:pointer}',
    '#dgymqr-open:hover{background:#00427a}',
    '#dgymqr-open svg{width:22px;height:22px}',
    '#dgymqr-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;',
    'padding:24px;background:rgba(8, 14, 20,.55)}',
    '#dgymqr-modal[data-open]{display:flex}',
    '.dgymqr-card{position:relative;width:100%;max-width:440px;max-height:calc(100vh - 48px);overflow:auto;',
    'padding:28px;border-radius:24px;background:#fff;color:#1f1a16;text-align:center;font-family:inherit}',
    '.dgymqr-close{position:absolute;top:12px;right:14px;width:40px;height:40px;border:0;background:none;',
    'font-size:28px;line-height:1;color:#6b5f55;cursor:pointer}',
    '.dgymqr-title{margin:0 0 6px;font-size:22px;font-weight:700}',
    '.dgymqr-plan{margin:0;font-size:16px;color:#4a4038}',
    '.dgymqr-amount{margin:6px 0 0;font-size:28px;font-weight:800;color:var(--accent-strong,#00549a)}',
    '.dgymqr-code{width:min(300px,100%);margin:18px auto;padding:12px;border:1px solid var(--border,#e3ded5);border-radius:16px;background:#fff}',
    '.dgymqr-code svg{display:block;width:100%;height:auto}',
    '.dgymqr-hint{margin:0 0 18px;font-size:14px;color:#6b5f55}',
    '.dgymqr-warn{margin:0 0 14px;padding:10px 12px;border-radius:12px;background:var(--accent-soft,#dce7ff);color:#00427a;font-size:14px}',
    '.dgymqr-actions{display:grid;gap:10px}',
    '.dgymqr-btn{width:100%;padding:13px 16px;border-radius:12px;border:1px solid #b8cbe6;background:#f2f7ff;',
    'color:#1f1a16;font-weight:600;font-size:15px;line-height:1.2;font-family:inherit;cursor:pointer}',
    '.dgymqr-btn:hover{background:#dce9fd}',
    '.dgymqr-wa{display:flex;gap:8px}',
    '.dgymqr-wa input{flex:1;min-width:0;padding:12px;border:1px solid #b8cbe6;border-radius:12px;font-size:15px;font-family:inherit}',
    '.dgymqr-wa .dgymqr-btn{width:auto;background:#1f8f4e;border-color:#1f8f4e;color:#fff}',
    '.dgymqr-wa .dgymqr-btn:hover{background:#18763f}',
    '.dgymqr-foot{margin:14px 0 0;font-size:12px;color:#8a7d72}',
    '.dgymqr-foot button{border:0;background:none;color:inherit;text-decoration:underline;cursor:pointer;font:inherit}',
    '@media ' + MOBILE_QUERY + '{#dgymqr-open,#dgymqr-modal{display:none!important}}'
  ].join('');

  // ---- Interfaz ----

  var QR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>' +
    '<rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>';

  function build() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var open = document.createElement('button');
    open.id = 'dgymqr-open';
    open.type = 'button';
    open.innerHTML = QR_ICON + '<span>Continuar en el celular</span>';
    document.body.appendChild(open);

    var modal = document.createElement('div');
    modal.id = 'dgymqr-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'dgymqr-title');
    modal.innerHTML =
      '<div class="dgymqr-card">' +
        '<button type="button" class="dgymqr-close" aria-label="Cerrar">&times;</button>' +
        '<h2 class="dgymqr-title" id="dgymqr-title">Escanea para inscribirte</h2>' +
        '<p class="dgymqr-plan" data-plan></p>' +
        '<p class="dgymqr-amount" data-amount></p>' +
        '<div class="dgymqr-code" data-qr aria-label="Código QR de inscripción"></div>' +
        '<p class="dgymqr-warn" data-warn hidden>Falta elegir plan, duración o forma de pago antes de compartir.</p>' +
        '<p class="dgymqr-hint">Abre la cámara del celular, escanea el código y completa tus datos y el pago.</p>' +
        '<div class="dgymqr-actions">' +
          '<button type="button" class="dgymqr-btn" data-copy>Copiar enlace</button>' +
          '<form class="dgymqr-wa" data-wa>' +
            '<input type="tel" inputmode="tel" autocomplete="off" placeholder="WhatsApp: 9 1234 5678" aria-label="Número de WhatsApp">' +
            '<button type="submit" class="dgymqr-btn">Enviar</button>' +
          '</form>' +
        '</div>' +
        '<p class="dgymqr-foot">Modo recepción' + (state.ref ? ' · ' + escapeHtml(state.ref) : '') +
          ' · <button type="button" data-off>Desactivar en este equipo</button></p>' +
      '</div>';
    document.body.appendChild(modal);

    var $ = function (sel) { return modal.querySelector(sel); };
    var lastUrl = '';
    var lastFocus = null;

    function render() {
      var s = summary();
      var url = customerUrl('qr');
      $('[data-plan]').textContent = s.text || 'Configuración actual';
      $('[data-amount]').textContent = s.amount ? 'Cobro de hoy ' + s.amount : '';
      $('[data-warn]').hidden = s.complete;
      if (url === lastUrl) return;
      lastUrl = url;
      var box = $('[data-qr]');
      if (typeof window.qrcode !== 'function') {
        box.textContent = 'No se pudo generar el QR. Usa "Copiar enlace" o WhatsApp.';
        return;
      }
      var qr = window.qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 8, margin: 4, scalable: true });
    }

    function show() {
      lastFocus = document.activeElement;
      render();
      modal.setAttribute('data-open', '');
      $('.dgymqr-close').focus();
    }

    function hide() {
      modal.removeAttribute('data-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    open.addEventListener('click', show);
    $('.dgymqr-close').addEventListener('click', hide);
    modal.addEventListener('click', function (e) { if (e.target === modal) hide(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.hasAttribute('data-open')) hide(); });

    $('[data-copy]').addEventListener('click', function () {
      var btn = this;
      copyText(customerUrl('enlace'), function (ok) {
        btn.textContent = ok ? 'Enlace copiado ✓' : 'No se pudo copiar';
        setTimeout(function () { btn.textContent = 'Copiar enlace'; }, 2000);
      });
    });

    $('[data-wa]').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = this.querySelector('input');
      var phone = normalizeChileanPhone(input.value);
      var s = summary();
      var text = 'Hola, este es tu enlace para inscribirte en Demo Gym' +
        (s.text ? ' (' + s.text + ')' : '') + ': ' + customerUrl('whatsapp');
      if (input.value.trim() && !phone) { input.setCustomValidity('Revisa el número'); input.reportValidity(); return; }
      input.setCustomValidity('');
      // Sin número, WhatsApp deja elegir el contacto. El número no se guarda.
      window.open('https://wa.me/' + (phone || '') + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      input.value = '';
    });

    $('[data-off]').addEventListener('click', function () {
      storage('clear');
      modal.remove();
      open.remove();
      style.remove();
    });

    // La página cambia la URL al elegir duración o forma de pago: mantener el QR sincronizado.
    setInterval(function () { if (modal.hasAttribute('data-open')) render(); }, 500);
  }

  // ---- Utilidades ----

  function copyText(text, cb) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { cb(true); }, function () { cb(legacyCopy(text)); });
    } else {
      cb(legacyCopy(text));
    }
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  // Acepta "9 1234 5678", "+56 9 1234 5678", "56912345678". Devuelve "569XXXXXXXX" o "".
  function normalizeChileanPhone(value) {
    var d = String(value || '').replace(/\D/g, '');
    if (/^569\d{8}$/.test(d)) return d;
    if (/^9\d{8}$/.test(d)) return '56' + d;
    return '';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
