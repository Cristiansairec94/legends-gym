# 🏋️ CATÁLOGO MAESTRO: REPOSITORIOS, ASSETS Y GUÍAS DE INTEGRACIÓN GYM POS & ACCESO

Bienvenido a la biblioteca centralizada de recursos para el desarrollo del **Punto de Venta (POS)** y **Control de Acceso Biométrico / Torniquetes** de **Legends Pro Gym**.

Todos los elementos han sido organizados en carpetas modulares dentro de `c:\Users\CORSAIR\Desktop\gym\repositorios\`.

---

## 📁 1. Repositorios de Código Fuente Abierto (`01_REPOSITORIOS_SISTEMAS_Y_POS`)

Se descargaron y clonaron 8 repositorios clave de GitHub con arquitecturas de producción:

| Repositorio / Carpeta | Tecnologías | Propósito en el Proyecto |
| :--- | :--- | :--- |
| **`zkteco-biometric-nodejs`** | Node.js, Sockets TCP/UDP | **Control de huellas y torniquetes ZKTeco**: Conexión directa a terminales biométricos por red (puerto 4370), captura de eventos en vivo y pulso de apertura de torniquete. |
| **`escpos-thermal-printer-driver`** | Node.js, ESC/POS, Raw Print | **Impresión térmica de tickets (80mm/58mm)**: Generador de comandas, cortes de caja, formateo de texto, códigos de barras e impulso de apertura de cajón de dinero. |
| **`impresora-termica-tickets-es`** | JavaScript, Node.js, Plugin | **Guías y utilidades en español para impresión térmica**: Ejemplos de diseño de tickets para gimnasio y conexión local sin drivers complejos. |
| **`torniquete-rfid-huella-arduino`** | C++, Arduino, ESP32, Relé | **Firmware de control físico**: Lógica para activar relé de solenoide de torniquetes usando lectores RFID (RC522) y sensores ópticos de huella. |
| **`fitness-academy-pos-qr`** | Web, PHP/JS, MySQL, QR | **Punto de venta y acceso por QR**: Lógica de tienda fit, catálogo de productos, venta de membresías y registro de asistencia por QR. |
| **`gimnasio-acceso-qr`** | Python, Django, Bootstrap | **Membresías y control de acceso**: Ciclo de vida de planes, cálculo de días de gracia y validación de accesos. |
| **`gym-management-electron`** | Electron, JavaScript, SQLite | **Arquitectura de escritorio offline**: Modelo para empaquetar aplicaciones de gimnasio para Windows con almacenamiento local. |
| **`gym-management-react-tailwind`** | React, Tailwind CSS | **Componentes de interfaz deportiva**: Tableros de socios, métricas de asistencia y diseño responsivo para recepcionistas. |

---

## 📸 2. Imágenes Profesionales en Alta Definición (`02_IMAGENES_ALTA_CALIDAD`)

Todas las imágenes son libres de derechos (Royalty-Free) listas para producción:

### A. Modelos y Atletas (`modelos_y_atletas/`):
* `modelo_femenino_mancuernas.jpg`: Modelo fitness femenina entrenando con mancuernas.
* `modelo_masculino_fuerza.jpg`: Atleta masculino en rutina de fuerza muscular.
* `atleta_crossfit_cuerdas.jpg`: Entrenamiento funcional de alta intensidad con cuerdas de batalla.
* `modelo_culturista_pose.jpg`: Atleta de físico-culturismo (ideal para promocionales y banners).
* `entrenadora_personal_fit.jpg`: Coach / entrenadora certificada para sección de staff.
* `atleta_boxeo_entrenamiento.jpg`: Sesión de boxeo y entrenamiento cardiovascular.
* `avatar_socio_hombre_1.jpg`: Foto de perfil para expediente de socio.
* `avatar_socia_mujer_1.jpg`: Foto de perfil para expediente de socia.
* `avatar_socio_atleta_2.jpg`: Foto de perfil para expediente de socio atleta.
* `avatar_socia_atleta_2.jpg`: Foto de perfil para expediente de socia atleta.

### B. Máquinas y Equipamiento (`maquinas_y_equipamiento/`):
* `sala_maquinas_gimnasio_panoramica.jpg`: Vista angular de gimnasio comercial de primer nivel.
* `rack_mancuernas_profesional.jpg`: Zona de peso libre con mancuernas cromadas y de caucho.
* `barra_olimpica_y_discos.jpg`: Barra de levantamiento olímpico y discos bumper.
* `caminadoras_cardio_fila.jpg`: Área de cardio con caminadoras de última generación.
* `banco_pesas_reclinable.jpg`: Banco ajustable para press inclinado y plano.
* `pesas_rusas_kettlebells.jpg`: Pesa rusa de competición en suelo de caucho.
* `zona_entrenamiento_funcional.jpg`: Box de crossfit y entrenamiento dinámico.
* `entrada_gimnasio_recepcion.jpg`: Mostrador de recepción y acceso.

### C. Suplementos y Punto de Venta (`suplementos_punto_de_venta/`):
* `bote_proteina_shaker.jpg`: Bote de proteína Whey Protein y botella de mezcla.
* `bebida_hidratante_fitness.jpg`: Bebida isotónica y electrolitos deportivos.
* `guantes_y_straps_gimnasio.jpg`: Accesorios de levantamiento pesado (straps y guantes).
* `shaker_botella_mezcladora.jpg`: Shaker cup para el catálogo de la tienda de suplementos.

### D. Logotipos e Insignias de Membresía (`logos_y_badges/`):
* `logo_legends_gym_pro.svg`: Logotipo vectorial oficial en alta resolución con corona y pesas.
* `badge_vip_gold.svg`: Medalla vectorial de membresía VIP Gold (Acceso ilimitado multisede).
* `badge_black_pass.svg`: Insignia VIP Black Pass con beneficios exclusivos en la tienda POS.

---

## 🔊 3. Sonidos y Efectos de Audio WAV Estudio (`03_SONIDOS_Y_EFECTOS_AUDIO`)

Archivos de audio estándar PCM 44.1 kHz a 16-bit compatibles con Windows, navegadores y la Web Audio API:

* 🔔 **`acceso_concedido_campana.wav`**: Doble timbre armónico brillante para confirmación en recepción.
* ⚡ **`acceso_concedido_laser.wav`**: Chime futurista ascendente para apertura rápida de torniquetes.
* 🚨 **`acceso_denegado_alerta.wav`**: Triple pitido urgente de advertencia.
* ⛔ **`acceso_denegado_buzzer.wav`**: Tono áspero en diente de sierra (buzzer clásico de rechazo/cuota vencida).
* 💵 **`pos_caja_registradora_chaching.wav`**: Sonido realista de apertura de gaveta de dinero y tintineo de monedas.
* 🎯 **`pos_lector_codigo_barras.wav`**: Pitido de 65ms a 2600Hz para escaneo láser de productos y carnets.
* ⚙️ **`torniquete_rele_solenoide.wav`**: Golpe electromecánico del relé y desbloqueo del rotor del torniquete.
* 📡 **`ui_radar_beep.wav`**: Pulso de escáner biométrico para la interfaz interactiva.

---

## 🎬 4. Videos y Demostraciones Visuales (`04_VIDEOS_Y_ANIMACIONES`)

* 📹 **`entrenamiento_sentadillas_hd.webm`**: Video en bucle de atleta ejecutando sentadillas pesadas.
* 📹 **`press_de_banca_ejercicio.webm`**: Video demostrativo de press de banca con técnica perfecta.
* 📹 **`peso_muerto_ejercicio.webm`**: Video de levantamiento de peso muerto.
* 🖥️ **`scanner_biometrico_hud.html`**: Simulador interactivo en HTML5/CSS3 para quioscos de acceso con video de fondo, haz láser animado, radar rotatorio y reproducción de sonidos en vivo al pulsar "Simular Acceso".

---

## 📐 5. Diseños Vectoriales de Máquinas y Hardware (`05_DISENOS_MAQUINAS_Y_VECTORES`)

### Vectores SVG (`vectores_svg/`):
* `torniquete_acceso_tripode.svg`: Torniquete electromecánico con brazo de bloqueo y lector LED verde.
* `lector_biometrico_huella.svg`: Sensor óptico con huella dactilar estilizada y haz láser.
* `terminal_pos_tactil.svg`: Estación de caja con pantalla táctil, cajón monedero y ticket impreso.
* `impresora_termica_tickets.svg`: Impresora de 80mm expulsando ticket de compra con logo de Legends Gym.
* `jaula_potencia_sentadilla.svg`: Jaula olímpica de acero con barra y discos bumper.
* `caminadora_electrica_pro.svg`: Caminadora profesional con consola digital.
* `mancuerna_hexagonal.svg`: Mancuerna de caucho de 25 kg con mango moleteado cromado.
* `pesa_rusa_kettlebell.svg`: Kettlebell de competición de 32 kg con banda identificadora.

### Diagramas de Hardware (`diagramas_hardware/`):
* `DIAGRAMA_CONEXION_TORNIQUETE_ESP32_RELE.md`: Guía de cableado paso a paso para relés 5V, torniquetes, lectores RFID RC522 y terminales ZKTeco por TCP/IP.
* `DIAGRAMA_CONEXION_IMPRESORA_TERMICAS_ESC_POS.md`: Protocolos de comunicación ESC/POS, comando de apertura de cajón por RJ11 y escaneo de códigos de barra HID.

---

## 🗄️ 6. Esquema de Base de Datos (`06_DOCUMENTACION_Y_GUIAS`)

* **`ESQUEMA_BASE_DATOS_GYM_POS.json`**: Estructura de entidades normalizada lista para SQLite, PostgreSQL o MongoDB, cubriendo socios, membresías, productos, ventas, tickets térmicos, arqueo de caja (Corte X y Z) y logs de acceso.
