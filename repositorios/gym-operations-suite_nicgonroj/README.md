# gym-operations-suite

Software operativo para un gimnasio de barrio: **punto de venta de la cafetería**, **inscripciones con pagos
recurrentes en Mercado Pago**, **QR de recepción** para terminar la inscripción en el celular y una
**calculadora nutricional** pública. Es una versión generalizada de piezas que diseñé, construí y llevé a
producción para un gimnasio cliente en Chile.

> Versión generalizada y saneada, publicada con autorización del dueño del gimnasio. No contiene datos,
> marca, logos, fotos, precios, catálogos, credenciales ni identificadores de cuentas reales. La marca
> «Demo Gym», los planes, los precios, los productos, los colaboradores y los datos de prueba son ficticios.

## El problema

Un gimnasio chico tiene tres puntos donde se pierde plata o tiempo sin que nadie lo note:

- **La cafetería.** Ventas en efectivo, tarjeta, transferencia y fiado a socios o colaboradores, con dos
  turnos al día. Sin un registro confiable, el cierre de caja no cuadra y las diferencias de stock se
  descubren tarde.
- **Las inscripciones y los pagos recurrentes.** Planes con 1, 3, 6 o 12 meses, cargo mensual automático o
  prepago, y una matrícula. Un cobro duplicado, una suscripción que cobra más meses de los pactados o un
  monto manipulado desde el navegador es un problema real con un cliente real.
- **La recepción.** La persona llega, pregunta y quiere inscribirse ahí mismo, pero el pago se hace mejor
  en su propio teléfono. Copiar a mano plan, duración y forma de pago genera errores.

## La solución

```text
                        ┌───────────────────────────── recepción ─────────────────────────────┐
                        │ qr-onboarding: QR con plan + duración + modalidad (sin precio)       │
                        └──────────────────────────────┬───────────────────────────────────────┘
                                                       ▼ celular del socio
  nutrition-calculator ──► CTA "inscríbete" ──► payments-recurring/public (formulario)
  (estático, sin datos)                                │ POST plan_id, duración, modalidad
                                                       ▼
                                  PriceCatalog.php (única fuente de precios)
                                                       │ monto canónico
                                                       ▼
                       Mercado Pago: Checkout Pro (pago único / prepago) o /preapproval (cargo mensual)
                                                       │ webhook firmado (HMAC)
                                                       ▼
            deduplicación ─► GET autenticado del recurso ─► transición de estado ─► MySQL
                                                       │
                                      revisión manual: reembolsos, contracargos, montos extra

  pos-cafeteria (Cloudflare Worker + D1): turnos AM/PM ─► ventas ─► cierre de caja ─► incidencias
                                          └─► reportes y Excel        └─► alertas por WhatsApp (opcional)
```

| Carpeta | Qué resuelve | Stack |
|---|---|---|
| [`pos-cafeteria/`](pos-cafeteria/) | Ventas por turno, fiado y abonos, inventario con recetas, cierre de caja con conteo, incidencias de cierre, reportes y exportación a Excel | Next.js sobre Vinext, TypeScript, Drizzle, Cloudflare Workers + D1 |
| [`payments-recurring/`](payments-recurring/) | Inscripción online con Checkout Pro, suscripciones finitas, webhooks idempotentes, conciliación y reintentos de pago | PHP 8.1+ sin framework, PDO MySQL, cURL, Apache |
| [`qr-onboarding/`](qr-onboarding/) | Botón "Continuar en el celular" para recepción: QR, copiar enlace o enviar por WhatsApp con atribución UTM | JavaScript sin dependencias + qrcode-generator (MIT) |
| [`nutrition-calculator/`](nutrition-calculator/) | Estimación de calorías y macros (Mifflin–St Jeor, o Cunningham si se conoce la grasa corporal) como puerta de entrada comercial | HTML, CSS y JavaScript estáticos |
| [`docs/`](docs/) | Arquitectura, flujos y decisiones | — |

## Decisiones de diseño clave

- **Una sola fuente de precios, del lado del servidor.** `PriceCatalog.php` define las 14 ofertas
  (2 planes × pago único de 1 mes, cargo automático y prepago de 3, 6 o 12 meses). El formulario solo envía `plan_id`, duración y modalidad; el
  backend calcula el monto. El QR de recepción no transporta precio. En el POS, el precio de cada línea
  se lee de D1: si el ticket del navegador trae otro valor, la venta se rechaza con 409 y se pide
  actualizar el ticket.
