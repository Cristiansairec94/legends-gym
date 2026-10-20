// In-memory backing store for Vercel serverless functions with optional Upstash/KV persistence
let store = {
  "version": 45,
  "updatedAt": "2026-10-20T15:12:20.539Z",
  "members": [
    {
      "id": "MEM-001",
      "fullName": "Carlos Mendoza",
      "documentId": "45892011",
      "email": "carlos.mendoza@email.com",
      "phone": "+52 55 1234 5678",
      "birthDate": "1992-05-14",
      "emergencyContact": {
        "name": "María Mendoza",
        "phone": "+52 55 9876 5432",
        "relationship": "Esposa"
      },
      "medicalNotes": "Hipertensión leve controlada. Apto para levantamiento de fuerza.",
      "biometricRegistered": true,
      "biometricHash": "BIO_HASH_MENDOZA_001",
      "biometricTemplate": "FP_THUMB_RIGHT_001",
      "membership": {
        "planType": "vip",
        "planName": "Membresía Black VIP Anual",
        "startDate": "2026-01-10",
        "endDate": "2027-01-10",
        "price": 9500,
        "status": "active",
        "daysRemaining": 95
      },
      "checkInsCount": 155,
      "lastCheckIn": "2026-10-16T17:30:25.058Z",
      "totalSpentInStore": 3450,
      "createdAt": "2025-01-10"
    },
    {
      "id": "MEM-002",
      "fullName": "Valeria Ríos Gómez",
      "documentId": "78291034",
      "email": "valeria.rios@email.com",
      "phone": "+52 55 4433 2211",
      "birthDate": "1998-11-20",
      "emergencyContact": {
        "name": "Roberto Ríos",
        "phone": "+52 55 2211 4433",
        "relationship": "Padre"
      },
      "medicalNotes": "Ninguna lesión. Entrenamiento de hipertrofia y glúteos.",
      "biometricRegistered": true,
      "biometricHash": "BIO_HASH_RIOS_002",
      "biometricTemplate": "FP_INDEX_RIGHT_002",
      "membership": {
        "planType": "monthly",
        "planName": "Mensualidad Estándar",
        "startDate": "2026-09-25",
        "endDate": "2026-10-25",
        "price": 850,
        "status": "active",
        "daysRemaining": 18
      },
      "checkInsCount": 28,
      "lastCheckIn": "2026-10-12T16:59:23.340Z",
      "totalSpentInStore": 1200,
      "createdAt": "2026-06-15"
    },
    {
      "id": "MEM-003",
      "fullName": "Alejandro Soto Vega",
      "documentId": "63901245",
      "email": "alejandro.soto@email.com",
      "phone": "+52 55 7788 9900",
      "birthDate": "1989-03-30",
      "emergencyContact": {
        "name": "Lorena Vega",
        "phone": "+52 55 3344 5566",
        "relationship": "Hermana"
      },
      "medicalNotes": "Operación de menisco en 2023. Evitar sentadillas profundas sin vendaje.",
      "biometricRegistered": true,
      "biometricHash": "BIO_HASH_SOTO_003",
      "biometricTemplate": "FP_THUMB_RIGHT_003",
      "membership": {
        "planType": "quarterly",
        "planName": "Plan Trimestral Fuerza",
        "startDate": "2026-07-09",
        "endDate": "2026-10-09",
        "price": 2300,
        "status": "expiring_soon",
        "daysRemaining": 2
      },
      "checkInsCount": 59,
      "lastCheckIn": "2026-10-13T18:35:58.888Z",
      "totalSpentInStore": 2100,
      "createdAt": "2025-07-09"
    },
    {
      "id": "MEM-004",
      "fullName": "Sofía Domínguez",
      "documentId": "89104523",
      "email": "sofia.dominguez@email.com",
      "phone": "+52 55 6655 4433",
      "birthDate": "1995-08-12",
      "emergencyContact": {
        "name": "Andrés Domínguez",
        "phone": "+52 55 1199 8877",
        "relationship": "Esposo"
      },
      "medicalNotes": "Alergia a la proteína de soya.",
      "biometricRegistered": true,
      "biometricHash": "BIO_HASH_DOMINGUEZ_004",
      "biometricTemplate": "FP_INDEX_RIGHT_004",
      "membership": {
        "planType": "monthly",
        "planName": "Mensualidad Estándar",
        "startDate": "2026-09-02",
        "endDate": "2026-10-02",
        "price": 850,
        "status": "expired",
        "daysRemaining": -5
      },
      "checkInsCount": 19,
      "lastCheckIn": "2026-10-12T16:59:23.340Z",
      "totalSpentInStore": 350,
      "createdAt": "2026-05-02"
    },
    {
      "id": "MEM-005",
      "fullName": "Mateo Guerrero",
      "documentId": "34519820",
      "email": "mateo.guerrero@email.com",
      "phone": "+52 55 8899 0011",
      "birthDate": "1990-01-25",
      "emergencyContact": {
        "name": "Elena Guerrero",
        "phone": "+52 55 7711 2233",
        "relationship": "Madre"
      },
      "medicalNotes": "Competidor activo de Powerlifting. Sin restricciones médicas.",
      "biometricRegistered": true,
      "biometricHash": "BIO_HASH_GUERRERO_005",
      "biometricTemplate": "FP_THUMB_LEFT_005",
      "membership": {
        "planType": "annual",
        "planName": "Plan Anual Élite",
        "startDate": "2025-11-01",
        "endDate": "2026-11-01",
        "price": 7500,
        "status": "active",
        "daysRemaining": 25
      },
      "checkInsCount": 215,
      "lastCheckIn": "2026-10-07T06:00:00Z",
      "totalSpentInStore": 5890,
      "createdAt": "2024-11-01"
    },
    {
      "id": "MEM-006",
      "fullName": "Camila Navarro",
      "documentId": "91023487",
      "email": "camila.navarro@email.com",
      "phone": "+52 55 5544 3322",
      "birthDate": "2001-04-18",
      "emergencyContact": {
        "name": "Jorge Navarro",
        "phone": "+52 55 9988 7766",
        "relationship": "Padre"
      },
      "medicalNotes": "Asma leve inducido por ejercicio intenso. Porta inhalador.",
      "biometricRegistered": true,
      "biometricHash": "BIO_HASH_NAVARRO_006",
      "biometricTemplate": "FP_INDEX_RIGHT_006",
      "membership": {
        "planType": "monthly",
        "planName": "Mensualidad Estándar",
        "startDate": "2026-10-05",
        "endDate": "2026-11-05",
        "price": 850,
        "status": "active",
        "daysRemaining": 29
      },
      "checkInsCount": 3,
      "totalSpentInStore": 120,
      "createdAt": "2026-10-05",
      "lastCheckIn": "2026-10-06T19:00:00Z"
    },
    {
      "id": "MEM-007",
      "fullName": "Ricardo Vargas Luna",
      "documentId": "11223344",
      "email": "ricardo.vargas@email.com",
      "phone": "+52 55 3322 1100",
      "birthDate": "1985-12-08",
      "emergencyContact": {
        "name": "Claudia Luna",
        "phone": "+52 55 6677 8899",
        "relationship": "Esposa"
      },
      "medicalNotes": "Rehabilitación lumbar completada.",
      "biometricRegistered": true,
      "biometricHash": "BIO_HASH_VARGAS_007",
      "biometricTemplate": "FP_THUMB_RIGHT_007",
      "membership": {
        "planType": "vip",
        "planName": "Membresía Black VIP Anual",
        "startDate": "2026-03-15",
        "endDate": "2027-03-15",
        "price": 9500,
        "status": "active",
        "daysRemaining": 159
      },
      "checkInsCount": 98,
      "lastCheckIn": "2026-10-07T08:45:00Z",
      "totalSpentInStore": 4200,
      "createdAt": "2025-03-15"
    },
    {
      "id": "MEM-008",
      "fullName": "Juan Solis",
      "documentId": "55892018",
      "email": "juan.solis@email.com",
      "phone": "+52 55 4829 1039",
      "birthDate": "1994-07-22",
      "emergencyContact": {
        "name": "Laura Solis",
        "phone": "+52 55 4829 1040",
        "relationship": "Hermana"
      },
      "medicalNotes": "Sin restricciones médicas.",
      "biometricRegistered": true,
      "biometricHash": "BIO_HASH_SOLIS_008",
      "biometricTemplate": "FP_THUMB_RIGHT_008",
      "membership": {
        "planType": "monthly",
        "planName": "Mensualidad Estándar",
        "startDate": "2026-10-13",
        "endDate": "2026-11-13",
        "price": 850,
        "status": "active",
        "daysRemaining": 30
      },
      "checkInsCount": 1,
      "totalSpentInStore": 0,
      "createdAt": "2026-10-13",
      "lastCheckIn": "2026-10-13T12:00:00Z"
    }
  ],
  "products": [
    {
      "id": "PROD-001",
      "name": "Gold Standard 100% Whey (5 lbs)",
      "brand": "Optimum Nutrition",
      "category": "protein",
      "price": 1450,
      "costPrice": 1100,
      "stock": 14,
      "minStock": 4,
      "image": "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=400&q=80",
      "barcode": "748927028669",
      "description": "24g de proteína de suero por porción con aislado de suero primario y 5.5g de BCAAs.",
      "flavor": "Doble Chocolate",
      "servingSize": "74 servicios (2.27 kg)",
      "soldByScoop": true,
      "scoopPrice": 35,
      "scoopsPerContainer": 74
    },
    {
      "id": "PROD-002",
      "name": "ISO 100 Hydrolyzed (5 lbs)",
      "brand": "Dymatize",
      "category": "protein",
      "price": 1890,
      "costPrice": 1450,
      "stock": 8,
      "minStock": 3,
      "image": "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=400&q=80",
      "barcode": "705016029311",
      "description": "Proteína 100% hidrolizada y aislada de absorción ultrarrápida, cero grasa y menos de 1g de azúcar.",
      "flavor": "Vainilla Gourmet",
      "servingSize": "71 servicios",
      "soldByScoop": true,
      "scoopPrice": 40,
      "scoopsPerContainer": 71
    },
    {
      "id": "PROD-003",
      "name": "Creatina Micronizada 100% Pura (600g)",
      "brand": "Optimum Nutrition",
      "category": "creatine",
      "price": 680,
      "costPrice": 480,
      "stock": 22,
      "minStock": 5,
      "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80",
      "barcode": "748927052992",
      "description": "Monohidrato de creatina de alta pureza. Aumenta potencia muscular y fuerza explosiva.",
      "flavor": "Sin Sabor (Unflavored)",
      "servingSize": "120 servicios (5g c/u)",
      "soldByScoop": true,
      "scoopPrice": 20,
      "scoopsPerContainer": 120
    },
    {
      "id": "PROD-004",
      "name": "Creapure Monohidrato Alemán (300g)",
      "brand": "Birdman",
      "category": "creatine",
      "price": 520,
      "costPrice": 370,
      "stock": 4,
      "minStock": 5,
      "image": "https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=400&q=80",
      "barcode": "750302488812",
      "description": "Sello Creapure con certificación de pureza del 99.99%. Ideal para volumen magro.",
      "flavor": "Sin Sabor",
      "servingSize": "60 servicios"
    },
    {
      "id": "PROD-005",
      "name": "C4 Original Pre-Workout (30 serv)",
      "brand": "Cellucor",
      "category": "preworkout",
      "price": 590,
      "costPrice": 410,
      "stock": 12,
      "minStock": 4,
      "image": "https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=400&q=80",
      "barcode": "842595101235",
      "description": "Energía explosiva, congestión muscular y enfoque mental con CarnoSyn Beta-Alanina y cafeína.",
      "flavor": "Icy Blue Razz",
      "servingSize": "30 servicios"
    },
    {
      "id": "PROD-006",
      "name": "Psychotic High Stimulant (35 serv)",
      "brand": "Insane Labz",
      "category": "preworkout",
      "price": 650,
      "costPrice": 460,
      "stock": 3,
      "minStock": 5,
      "image": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80",
      "barcode": "857022006001",
      "description": "Pre-entreno extremo para usuarios avanzados con complejo Ampiberry para energía sostenida.",
      "flavor": "Fruit Punch",
      "servingSize": "35 servicios"
    },
    {
      "id": "PROD-007",
      "name": "Xtend Original BCAA (30 serv)",
      "brand": "Scivation",
      "category": "aminoacids",
      "price": 540,
      "costPrice": 380,
      "stock": 15,
      "minStock": 4,
      "image": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=400&q=80",
      "barcode": "842595104885",
      "description": "7g de BCAAs en proporción probada 2:1:1 más electrolitos para recuperación intra-entreno.",
      "flavor": "Sandía (Watermelon Explosion)",
      "servingSize": "30 servicios"
    },
    {
      "id": "PROD-008",
      "name": "Monster Energy Ultra Zero (473 ml)",
      "brand": "Monster Energy",
      "category": "beverage",
      "price": 45,
      "costPrice": 28,
      "stock": 48,
      "minStock": 12,
      "image": "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?auto=format&fit=crop&w=400&q=80",
      "barcode": "070847811169",
      "description": "Bebida energizante sin azúcar con taurina, ginseng, L-carnitina y vitaminas B.",
      "flavor": "Ultra White Cero Azúcar",
      "servingSize": "Lata 473 ml"
    },
    {
      "id": "PROD-009",
      "name": "Gatorade Isotónico Cool Blue (600 ml)",
      "brand": "Gatorade",
      "category": "beverage",
      "price": 28,
      "costPrice": 17,
      "stock": 35,
      "minStock": 10,
      "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80",
      "barcode": "052000338776",
      "description": "Reposición rápida de electrolitos y carbohidratos para entrenamientos intensos.",
      "flavor": "Frambuesa Azul",
      "servingSize": "Botella 600 ml"
    },
    {
      "id": "PROD-010",
      "name": "Barebells Protein Bar (55g - 20g Prot)",
      "brand": "Barebells",
      "category": "snack",
      "price": 65,
      "costPrice": 42,
      "stock": 24,
      "minStock": 6,
      "image": "https://images.unsplash.com/photo-1622484216258-005cfa2c3008?auto=format&fit=crop&w=400&q=80",
      "barcode": "734000180023",
      "description": "Barra proteica crujiente sin azúcar añadida, con 20g de proteína de alto valor biológico.",
      "flavor": "Salty Peanut & Chocolate",
      "servingSize": "1 barra 55g"
    },
    {
      "id": "PROD-011",
      "name": "Shaker Pro Classic BlenderBottle (28 oz)",
      "brand": "BlenderBottle",
      "category": "gear",
      "price": 220,
      "costPrice": 130,
      "stock": 18,
      "minStock": 5,
      "image": "https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?auto=format&fit=crop&w=400&q=80",
      "barcode": "847280004501",
      "description": "Vaso mezclador con batidor de alambre quirúrgico BlenderBall y cierre hermético antigoteo.",
      "flavor": "Negro Mate con Logo Gold",
      "servingSize": "828 ml"
    },
    {
      "id": "PROD-012",
      "name": "Straps Profesionales de Levantamiento",
      "brand": "Legends Gear",
      "category": "gear",
      "price": 180,
      "costPrice": 90,
      "stock": 10,
      "minStock": 4,
      "image": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80",
      "barcode": "750100998811",
      "description": "Correas de algodón reforzado con acolchado de neopreno para muñeca en jalones y peso muerto.",
      "flavor": "Negro / Costura Dorada",
      "servingSize": "Par de cintas"
    }
  ],
  "sales": [],
  "expenses": [
    {
      "id": "EXP-101",
      "folio": "GAS-00101",
      "date": "2026-10-19T11:29:39.251Z",
      "category": "equipment",
      "description": "Cambio de cables de acero y poleas de estación multifuncional Matrix",
      "amount": 1450,
      "paymentMethod": "cash",
      "paidFromCashRegister": true,
      "registeredBy": "Alejandro Morales",
      "receiptNumber": "FAC-88912",
      "branchId": "branch-matriz",
      "notes": "Mantenimiento preventivo por desgaste de guaya"
    },
    {
      "id": "EXP-102",
      "folio": "GAS-00102",
      "date": "2026-10-18T14:29:39.252Z",
      "category": "cleaning",
      "description": "Insumos sanitizantes para mancuernas, toallas húmedas y atomizadores de alcohol",
      "amount": 820,
      "paymentMethod": "cash",
      "paidFromCashRegister": true,
      "registeredBy": "Valeria Gómez",
      "receiptNumber": "TKT-3341",
      "branchId": "branch-matriz",
      "notes": "Compra de garrafa de 20L de desinfectante grado hospitalario"
    },
    {
      "id": "EXP-103",
      "folio": "GAS-00103",
      "date": "2026-10-17T14:29:39.252Z",
      "category": "supplements_stock",
      "description": "Lote reposición suplementos: 15 Proteínas ISO 100 + 20 Creatinas Creapure",
      "amount": 18700,
      "paymentMethod": "transfer",
      "paidFromCashRegister": false,
      "registeredBy": "Roberto Méndez",
      "receiptNumber": "SUP-49201",
      "branchId": "branch-matriz",
      "notes": "Factura pagada a Distribuidora FitPro México"
    },
    {
      "id": "EXP-104",
      "folio": "GAS-00104",
      "date": "2026-10-16T14:29:39.252Z",
      "category": "utilities",
      "description": "Servicio CFE Electricidad Comercial de Alta Tensión (Aire Acondicionado & Luces)",
      "amount": 9850,
      "paymentMethod": "transfer",
      "paidFromCashRegister": false,
      "registeredBy": "Roberto Méndez",
      "receiptNumber": "CFE-0091823",
      "branchId": "branch-matriz",
      "notes": "Periodo de facturación bimestral"
    },
    {
      "id": "EXP-105",
      "folio": "GAS-00105",
      "date": "2026-10-15T14:29:39.252Z",
      "category": "marketing",
      "description": "Pauta en Instagram & TikTok: Campaña reto de transformación 90 días",
      "amount": 2500,
      "paymentMethod": "card",
      "paidFromCashRegister": false,
      "registeredBy": "Roberto Méndez",
      "receiptNumber": "META-77120",
      "branchId": "branch-matriz",
      "notes": "Segmentación local 5km a la redonda de Insurgentes"
    }
  ],
  "cashSession": {
    "id": "CAJA-2026-10-19",
    "openedAt": "2026-10-19T12:00:00.000Z",
    "openedBy": "Recepción Central",
    "initialCash": 1500,
    "totalSalesCash": 850,
    "totalSalesCard": 1450,
    "totalSalesTransfer": 680,
    "totalMembershipsCash": 1700,
    "totalMembershipsCard": 9500,
    "totalMembershipsTransfer": 0,
    "expectedCash": 4050,
    "status": "open"
  },
  "employees": [
    {
      "id": "EMP-001",
      "fullName": "Roberto Garza Vega",
      "documentId": "29810452",
      "email": "roberto.garza@legendsgym.com",
      "phone": "+52 55 9812 3456",
      "avatarUrl": "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80",
      "role": "admin",
      "username": "admin.roberto",
      "password": "lg_hash$f6f2ca9ee1d780b3467ee1d17faf903e",
      "pin": "lg_hash$d6314867b13ed1d6c603da1a4ff89b80",
      "jobTitle": "Gerente General & Operaciones",
      "shift": "Turno Completo",
      "status": "active",
      "hireDate": "2023-01-15",
      "salaryMonthly": 28000
    },
    {
      "id": "EMP-002",
      "fullName": "Camila Herrera Soto",
      "documentId": "41920834",
      "email": "camila.herrera@legendsgym.com",
      "phone": "+52 55 3344 1122",
      "avatarUrl": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
      "role": "receptionist",
      "username": "camila.recepcion",
      "password": "lg_hash$ebc13ca0f0fc2387138040e041f3e1eb",
      "pin": "lg_hash$087d003f03cb893f77b3c88ccadb6160",
      "jobTitle": "Líder de Recepción & Atención a Socios",
      "shift": "Matutino (06:00 - 14:00)",
      "status": "active",
      "hireDate": "2024-03-01",
      "salaryMonthly": 12500
    },
    {
      "id": "EMP-003",
      "fullName": "Marcos \"Titan\" Valenzuela",
      "documentId": "38190284",
      "email": "marcos.coach@legendsgym.com",
      "phone": "+52 55 7766 5544",
      "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
      "role": "trainer",
      "username": "marcos.coach",
      "password": "lg_hash$68eac23f695b44e50858d20a74f89635",
      "pin": "lg_hash$439a20bd47f857892e9f547424049480",
      "jobTitle": "Head Coach • Fuerza & Hipertrofia",
      "shift": "Vespertino (14:00 - 22:00)",
      "status": "active",
      "hireDate": "2023-08-10",
      "salaryMonthly": 18000
    },
    {
      "id": "EMP-004",
      "fullName": "Daniela Morales Ruiz",
      "documentId": "55192038",
      "email": "daniela.morales@legendsgym.com",
      "phone": "+52 55 4422 9988",
      "avatarUrl": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80",
      "role": "receptionist",
      "username": "daniela.caja",
      "password": "lg_hash$a3a2a6bde11a179d8200183d0505b548",
      "pin": "lg_hash$64762b58a580e1f332c6081019813bae",
      "jobTitle": "Cajera & Recepcionista Turno Tarde",
      "shift": "Vespertino (14:00 - 22:00)",
      "status": "active",
      "hireDate": "2024-07-20",
      "salaryMonthly": 11500
    }
  ],
  "roles": [],
  "settings": {
    "gymName": "LEGENDS PRO GYM",
    "legalName": "Legends Fitness & Performance S.A. de C.V.",
    "rfc": "LEG-920311-GYM",
    "phone": "(55) 1234-5678",
    "address": "Blvd. de los Campeones #500, Colonia Condesa",
    "email": "contacto@legendsgym.com",
    "turnstileTimeoutSeconds": 5,
    "allowGracePeriodDays": 2,
    "currencySymbol": "MXN ($)"
  },
  "catalogPlans": [
    {
      "id": "CAT-PLAN-001",
      "name": "Pase por Día (Day Pass)",
      "type": "daily",
      "durationDays": 1,
      "price": 150,
      "benefits": [
        "Acceso ilimitado por 1 día",
        "Área de pesas y cardio",
        "Uso de regaderas y lockers"
      ],
      "active": true
    },
    {
      "id": "CAT-PLAN-002",
      "name": "Mensualidad Estándar",
      "type": "monthly",
      "durationDays": 30,
      "price": 850,
      "benefits": [
        "Acceso 30 días",
        "Acceso biométrico con huella",
        "Rutina de inducción",
        "Clases grupales"
      ],
      "active": true
    },
    {
      "id": "CAT-PLAN-003",
      "name": "Plan Trimestral Fuerza",
      "type": "quarterly",
      "durationDays": 90,
      "price": 2300,
      "benefits": [
        "Acceso 90 días",
        "10% descuento en tienda de suplementos",
        "Evaluación InBody inicial",
        "Acceso rápido con huella"
      ],
      "active": true
    },
    {
      "id": "CAT-PLAN-004",
      "name": "Membresía Black VIP Anual",
      "type": "annual",
      "durationDays": 365,
      "price": 9500,
      "benefits": [
        "Acceso VIP 365 días",
        "Playera conmemorativa Legends",
        "15% de descuento en suplementos",
        "Locker preferencial",
        "Pases de cortesía para invitados (12 al año)"
      ],
      "active": true
    }
  ],
  "branches": [],
  "accessLogs": [
    {
      "id": "LOG-1792171825059",
      "timestamp": "2026-10-16T17:30:25.058Z",
      "clientId": "MEM-001",
      "clientName": "Carlos Mendoza",
      "avatarUrl": "preset:2",
      "status": "granted",
      "reason": "Acceso Autorizado - Membresía Black VIP Anual",
      "planName": "Membresía Black VIP Anual",
      "daysRemaining": 95,
      "method": "fingerprint"
    },
    {
      "id": "LOG-1792171810827",
      "timestamp": "2026-10-16T17:30:10.826Z",
      "clientId": "MEM-001",
      "clientName": "Carlos Mendoza",
      "avatarUrl": "preset:2",
      "status": "granted",
      "reason": "Acceso Autorizado - Membresía Black VIP Anual",
      "planName": "Membresía Black VIP Anual",
      "daysRemaining": 95,
      "method": "fingerprint"
    },
    {
      "id": "LOG-1792171803793",
      "timestamp": "2026-10-16T17:30:03.792Z",
      "clientId": "MEM-001",
      "clientName": "Carlos Mendoza",
      "avatarUrl": "preset:2",
      "status": "granted",
      "reason": "Acceso Autorizado - Membresía Black VIP Anual",
      "planName": "Membresía Black VIP Anual",
      "daysRemaining": 95,
      "method": "fingerprint"
    },
    {
      "id": "LOG-1792171795801",
      "timestamp": "2026-10-16T17:29:55.799Z",
      "clientId": "MEM-001",
      "clientName": "Carlos Mendoza",
      "avatarUrl": "preset:2",
      "status": "granted",
      "reason": "Acceso Autorizado - Membresía Black VIP Anual",
      "planName": "Membresía Black VIP Anual",
      "daysRemaining": 95,
      "method": "fingerprint"
    },
    {
      "id": "LOG-1791916957704",
      "timestamp": "2026-10-13T18:42:37.703Z",
      "clientId": "MEM-001",
      "clientName": "Carlos Mendoza",
      "status": "granted",
      "reason": "Acceso Autorizado - Membresía Black VIP Anual",
      "planName": "Membresía Black VIP Anual",
      "daysRemaining": 95,
      "method": "fingerprint"
    },
    {
      "id": "LOG-1791916933074",
      "timestamp": "2026-10-13T18:42:13.073Z",
      "clientName": "Huella No Identificada",
      "status": "denied",
      "reason": "Huella biométrica no registrada en el sistema",
      "method": "fingerprint"
    },
    {
      "id": "LOG-1791916903840",
      "timestamp": "2026-10-13T18:41:43.839Z",
      "clientId": "MEM-001",
      "clientName": "Carlos Mendoza",
      "status": "granted",
      "reason": "Acceso Autorizado - Membresía Black VIP Anual",
      "planName": "Membresía Black VIP Anual",
      "daysRemaining": 95,
      "method": "fingerprint"
    },
    {
      "id": "LOG-1791916567690",
      "timestamp": "2026-10-13T18:36:07.686Z",
      "clientId": "MEM-001",
      "clientName": "Carlos Mendoza",
      "status": "granted",
      "reason": "Acceso Autorizado - Membresía Black VIP Anual",
      "planName": "Membresía Black VIP Anual",
      "daysRemaining": 95,
      "method": "fingerprint"
    },
    {
      "id": "LOG-1791916562698",
      "timestamp": "2026-10-13T18:36:02.696Z",
      "clientName": "Huella No Identificada",
      "status": "denied",
      "reason": "Huella biométrica no registrada en el sistema",
      "method": "fingerprint"
    },
    {
      "id": "LOG-1791916558890",
      "timestamp": "2026-10-13T18:35:58.888Z",
      "clientId": "MEM-003",
      "clientName": "Alejandro Soto Vega",
      "status": "granted",
      "reason": "Acceso Autorizado - Plan Trimestral Fuerza",
      "planName": "Plan Trimestral Fuerza",
      "daysRemaining": 2,
      "method": "fingerprint"
    },
    {
      "id": "LOG-1791916551375",
      "timestamp": "2026-10-13T18:35:51.374Z",
      "clientId": "MEM-003",
      "clientName": "Alejandro Soto Vega",
      "status": "granted",
      "reason": "Acceso Autorizado - Plan Trimestral Fuerza",
      "planName": "Plan Trimestral Fuerza",
      "daysRemaining": 2,
      "method": "fingerprint"
    },
    {
      "id": "LOG-1791916542766",
      "timestamp": "2026-10-13T18:35:42.763Z",
      "clientId": "MEM-001",
      "clientName": "Carlos Mendoza",
      "status": "granted",
      "reason": "Acceso Autorizado - Membresía Black VIP Anual",
      "planName": "Membresía Black VIP Anual",
      "daysRemaining": 95,
      "method": "fingerprint"
    },
    {
      "id": "LOG-1791916536258",
      "timestamp": "2026-10-13T18:35:36.254Z",
      "clientId": "MEM-001",
      "clientName": "Carlos Mendoza",
      "status": "granted",
      "reason": "Acceso Autorizado - Membresía Black VIP Anual",
      "planName": "Membresía Black VIP Anual",
      "daysRemaining": 95,
      "method": "fingerprint"
    },
    {
      "id": "LOG-TEST-1791824364124",
      "timestamp": "2026-10-12T16:59:24.124Z",
      "clientId": "MEM-001",
      "clientName": "Carlos Mendoza",
      "status": "granted",
      "reason": "Acceso Autorizado - Membresía Black VIP Anual",
      "planName": "Membresía Black VIP Anual",
      "daysRemaining": 95,
      "method": "fingerprint"
    }
  ],
  "deletedMemberIds": [],
  "deletedProductIds": [],
  "deletedExpenseIds": [],
  "deletedEmployeeIds": []
};

