#!/bin/sh
# Genera dist/qr-recepcion.js: librería QR (MIT) + script, en un solo archivo servido desde el mismo dominio.
set -e
cd "$(dirname "$0")"
mkdir -p dist
{ cat third_party/qrcode-generator-1.4.4.js; printf '\n'; cat src/qr-recepcion.js; } > dist/qr-recepcion.js
node --check dist/qr-recepcion.js
echo "dist/qr-recepcion.js ($(wc -c < dist/qr-recepcion.js | tr -d ' ') bytes)"
