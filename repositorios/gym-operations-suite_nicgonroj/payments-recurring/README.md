# payments-recurring

Backend PHP 8.1+ sin framework para inscripciones online de Demo Gym con **Checkout Pro** (pago único y
prepago) y **suscripciones finitas** de Mercado Pago (`/preapproval`), más transferencia con Khipu
(apagada por defecto). Pensado para hosting compartido: Apache, PDO MySQL y cURL.

## Contrato

- `GET public/api/disponibilidad.php`: ofertas vigentes, versión de precios y estado del preflight. El
  checkout solo se habilita si coinciden gate, versiones, esquema y las 14 ofertas.
- `POST public/api/inscripciones.php`: JSON con persona, `plan_id`, duración, modalidad,
  `pricing_version` y consentimientos, más `X-Idempotency-Key`. Nunca recibe montos.
- `GET public/api/estado.php?ref=...`: estado sin datos personales.
- `POST public/api/reintentar-pago.php`: reintento idempotente de un cobro rechazado.
- `public/webhooks/mercadopago.php` y `public/webhooks/khipu.php`: firma, deduplicación y GET autenticado.

Precios: `src/Domain/PriceCatalog.php` (valores ficticios). Matrícula de $15.000 incluida en el primer
cobro; en cargo automático el webhook devuelve la cuota al valor base después del primer pago.

## Pruebas (sin red ni base de datos)

```bash
php tests/run.php                    # 77 pruebas: catálogo, validación, checkout, webhooks, rate limit
php tests/reconciliation.php         # 40: conciliación y verificación de pagos
php tests/manual-reconciliation.php  # 21: endpoint firmado de conciliación manual
php tests/pricing-recovery.php       # recuperación de inscripciones con tarifas históricas
php tests/khipu.php && php tests/khipu-transfer.php
node tests/return-status.cjs && node tests/frontend-selection.cjs && node tests/frontend-recovery.cjs
php tests/catalog-public.php | node tests/frontend-selection.cjs --backend-catalog   # paridad PHP ↔ formulario
```

## Instalación (sandbox)

1. MySQL (InnoDB): ejecutar `database/migrations/001` a `004` en orden (`002` y `004` son reanudables).
2. Publicar solo `public/`; la app y la configuración privada viven fuera de `public_html`.
3. Copiar `config/private-environment.example.php` (o `.env.example`) con credenciales **de prueba**:
   `MP_CREDENTIAL_ENVIRONMENT=test` exige `APP_ENV=development`.
4. Abrir `DGYM_CHECKOUT_ENABLED=true` solo durante la prueba supervisada y volver a `false` al terminar.

`deploy/public-production.htaccess` es una plantilla del perfil productivo con rutas ficticias.