- **El servidor nunca acepta montos calculados por el cliente.** Tampoco confía en el retorno del
  navegador desde Mercado Pago: una membresía solo avanza con un pago verificado por GET autenticado.
  La versión del tarifario (`pricing_version`) viaja en el contrato y un formulario desactualizado se
  rechaza en vez de cobrar un precio viejo.
- **Webhooks idempotentes y sin confianza en el cuerpo.** Firma HMAC oficial (`x-signature`,
  `x-request-id`, `data.id`), deduplicación del evento, lease/CAS para procesamiento concurrente y
  restricciones únicas en la base. El monto, el estado y la referencia se leen del recurso mediante la
  API, nunca de la notificación. Los eventos fuera de orden no degradan un estado ya fechado.
- **Idempotencia de punta a punta.** Cada inscripción usa un `X-Idempotency-Key` estable: el mismo
  envío recupera la misma inscripción y la misma clave con otro payload es un conflicto. Un `POST` con
  resultado incierto nunca se repite: se concilia por referencia. En el POS, cada venta, abono, anulación
  o entrada de stock lleva un ID generado en el cliente que vuelve idempotente el reintento.
- **Suscripciones finitas.** El cargo automático se crea con fecha de término determinista y se verifica
  por GET antes de entregar el checkout. La matrícula va solo en el primer cargo; el webhook baja la cuota
  al valor base y cualquier cobro extra pasa a revisión manual.
- **Fallar cerrado.** El checkout está apagado por defecto (`DGYM_CHECKOUT_ENABLED=false`), las
  credenciales de prueba exigen `APP_ENV=development` y un preflight valida esquema, índices y
  configuración antes de abrir cobros. Reembolsos, contracargos y vínculos ambiguos van a una persona.
- **Historial inmutable en la caja.** Anulaciones, consumos y snapshots de inventario y eventos de
  incidencias son de solo inserción, protegidos por triggers en SQLite/D1. Una corrección de cierre es una revisión
  nueva, no una edición.

## Cómo correr cada pieza

Todo lo siguiente funciona sin red y sin credenciales.

```bash
# Pagos recurrentes (PHP 8.1+ y Node 18+)
cd payments-recurring
php tests/run.php && php tests/reconciliation.php && php tests/manual-reconciliation.php
php tests/pricing-recovery.php && php tests/khipu.php && php tests/khipu-transfer.php
node tests/return-status.cjs && node tests/frontend-selection.cjs && node tests/frontend-recovery.cjs
php tests/catalog-public.php | node tests/frontend-selection.cjs --backend-catalog

# POS de cafetería (Node 22.13+; npm install requiere red)
cd pos-cafeteria
npm install
npm test            # build de Vinext + 98 pruebas con SQLite en memoria
npm run dev         # requiere BASIC_AUTH_SHA256 y BASIC_AUTH_SALES_SHA256 en .dev.vars

# QR de recepción
cd qr-onboarding && ./build.sh

# Calculadora nutricional
cd nutrition-calculator && node --test tests/*.test.cjs
```

O todo junto: `./scripts/test-all.sh` (omite el POS si no encuentra `node_modules`).

Resultados en esta versión: PHP 77 + 40 + 21 + 9 + 18 pruebas y 4 grupos de recuperación de precios;
formulario 27 + 15 + 13 grupos; POS 98 pruebas, `tsc --noEmit` y ESLint sin errores; calculadora 52 pruebas.

## Qué quedó fuera y por qué

- **Plataforma operacional (referidos y clases de prueba).** Depende de servicios de terceros que usa el
  gimnasio (software de gestión de socios y conectores de su hosting) y su valor está en esos datos.
  Su arquitectura (mismo stack que el POS: Workers, D1 y roles por Basic Auth) se describe en
  [`docs/`](docs/).
- **Landing comercial, logos, fotos e ilustraciones.** Son identidad del cliente. Las láminas de
  composición corporal de la calculadora se retiraron: la página muestra su texto alternativo y sigue
  funcionando sin ese dato.
- **Scripts de despliegue, diagnóstico y notas de release.** Contenían rutas del hosting real y
  evidencia de producción. Queda una plantilla de `.htaccess` productivo con rutas ficticias.
- **Lockfile del POS.** El original incluía un plugin del hosting que no forma parte de esta versión;
  `npm install` genera uno nuevo.

## Stack

TypeScript · Next.js (Vinext) · React 19 · Drizzle ORM · Cloudflare Workers + D1 · PHP 8.1 · MySQL ·
Mercado Pago (Checkout Pro y Suscripciones) · Khipu · WhatsApp Cloud API (opcional) · node:test

---

**Nicolás González Rojas** · Head of Data & BI · [LinkedIn](https://www.linkedin.com/in/nicolas-gonzalez-rojas)
