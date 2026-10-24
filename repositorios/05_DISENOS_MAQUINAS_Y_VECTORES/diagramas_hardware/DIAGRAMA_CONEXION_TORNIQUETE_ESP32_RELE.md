# 🔌 GUÍA Y DIAGRAMA DE CONEXIÓN: TORNIQUETE Y CONTROL DE ACCESO BIOMÉTRICO

Este documento detalla la arquitectura de hardware para conectar un torniquete físico (trípode, abatible o flap barrier), lectores de huella biométrica y tarjetas RFID al software de control de acceso del gimnasio.

---

## 1. 📐 Diagrama Esquemático de Conexión (ESP32 / Arduino + Torniquete)

```
       +-------------------------------------------------------------+
       |                PC / SERVIDOR LOCAL DEL GYM                  |
       |  (Legends Pro Gym Node.js / Electron / React Access App)    |
       +------------------------------+------------------------------+
                                      | USB / Serial (COM3) o Wi-Fi
                                      v
                   +----------------------------------+
                   |  MICROCONTROLADOR (ESP32 / UNO)  |
                   +-----------------+----------------+
                                     |
           +-------------------------+-------------------------+
           |                         |                         |
           v (GPIO 4)                v (SPI / UART)            v (UART RX/TX)
    +--------------+          +--------------+          +--------------+
    | MÓDULO RELÉ  |          | LECTOR RFID  |          | SENSOR HUELLA|
    | 5V / 1 CANAL |          | RC522 13.56M |          | ÓPTICO AS608 |
    +-------+------+          +--------------+          +--------------+
            |
            | Contacto Seco (COM y NO)
            v
+--------------------------------------------------------------------+
|               PLACA CONTROLADORA DEL TORNIQUETE FÍSICO             |
|                                                                    |
|  [+] 12V / 24V Fuente de Poder                                     |
|  [OP-L] Entrada Trigger Dirección Izquierda (Socios Entrando)      |
|  [OP-R] Entrada Trigger Dirección Derecha   (Socios Saliendo)      |
|  [GND]  Común de Señal                                             |
|                                                                    |
|  * Un pulso de 250 milisegundos entre OP-L y GND libera el solenoide|
|    del torniquete para permitir 1 rotación de acceso.              |
+--------------------------------------------------------------------+
```

---

## 2. ⚡ Tabla de Pines y Cableado

### A. Módulo Relé 5V (Disparador de Torniquete):
| Pin Relé | Conexión ESP32 / Arduino | Conexión Torniquete | Función |
| :--- | :--- | :--- | :--- |
| **VCC** | 5V / VIN | - | Alimentación de bobina |
| **GND** | GND | - | Masa común |
| **IN** | GPIO 4 (D4) | - | Pulso de activación (HIGH/LOW) |
| **COM** | - | GND Señal Torniquete | Común de contacto seco |
| **NO** | - | OP-L / Trigger Entrada | Normalmente Abierto |

### B. Lector RFID RC522 (Para Pulseras y Tarjetas de Membresía):
| Pin RC522 | Pin ESP32 (SPI) | Pin Arduino Uno |
| :--- | :--- | :--- |
| **3.3V** | 3.3V *(¡No conectar a 5V!)* | 3.3V |
| **RST** | GPIO 22 | Pin 9 |
| **GND** | GND | GND |
| **MISO** | GPIO 19 | Pin 12 |
| **MOSI** | GPIO 23 | Pin 11 |
| **SCK** | GPIO 18 | Pin 13 |
| **SDA (SS)** | GPIO 5 | Pin 10 |

### C. Sensor Óptico de Huella Dactilar AS608 / FPM10A:
| Pin Sensor | Pin ESP32 | Función |
| :--- | :--- | :--- |
| **VCC** | 5V o 3.3V | Alimentación del prisma LED |
| **GND** | GND | Masa |
| **TX** | GPIO 16 (RX2) | Transmisión de plantilla biométrica |
| **RX** | GPIO 17 (TX2) | Recepción de comandos de escaneo |

---

## 3. 🌐 Opción Alternativa: Dispositivos Standalone ZKTeco por Red (Ethernet/TCP)

Si el gimnasio utiliza torniquetes con terminales ZKTeco (como **K40, iClock, IN01, MA300, MB20**):

1. **Conexión de Red:** Conectar el ZKTeco al router local o switch mediante cable UTP RJ45.
2. **Configuración IP del Dispositivo:**
   - IP: `192.168.1.201`
   - Puerto: `4370` (Por defecto en protocolo ZK UDP/TCP)
   - Contraseña de comunicación: `0` (o la asignada en el equipo).
3. **Integración con Node.js en Legends Gym:**
   Utilizar la librería clonada en `01_REPOSITORIOS_SISTEMAS_Y_POS/zkteco-biometric-nodejs`:
   ```javascript
   const ZKLib = require('zkteco-js');

   async function conectarTorniquete() {
     const zk = new ZKLib('192.168.1.201', 4370, 5200, 5000);
     await zk.createSocket();
     console.log('Conectado al ZKTeco del torniquete');

     // Escuchar registros en tiempo real cuando un socio pone la huella
     await zk.getRealTimeLogs((data) => {
       console.log('ID Socio escaneado:', data.userId);
       // Validar membresía en la base de datos de Legends Gym...
       // Si es válida -> zk.unlockDoor(1000); (Abre torniquete 1 segundo)
     });
   }
   ```
