# 🏋️ LEGENDS PRO GYM — Sistema ERP & Control Biométrico en Vivo

Sistema integral de gestión de gimnasios, clubes deportivos y centros de entrenamiento de alto rendimiento. Incluye control de acceso biométrico para torniquetes, punto de venta (POS) para tienda de suplementos, expedientes de socios/atletas, arqueo y corte de caja, finanzas y control multi-sucursal.

---

## ⚡ Características Principales

* **Control de Acceso Biométrico y Torniquetes:**
  * Escáner interactivo con simulación HUD (haz láser, radar animado y respuesta auditiva).
  * Validación instantánea de membresía (activa, por vencer, expirada o en gracia).
  * Modo Kiosco / Pantalla completa para recepción y torniquetes.
  * Registro de accesos en vivo con tiempo y avatar.

* **Punto de Venta (POS) & Tienda Fit:**
  * Catálogo de suplementos (proteínas, creatinas, pre-entrenos, accesorios).
  * Lector de código de barras y búsqueda en tiempo real.
  * Venta asignada a socio o público general.
  * Formateado automático de **tickets térmicos de 80mm** listos para imprimir (`window.print()`).

* **Cartera de Socios y Enrolamiento Biométrico:**
  * Enrolamiento de huellas digitales en 4 etapas con generación de hash biométrico.
  * Expedientes con datos médicos, contacto de emergencia y seguimiento de consumo.
  * Renovación de planes de membresía (diario, mensual, trimestral, anual, VIP).

* **Finanzas y Arqueo de Caja:**
  * Apertura y Cierre de caja (Corte X y Z) con cuadre de efectivo (sobrante / faltante).
  * Registro y clasificación de gastos operativos (renta, servicios, insumos, nómina).
  * Histórico de ingresos filtrado por método de pago (efectivo, tarjeta, transferencia).

* **Control Multi-Sucursal (Red de Sedes):**
  * Supervisión consolidada de múltiples sedes.
  * Aforo en tiempo real vs capacidad máxima y torniquetes operativos.

* **Arquitectura de Audio Sintetizado:**
  * Generación programática de sonido con **Web Audio API** nativa (sin archivos multimedia externos).

* **Offline-First & Respaldo de Datos:**
  * Persistencia en almacenamiento local versionado.
  * Exportación e importación de bases de datos completas en formato JSON.

---

## 🛠️ Tecnologías

* **Frontend:** React 19, TypeScript
* **Herramienta de Construcción:** Vite 8
* **Estilos:** Tailwind CSS v3 (tema oscuro deportivo *High Contrast*)
* **Iconos:** Lucide React
* **Efectos:** Canvas Confetti, Web Audio API

---

## 🚀 Instalación y Puesta en Marcha

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Cristiansairec94/legends-gym.git
   cd legends-gym
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre en tu navegador la dirección indicada en la terminal (por defecto `http://localhost:5173`).

4. **Compilar para producción:**
   ```bash
   npm run build
   ```

---

## ☁️ Despliegue en Vercel

Este proyecto está preconfigurado para desplegarse automáticamente en [Vercel](https://vercel.com/) con soporte para Single Page Applications (SPA) a través de `vercel.json`.

Al conectarse al repositorio en GitHub, cada `push` a la rama `main` generará un despliegue de producción automático.
