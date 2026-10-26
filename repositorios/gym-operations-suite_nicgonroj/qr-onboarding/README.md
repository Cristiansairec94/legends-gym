# qr-onboarding

Botón "Continuar en el celular" para el formulario de inscripción. Recepción elige plan, duración y forma
de pago y muestra un QR con esa configuración; la persona escanea, completa sus datos y paga en su
teléfono. También permite copiar el enlace o enviarlo por WhatsApp.

- Activar en un equipo de recepción: `/inscripcion/?modo=recepcion` (con `&ref=caja1` para atribuir).
- Desactivar: `?modo=cliente`. Nunca se muestra en pantallas de menos de 768 px.
- El enlace lleva `plan`, `duration`, `mode`, `utm_source=recepcion` y `utm_medium=qr|whatsapp|enlace`.
  **No lleva precio**: el backend lo calcula con `PriceCatalog.php`.

```bash
./build.sh   # third_party/qrcode-generator (MIT) + src → dist/qr-recepcion.js, con node --check
```

La librería se empaqueta en el mismo archivo porque la CSP del sitio (`script-src 'self'`) no permite
CDNs. `payments-recurring/public/index.html` ya lo carga con
`<script src="assets/qr-recepcion.js" defer></script>`: basta copiar `dist/qr-recepcion.js` a
`public/assets/` al publicar. No tiene pruebas automatizadas; el build valida la sintaxis.
