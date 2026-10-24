# Sistema de Gestión de Gimnasio - ClubHouse

Este proyecto es una plataforma web integral desarrollada en **Django** para la administración y gestión operativa de un gimnasio. El sistema permite controlar el flujo de usuarios, gestionar membresías, generar reportes en PDF y controlar el acceso mediante códigos QR.

Está diseñado para ofrecer interfaces diferenciadas según el rol del usuario: Administradores, Moderadores y Socios.

## Características Principales

* **Gestión de Roles:**
    * **Administrador:** Control total del sistema, gestión de planes, usuarios y finanzas.
    * **Moderador:** Gestión operativa diaria, registro de usuarios y control de acceso.
    * **Socio:** Portal de cliente para ver estado de membresía y código QR de acceso.
* **Control de Acceso QR:** Generación automática de códigos QR para socios y escáner integrado para validación de entrada en tiempo real.
* **Gestión de Planes y Membresías:** Creación, edición y administración de planes de suscripción.
* **Documentación Automática:** Generación de contratos y recibos en formato PDF (`xhtml2pdf`).
* **Dashboard Administrativo:** Visualización de métricas y gestión centralizada.
* **Seguridad:** Sistema de autenticación robusto y protección de rutas según permisos.

## Tecnologías Utilizadas

El proyecto está construido sobre un stack robusto y escalable:

* **Backend:** Python 3, Django 5.2.8
* **Base de Datos:** Configurado para soportar PostgreSQL (`psycopg2-binary`) y MySQL (`PyMySQL`).
* **Frontend:** HTML5, CSS3, JavaScript (Vanilla).
* **Utilidades:**
    * `qrcode[pil]`: Generación de códigos de acceso.
    * `xhtml2pdf`: Generación de documentos imprimibles.
    * `Faker`: Generación de datos de prueba para desarrollo.
    * `whitenoise`: Gestión de archivos estáticos en producción.

## Pre-requisitos
Asegúrate de tener instalado lo siguiente:
* Python 3.10 o superior
* Git
* Virtualenv (recomendado)

## Instalación y Configuración
Sigue estos pasos para levantar el proyecto en tu entorno local:

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/elJulioDev/GimnasioQR.git
    cd GimnasioQR
    ```

2.  **Crear y activar un entorno virtual:**
    ```bash
    python -m venv venv
    # En Windows:
    venv\Scripts\activate
    # En macOS/Linux:
    source venv/bin/activate
    ```

3.  **Instalar dependencias:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configurar Variables de Entorno (Email):**
    Para que el sistema pueda enviar correos (credenciales, QRs), debes crear un archivo `.env` en la raíz del proyecto. Puedes usar el archivo de ejemplo como base:
    
    ```bash
    # Copiar el ejemplo a un archivo .env real
    cp .env.example .env
    # En Windows simplemente copia y renombra el archivo manualmente
    ```
    
    Abre el archivo `.env` y configura tus credenciales de Gmail (se recomienda usar Contraseña de Aplicación):
    ```env
    EMAIL_HOST_USER=tu-correo@gmail.com
    EMAIL_HOST_PASSWORD=tu-contraseña-de-aplicacion
    ```

5.  **Aplicar migraciones:**
    Genera la base de datos inicial.
    ```bash
    python manage.py makemigrations
    python manage.py migrate
    ```

6.  **Inicializar el sistema (Usuarios y Datos):**
    El proyecto cuenta con un comando personalizado para crear los usuarios base necesarios para operar. Ejecuta:
    ```bash
    python manage.py init_system
    ```
    *Este comando creará automáticamente al Administrador Web y al Superusuario de Django.*

7.  **Ejecutar el servidor:**
    ```bash
    python manage.py runserver
    ```

## Credenciales de Acceso

Una vez ejecutado el comando `init_system`, puedes utilizar las siguientes cuentas para probar los diferentes niveles de acceso:

### 1. Panel de Administración Web (Dashboard)
Para acceder a la interfaz principal del sistema (`/admin-panel/` o login principal):
* **RUT / Usuario:** `11.111.111-1`
* **Contraseña:** `123`
* **Rol:** Administrador General

### 2. Django Admin (Backend)
Para acceder al panel de administración crudo de Django (`/admin/`):
* **Usuario:** `admin`
* **Contraseña:** `123`
* **Nota:** Este usuario tiene permisos de superusuario pero no está diseñado para el flujo normal de la web.

## Estructura del Proyecto

```text
Gimnasio/
├── Clientes/                       # Aplicación principal (Core del negocio)
│   ├── management/commands/        # Scripts de administración
│   │   ├── init_system.py          # Crea usuarios Admin y Staff
│   │   └── poblar_db.py            # Carga datos de prueba
│   ├── migrations/                 # Historial de cambios de Base de Datos
│   ├── services/                   # Lógica de negocio separada
│   │   └── dashboard_service.py    # Cálculos para el dashboard
│   ├── static/                     # Archivos estáticos (Frontend)
│   │   ├── css/                    # Hojas de estilo por módulo
│   │   ├── img/                    # Activos gráficos (logos, iconos)
│   │   └── js/                     # Lógica frontend (Escáner QR, validaciones)
│   ├── templates/                  # Plantillas HTML (Vistas)
│   │   ├── emails/                 # Plantillas para correos electrónicos
│   │   ├── pdfs/                   # Plantillas para contratos y recibos
│   │   └── ...                     # Vistas de Admin, Moderador y Socio
│   ├── templatetags/               # Tags personalizados para templates
│   │   └── qr_tags.py              # Herramientas para renderizar QRs
│   ├── views/                      # Controladores (Vistas) modularizados
│   │   ├── access_views.py         # Lógica de control de acceso
│   │   ├── api_views.py            # Endpoints API internos
│   │   ├── auth_views.py           # Login, Registro y Logout
│   │   ├── dashboard_views.py      # Lógica de los paneles principales
│   │   ├── plan_mgmt_views.py      # ABM de Planes
│   │   └── user_mgmt_views.py      # ABM de Usuarios
│   ├── admin.py                    # Configuración panel admin Django
│   ├── apps.py                     # Configuración de la app Clientes
│   ├── backends.py                 # Backend de autenticación personalizado
│   ├── forms.py                    # Formularios de Django
│   ├── models.py                   # Modelos de BD (CustomUser, Plan, Pago, etc.)
│   ├── tests.py                    # Tests unitarios
│   └── utils.py                    # Funciones de utilidad general
├── Gimnasio/                       # Configuración del Proyecto Django
│   ├── asgi.py                     # Configuración ASGI
│   ├── settings.py                 # Configuración global (DB, Apps, Middleware)
│   ├── urls.py                     # Enrutador principal de URLs
│   └── wsgi.py                     # Configuración WSGI
├── build.sh                        # Script de construcción para despliegue
├── manage.py                       # CLI de gestión de Django
├── requirements.txt                # Lista de dependencias Python
└── run.pyw                         # Script de ejecución sin consola (Windows)
```

## Créditos

Este proyecto ha sido desarrollado gracias al esfuerzo de:

* **Alexis González:** **Lead Developer & Arquitecto de Software.**
    * Encargado del desarrollo integral del sistema (Backend, Frontend, Base de Datos y despliegue).
* **Joaquín Henríquez:** **Colaborador.**
    * Apoyo en la implementación de interfaces para el módulo de moderación.

## Licencia
Este proyecto es de uso educativo y privado.
