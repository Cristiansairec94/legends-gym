# Catálogo de Repositorios y Arquitectura ERP para Gimnasio

Todos los repositorios están descargados y guardados de forma permanente en esta carpeta:
`c:\Users\HP\Desktop\PROYCS\REPOSITORIOS`

---

## 1. Carpetas Guardadas y Enlaces Originales de GitHub

### A. Sistemas Web Completos y Boilerplates Administrativos (ERP)
1. **`wger_wger-project`**
   - **Repositorio:** https://github.com/wger-project/wger
   - **Stack:** Python (Django) + PostgreSQL + REST API
   - **Descripción:** El sistema open-source más completo para fitness. Incluye gestión de socios, creador de rutinas, base de datos de ejercicios, planes de nutrición, seguimiento de peso/medidas y API REST para apps móviles.
2. **`gymie_lubusIN`**
   - **Repositorio:** https://github.com/lubusIN/gymie
   - **Stack:** PHP (Laravel) + MySQL + Bootstrap
   - **Descripción:** Boilerplate administrativo tipo ERP para gimnasios: membresías, facturación, cobros pendientes, seguimiento de prospectos (*leads*), control de gastos del gimnasio y alertas.
3. **`MotionGym_cristianmarint`**
   - **Repositorio:** https://github.com/cristianmarint/MotionGym
   - **Stack:** PHP (Laravel) + Voyager Admin
   - **Descripción:** Sistema de administración de gimnasios con panel de control, roles y permisos de personal, membresías y control de pagos.
4. **`GYM-One_mayerbalintdev`**
   - **Repositorio:** https://github.com/mayerbalintdev/GYM-One
   - **Stack:** PHP + MySQL + Bootstrap
   - **Descripción:** Sistema ligero de gestión de centros deportivos, pases/suscripciones, recepción (check-in), horarios de clases y finanzas básicas.
5. **`TrainMate_Michael-Moris`**
   - **Repositorio:** https://github.com/Michael-Moris/TrainMate
   - **Stack:** C# (ASP.NET Core MVC) + Entity Framework Core
   - **Descripción:** Sistema empresarial en .NET para reservas de clases, extensión de membresías, horarios de entrenadores y gestión de sucursales.

### B. Plantillas Modernas (React / TypeScript / Tailwind)
6. **`GymMaster_React_Tailwind`**
   - **Repositorio:** https://github.com/abhishekrajput-web/GymMaster
   - **Stack:** React.js + Tailwind CSS
   - **Descripción:** Boilerplate de interfaz moderna (UI/UX) con paneles responsivos para socios, entrenadores, rutinas, suscripciones y pagos.
7. **`ActioLift_TypeScript`**
   - **Repositorio:** https://github.com/xScherpschutter/ActioLift
   - **Stack:** TypeScript
   - **Descripción:** Proyecto moderno basado en TypeScript para gestión y seguimiento de gimnasio.

### C. Módulos de Gimnasio para ERPNext / Frappe Framework
Ideales para instalarse sobre **ERPNext** si necesitas contabilidad fiscal completa, inventarios de tienda/suplementos, Punto de Venta (POS) y nómina:
8. **`gym_management_ajmalkp5`** — https://github.com/ajmalkp5/gym_management
9. **`Gym-Management-System_anwarpatelnoori`** — https://github.com/anwarpatelnoori/Gym-Management-System
10. **`gym_management_kramteo`** — https://github.com/kramteo/gym_management

### D. Sistemas de Gimnasio Especializados en Punto de Venta (POS), Tienda e Inventario
11. **`TemploGym_BrunoRasot`**
    - **Repositorio:** https://github.com/BrunoRasot/Sistema-de-Gimnasio
    - **Stack:** React + TypeScript + Tailwind CSS + Node.js
    - **Descripción:** Sistema completo con módulos de Caja (`CajaPage`, `HistorialCajaPage`), **Kardex de Inventario**, Catálogo de **Proveedores**, Alertas de Stock y **Cuentas por Cobrar / Fiados**.
12. **`gym-operations-suite_nicgonroj`**
    - **Repositorio:** https://github.com/nicgonroj/gym-operations-suite
    - **Stack:** TypeScript / Next.js
    - **Descripción:** Suite operativa con módulo dedicado **`pos-cafeteria`** (barra de batidos y suplementos), cortes de caja con revisiones (`cash-closures`), pagos recurrentes con Mercado Pago y registro QR.
13. **`GymApp_POS_dahlanGale`**
    - **Repositorio:** https://github.com/dahlanGale/GymApp
    - **Stack:** Electron + React + TypeScript
    - **Descripción:** Aplicación de escritorio con Punto de Venta unificado para productos de tienda (`Sales.tsx`, `Products.tsx`) y venta de membresías (`MembershipSales.tsx`).
