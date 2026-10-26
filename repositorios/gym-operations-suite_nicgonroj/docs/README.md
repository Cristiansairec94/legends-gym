# Arquitectura de Gym Operations Suite

Cuatro piezas independientes que se conectan por URL y por contrato, no por una base compartida. Cada una
se puede desplegar, probar y revertir por separado.

## Inscripción y pagos (`payments-recurring/`)

```text
navegador ──POST /api/inscripciones.php──► EnrollmentRequestValidator
   (plan_id, duración, modalidad,           │  Origin same-origin, rate limit, X-Idempotency-Key
    pricing_version, consentimientos)       ▼
                                   CreateEnrollmentService ── PriceCatalog (monto canónico)
                                            │  INSERT inscripción (referencia aleatoria de 128 bits)
                                            ▼
                    ┌── single / prepaid ──► POST /checkout/preferences  (X-Idempotency-Key)
                    └── automatic ─────────► POST /preapproval           (end_date determinista)
                                            │  GET autenticado: ID, seller, aplicación, monto, fechas
                                            ▼
                                   checkout_url oficial de Mercado Pago
```

```text
Mercado Pago ──webhook──► WebhookSignature (HMAC) ─► WebhookDedupe ─► lease del evento
                                                                        │
                                  GET del recurso (payment, preapproval, authorized_payment,
                                  chargeback, claim) con la credencial y el alcance declarados
                                                                        ▼
                         PaymentTransition: aprobado / pendiente / rechazado / revisión manual
                                                                        ▼
                         MySQL (InnoDB, claves foráneas RESTRICT, 13 índices únicos críticos)
```

- **Estados inciertos.** Si un `POST` al proveedor hace timeout, la inscripción queda en
  `checkout_creation_uncertain` y se concilia por referencia (`ReconciliationService`), sin repetir el
  `POST`.
- **Reintentos de pago.** `PaymentRetryService` cancela y reemplaza una suscripción rechazada en fases
  reanudables bajo un mismo lock; una acreditación descubierta a mitad de camino detiene el reemplazo.
- **Conciliación.** `bin/reconcile-payments.php` (cron) y un endpoint firmado por HMAC para que un panel
  operativo pida una conciliación manual con nonce de un solo uso.
- **Khipu.** Segundo medio (transferencia) para pago único y prepago, apagado por defecto; firma sobre
  el cuerpo crudo y barrido de pagos pendientes con `bin/khipu-refresh.php`.

## POS de cafetería (`pos-cafeteria/`)

```text
Worker (worker/index.ts)
  ├─ Basic Auth con dos perfiles: admin y sales (hash SHA-256 en variables del Worker)
  ├─ elimina cualquier cabecera de rol enviada por el cliente y agrega la verdadera
  ├─ exige Origin confiable en mutaciones; sales no entra a rutas administrativas
  └─ app router (Vinext) ─► app/api/* ─► db/pos.ts ─► D1 (SQLite)
cron "7 * * * *" ─► /api/closure-incidents/notifications/process ─► WhatsApp Cloud API (opcional)
```

Flujo operativo: abrir turno (AM/PM, responsable, fondo inicial) → vender (efectivo, tarjeta,
transferencia por validar, pendiente o colaborador) → abonar deudas → contar caja e inventario → cerrar
turno. Si el conteo no cuadra se abre una incidencia con semáforo, responsable y recordatorios; las
correcciones del cierre quedan como revisiones con historial.

- Precios y stock se leen de D1 al vender; el ticket del navegador solo sirve para detectar cambios.
- Las recetas descuentan insumos compartidos (por ejemplo, una promo que consume el mismo muffin).
- Migraciones Drizzle en `drizzle/`. Los triggers complejos se retiran de la copia desplegable
  (`scripts/prepare-deploy-migrations.mjs`) y `db/index.ts` los instala en el primer uso.

## QR de recepción y calculadora

Ambos son estáticos. El QR copia los parámetros de la página de inscripción (`plan`, `duration`, `mode`),
agrega `utm_source=recepcion`, `utm_medium` y quién atendió en `utm_content`, y nunca lleva precio. La
calculadora corre por completo en el navegador y enlaza a la inscripción.

## Plataforma operacional (no incluida)

En el caso real, una tercera aplicación sobre el mismo stack del POS (Workers, D1, Drizzle y los mismos
perfiles admin/sales) gestiona referidos y clases de prueba: invitaciones y reservas públicas, agenda del
día siguiente, seguimiento, asistencia y matrícula. Los registros operacionales se guardan cifrados en
D1, y la lectura de pagos se diseñó como un conector firmado de solo lectura hacia el backend PHP. Queda fuera de
este repositorio porque depende de servicios de terceros del gimnasio.
