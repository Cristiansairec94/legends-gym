# 🖨️ GUÍA DE CONEXIÓN: IMPRESORA TÉRMICA ESC/POS, CAJÓN DE DINERO Y LECTOR DE CÓDIGOS

Esta guía describe cómo integrar el hardware del Punto de Venta (POS) en el software de Legends Gym: impresoras de tickets térmicos de 80mm/58mm, apertura automática del cajón monedero y lectores de códigos de barras.

---

## 1. 🧾 Impresora Térmica de Tickets (80mm / 58mm)

Las impresoras térmicas más populares para gimnasios (Epson TM-T20, TM-T88, Xprinter, Bixolon, Pos-58/Pos-80) utilizan el protocolo estándar **ESC/POS**.

### Métodos de Conexión:
1. **USB Directo (Impresora Virtual / Raw Print):**
   - Se conecta por USB a la computadora de recepción.
   - En Windows, se instala el driver genérico o del fabricante.
   - En Legends Gym, se puede imprimir vía:
     - `window.print()` con CSS térmico `@media print { @page { size: 80mm auto; margin: 0; } }` (implementado en el frontend).
     - Node.js Raw Printing con la librería clonada en `01_REPOSITORIOS_SISTEMAS_Y_POS/escpos-thermal-printer-driver`.

2. **Red Ethernet / Wi-Fi (IP):**
   - Puerto estándar: `9100`.
   - Permite imprimir tickets desde cualquier terminal (PC de mostrador, tablet de entrenador o móvil).
   - Conexión vía socket TCP en Node.js:
     ```javascript
     const escpos = require('escpos');
     escpos.Network = require('escpos-network');

     const device = new escpos.Network('192.168.1.200', 9100);
     const printer = new escpos.Printer(device);

     device.open(() => {
       printer
         .align('ct')
         .text('LEGENDS PRO GYM')
         .text('--------------------------------')
         .align('lt')
         .text('Socio: Juan Perez')
         .text('Membresia: VIP ANUAL')
         .text('Monto: $350.00 USD')
         .cut()
         .close();
     });
     ```

---

## 2. 💵 Apertura Automática del Cajón de Dinero (Cash Drawer)

El cajón de dinero se conecta a la impresora térmica mediante un conector **RJ11 / RJ12** (teléfono) de 6 pines.

```
       +-----------------------+
       |   IMPRESORA TÉRMICA   |
       |     PUERTO DK (RJ11)  |
       +-----------+-----------+
                   | Cable telefónico RJ11 de 6 hilos
                   v
       +-----------------------+
       |   CAJÓN MONEDERO      |
       | (Solenoide 12V / 24V) |
       +-----------------------+
```

### Comando ESC/POS para Disparar la Apertura:
Para abrir el cajón automáticamente al completar una venta en efectivo:
- Secuencia Hexadecimal: `\x1B\x70\x00\x19\xFA`
- Secuencia Decimal: `27, 112, 0, 25, 250`
- En la librería `escpos`:
  ```javascript
  printer.cashdraw(2); // Envía el pulso al pin 2 del conector RJ11
  ```

---

## 3. 🔍 Lector de Código de Barras (Barcode Scanner)

1. **Modo HID Keyboard Wedge (Recomendado):**
   - Se conecta por USB a la PC.
   - El lector actúa exactamente como un teclado ultrarrápido: al leer un producto o tarjeta de socio, escribe los dígitos y presiona `Enter` (`\n`).
   - En Legends Gym no requiere ningún driver especial; el frontend captura el evento `keydown` con un buffer de tiempo (< 50ms entre caracteres).

2. **Lectura de Carnets de Socios:**
   - Formatos recomendados: **Code 128** o **EAN-13**.
   - El código puede llevar el prefijo del socio (ej: `SOC-100249`). Al escanear en la pantalla de acceso, valida instantáneamente el expediente y estado de pago.