14. **`FitData_GYM_ArturoSantos06`**
    - **Repositorio:** https://github.com/ArturoSantos06/FitData_GYM
    - **Stack:** React + Django REST Framework
    - **Descripción:** Gestión integral con Punto de Venta, folios de venta, entradas de almacén en tiempo real, fichas médicas y alertas por correo.
15. **`FitMax_Wallet_POS_mehmetgorer`**
    - **Repositorio:** https://github.com/mehmetgorer/FitMax
    - **Stack:** C# (ASP.NET Core MVC)
    - **Descripción:** Automatización de gimnasio con tienda de productos, carrito de compras y **Monedero / Billetera Virtual del Socio (*Wallet*)** para compras sin efectivo.
16. **`POS-Membresias-y-ventas_alexlm26`**
    - **Repositorio:** https://github.com/alexlm26/POS-Membresias-y-ventas
    - **Stack:** C# (.NET)
    - **Descripción:** Punto de venta de productos y membresías con integración directa para apertura y monitoreo de torniquetes HikVision.

---

## 2. Ideas de Módulos para un ERP de Gimnasio Propio

1. **Core ERP & Finanzas:**
   - **Planes y Suscripciones Híbridas:** Mensualidades, pases por día (*day pass*), paquetes de sesiones (ej. 10 clases) y cobros recurrentes.
   - **POS e Inventario (Tienda/Cafetería):** Venta en recepción de batidos, proteínas, ropa deportiva, agua y alquiler de lockers con descuento automático de stock.
   - **Control de Caja y Gastos:** Cierre de caja por turno de recepcionista, pago de comisiones a entrenadores y mantenimiento de equipos.
2. **Operación y Control de Accesos:**
   - **Check-in por QR o Biometría:** Pantalla en recepción que valida en tiempo real si el socio tiene su membresía activa.
   - **Mantenimiento de Máquinas:** Inventario de equipos, historial de fallas y alertas de mantenimiento preventivo.
3. **CRM y Retención (Anti-Churn):**
   - **Detector de inactividad:** Alerta automática cuando un socio activo lleva más de 10–14 días sin asistir.
   - **Embudo de prospectos:** Registro de visitas y pases de prueba.
4. **Portal del Socio y Entrenador (App / PWA):**
   - Reserva de cupos en clases grupales.
   - Asignación de rutinas, dietas e historial de medidas corporales (% grasa, masa muscular, IMC).

---

## 3. Modelo Base de Datos Recomendado (Prisma / PostgreSQL)

```prisma
enum Role {
  SUPERADMIN
  OWNER
  TRAINER
  RECEPTIONIST
  MEMBER
}

enum MembershipStatus {
  ACTIVE
  EXPIRED
  PENDING
  CANCELLED
}

model User {
  id             String       @id @default(uuid())
  email          String       @unique
  name           String?
  role           Role         @default(MEMBER)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  memberProfile  Member?
  trainerProfile Trainer?
  attendances    Attendance[]
  invoices       Invoice[]
}

model Member {
  id          String           @id @default(uuid())
  userId      String           @unique
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  phone       String?
  dateOfBirth DateTime?
  status      MembershipStatus @default(PENDING)
  joinDate    DateTime         @default(now())
  expiryDate  DateTime?
  workouts    WorkoutPlan[]
  diets       DietPlan[]
  attendances Attendance[]
  payments    Payment[]
}

model Trainer {
  id        String        @id @default(uuid())
  userId    String        @unique
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  specialty String?
  workouts  WorkoutPlan[]
}

model Attendance {
  id       String   @id @default(uuid())
  userId   String
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  memberId String?
  member   Member?  @relation(fields: [memberId], references: [id], onDelete: Cascade)
  date     DateTime @default(now())
}

model WorkoutPlan {
  id          String   @id @default(uuid())
  title       String
  description String?
  memberId    String
  member      Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  trainerId   String?
  trainer     Trainer? @relation(fields: [trainerId], references: [id], onDelete: SetNull)
  createdAt   DateTime @default(now())
}

model DietPlan {
  id        String   @id @default(uuid())
  title     String
  details   Json
  memberId  String
  member    Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}

model Invoice {
  id        String    @id @default(uuid())
  amount    Float
  status    String    @default("UNPAID")
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  payments  Payment[]
  createdAt DateTime  @default(now())
}

model Payment {
  id        String   @id @default(uuid())
  amount    Float
  method    String
  invoiceId String
  invoice   Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  memberId  String
  member    Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}
```