// Check if Upstash / Vercel KV is available
async function kvFetch(command, ...args) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([command, ...args])
    });
    if (res.ok) {
      const json = await res.json();
      return json.result;
    }
  } catch {}

  try {
    const res = await fetch(`${url}/${command}/${args.map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      return json.result;
    }
  } catch {}

  return null;
}

export async function getFullDatabase() {
  const kvData = await kvFetch('GET', 'legends_gym_store');
  if (kvData) {
    try {
      const parsed = typeof kvData === 'string' ? JSON.parse(kvData) : kvData;
      if (parsed && typeof parsed === 'object') {
        store = { ...store, ...parsed };
      }
    } catch {}
  }
  return store;
}

export async function saveFullDatabase(incoming) {
  await getFullDatabase();
  if (!incoming || typeof incoming !== 'object') return store;

  // Merge members
  if (Array.isArray(incoming.members)) {
    if (!Array.isArray(store.deletedMemberIds)) store.deletedMemberIds = [];
    const map = new Map();
    for (const m of store.members || []) {
      if (m && m.id && !store.deletedMemberIds.includes(m.id)) map.set(m.id, m);
    }
    for (const m of incoming.members) {
      if (m && m.id && !store.deletedMemberIds.includes(m.id)) {
        map.set(m.id, { ...(map.get(m.id) || {}), ...m });
      }
    }
    store.members = Array.from(map.values());
  }

  // Merge products
  if (Array.isArray(incoming.products)) {
    if (!Array.isArray(store.deletedProductIds)) store.deletedProductIds = [];
    const map = new Map();
    for (const p of store.products || []) {
      if (p && p.id && !store.deletedProductIds.includes(p.id)) map.set(p.id, p);
    }
    for (const p of incoming.products) {
      if (p && p.id && !store.deletedProductIds.includes(p.id)) {
        map.set(p.id, { ...(map.get(p.id) || {}), ...p });
      }
    }
    store.products = Array.from(map.values());
  }

  // Merge sales (unique by id)
  if (Array.isArray(incoming.sales)) {
    const map = new Map();
    for (const s of store.sales || []) {
      if (s && s.id) map.set(s.id, s);
    }
    for (const s of incoming.sales) {
      if (s && s.id) map.set(s.id, { ...(map.get(s.id) || {}), ...s });
    }
    store.sales = Array.from(map.values()).sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }

  // Merge expenses (unique by id)
  if (Array.isArray(incoming.expenses)) {
    if (!Array.isArray(store.deletedExpenseIds)) store.deletedExpenseIds = [];
    const map = new Map();
    for (const e of store.expenses || []) {
      if (e && e.id && !store.deletedExpenseIds.includes(e.id)) map.set(e.id, e);
    }
    for (const e of incoming.expenses) {
      if (e && e.id && !store.deletedExpenseIds.includes(e.id)) {
        map.set(e.id, { ...(map.get(e.id) || {}), ...e });
      }
    }
    store.expenses = Array.from(map.values()).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }

  // Cash Session
  if (incoming.cashSession) {
    store.cashSession = incoming.cashSession;
  }

  // Employees
  if (Array.isArray(incoming.employees)) {
    if (!Array.isArray(store.deletedEmployeeIds)) store.deletedEmployeeIds = [];
    const map = new Map();
    for (const emp of store.employees || []) {
      if (emp && emp.id && !store.deletedEmployeeIds.includes(emp.id)) map.set(emp.id, emp);
    }
    for (const emp of incoming.employees) {
      if (emp && emp.id && !store.deletedEmployeeIds.includes(emp.id)) {
        map.set(emp.id, { ...(map.get(emp.id) || {}), ...emp });
      }
    }
    store.employees = Array.from(map.values());
  }

  // Settings
  if (incoming.settings && typeof incoming.settings === 'object') {
    store.settings = { ...(store.settings || {}), ...incoming.settings };
  }

  // Catalog Plans
  if (Array.isArray(incoming.catalogPlans)) {
    const map = new Map();
    for (const p of store.catalogPlans || []) {
      if (p && p.id) map.set(p.id, p);
    }
    for (const p of incoming.catalogPlans) {
      if (p && p.id) map.set(p.id, { ...(map.get(p.id) || {}), ...p });
    }
    store.catalogPlans = Array.from(map.values());
  }

  // Access Logs
  if (Array.isArray(incoming.accessLogs)) {
    const map = new Map();
    for (const l of store.accessLogs || []) {
      if (l && l.id) map.set(l.id, l);
    }
    for (const l of incoming.accessLogs) {
      if (l && l.id) map.set(l.id, l);
    }
    store.accessLogs = Array.from(map.values()).slice(0, 1000);
  }

  store.version += 1;
  store.updatedAt = new Date().toISOString();
  await kvFetch('SET', 'legends_gym_store', JSON.stringify(store));
  return store;
}

export async function updateEntity(entity, action, item, itemId) {
  await getFullDatabase();

  if (entity === 'products') {
    if (!Array.isArray(store.products)) store.products = [];
    if (!Array.isArray(store.deletedProductIds)) store.deletedProductIds = [];
    if (action === 'delete') {
      const id = itemId || item?.id;
      if (id) {
        store.deletedProductIds.push(id);
        store.products = store.products.filter(p => p.id !== id);
      }
    } else if (item && item.id) {
      store.deletedProductIds = store.deletedProductIds.filter(id => id !== item.id);
      const exists = store.products.some(p => p.id === item.id);
      if (exists) {
        store.products = store.products.map(p => p.id === item.id ? { ...p, ...item } : p);
      } else {
        store.products = [item, ...store.products];
      }
    }
  } else if (entity === 'sales') {
    if (!Array.isArray(store.sales)) store.sales = [];
    if (item && item.id) {
      const exists = store.sales.some(s => s.id === item.id);
      if (exists) {
        store.sales = store.sales.map(s => s.id === item.id ? { ...s, ...item } : s);
      } else {
        store.sales = [item, ...store.sales];
      }
    }
  } else if (entity === 'expenses') {
    if (!Array.isArray(store.expenses)) store.expenses = [];
    if (!Array.isArray(store.deletedExpenseIds)) store.deletedExpenseIds = [];
    if (action === 'delete') {
      const id = itemId || item?.id;
      if (id) {
        store.deletedExpenseIds.push(id);
        store.expenses = store.expenses.filter(e => e.id !== id);
      }
    } else if (item && item.id) {
      store.deletedExpenseIds = store.deletedExpenseIds.filter(id => id !== item.id);
      const exists = store.expenses.some(e => e.id === item.id);
      if (exists) {
        store.expenses = store.expenses.map(e => e.id === item.id ? { ...e, ...item } : e);
      } else {
        store.expenses = [item, ...store.expenses];
      }
    }
  } else if (entity === 'cashSession') {
    if (item) store.cashSession = item;
  } else if (entity === 'employees') {
    if (!Array.isArray(store.employees)) store.employees = [];
    if (!Array.isArray(store.deletedEmployeeIds)) store.deletedEmployeeIds = [];
    if (action === 'delete') {
      const id = itemId || item?.id;
      if (id) {
        store.deletedEmployeeIds.push(id);
        store.employees = store.employees.filter(e => e.id !== id);
      }
    } else if (item && item.id) {
      store.deletedEmployeeIds = store.deletedEmployeeIds.filter(id => id !== item.id);
      const exists = store.employees.some(e => e.id === item.id);
      if (exists) {
        store.employees = store.employees.map(e => e.id === item.id ? { ...e, ...item } : e);
      } else {
        store.employees = [item, ...store.employees];
      }
    }
  } else if (entity === 'settings') {
    if (item) store.settings = { ...(store.settings || {}), ...item };
  } else if (entity === 'catalogPlans') {
    if (!Array.isArray(store.catalogPlans)) store.catalogPlans = [];
    if (action === 'delete') {
      const id = itemId || item?.id;
      if (id) store.catalogPlans = store.catalogPlans.filter(p => p.id !== id);
    } else if (item && item.id) {
      const exists = store.catalogPlans.some(p => p.id === item.id);
      if (exists) {
        store.catalogPlans = store.catalogPlans.map(p => p.id === item.id ? { ...p, ...item } : p);
      } else {
        store.catalogPlans = [...store.catalogPlans, item];
      }
    }
  }

  store.version += 1;
  store.updatedAt = new Date().toISOString();
  await kvFetch('SET', 'legends_gym_store', JSON.stringify(store));
  return store;
}

// Backward-compatible methods
export async function getMembers() {
  await getFullDatabase();
  return store;
}

export async function saveMembers(members) {
  return saveFullDatabase({ members });
}

export async function addOrUpdateMember(member) {
  await getFullDatabase();
  if (!Array.isArray(store.deletedMemberIds)) store.deletedMemberIds = [];
  store.deletedMemberIds = store.deletedMemberIds.filter(id => id !== member.id);
  const filtered = store.members.filter(m => m.id !== member.id);
  store.members = [member, ...filtered];
  store.version += 1;
  store.updatedAt = new Date().toISOString();
  await kvFetch('SET', 'legends_gym_store', JSON.stringify(store));
  return store;
}

export async function deleteMember(memberId) {
  await getFullDatabase();
  if (!Array.isArray(store.deletedMemberIds)) store.deletedMemberIds = [];
  if (!store.deletedMemberIds.includes(memberId)) store.deletedMemberIds.push(memberId);
  store.members = store.members.filter(m => m.id !== memberId);
  store.version += 1;
  store.updatedAt = new Date().toISOString();
  await kvFetch('SET', 'legends_gym_store', JSON.stringify(store));
  return store;
}

export async function addAccessLog(log) {
  await getFullDatabase();
  store.accessLogs = [log, ...(store.accessLogs || [])].slice(0, 1000);
  store.version += 1;
  store.updatedAt = new Date().toISOString();
  await kvFetch('SET', 'legends_gym_store', JSON.stringify(store));
  return store;
}

export async function getAccessLogs() {
  await getFullDatabase();
  return store.accessLogs;
}
