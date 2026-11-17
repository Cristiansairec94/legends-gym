import { Employee, RoleDefinition, GymSettings, SystemCatalogPlan } from '../types';

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-001',
    fullName: 'Roberto Garza Vega',
    documentId: '29810452',
    email: 'roberto.garza@legendsgym.com',
    phone: '+52 55 9812 3456',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
    role: 'admin',
    username: 'admin.roberto',
    password: '1234',
    pin: '1234',
    jobTitle: 'Gerente General & Operaciones',
    shift: 'Turno Completo',
    status: 'active',
    hireDate: '2023-01-15',
    salaryMonthly: 28000,
  },
  {
    id: 'EMP-002',
    fullName: 'Camila Herrera Soto',
    documentId: '41920834',
    email: 'camila.herrera@legendsgym.com',
    phone: '+52 55 3344 1122',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    role: 'receptionist',
    username: 'camila.recepcion',
    password: '1234',
    pin: '1234',
    jobTitle: 'Líder de Recepción & Atención a Socios',
    shift: 'Matutino (06:00 - 14:00)',
    status: 'active',
    hireDate: '2024-03-01',
    salaryMonthly: 12500,
  },
  {
    id: 'EMP-003',
    fullName: 'Marcos "Titan" Valenzuela',
    documentId: '38190284',
    email: 'marcos.coach@legendsgym.com',
    phone: '+52 55 7766 5544',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    role: 'trainer',
    username: 'marcos.coach',
    password: '1234',
    pin: '1234',
    jobTitle: 'Head Coach • Fuerza & Hipertrofia',
    shift: 'Vespertino (14:00 - 22:00)',
    status: 'active',
    hireDate: '2023-08-10',
    salaryMonthly: 18000,
  },
  {
    id: 'EMP-004',
    fullName: 'Daniela Morales Ruiz',
    documentId: '55192038',
    email: 'daniela.morales@legendsgym.com',
    phone: '+52 55 4422 9988',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    role: 'receptionist',
    username: 'daniela.caja',
    password: '1234',
    pin: '1234',
    jobTitle: 'Cajera & Recepcionista Turno Tarde',
    shift: 'Vespertino (14:00 - 22:00)',
    status: 'active',
    hireDate: '2024-07-20',
    salaryMonthly: 11500,
  },
];

export const INITIAL_ROLES: RoleDefinition[] = [
  {
    id: 'admin',
    name: 'Administrador General',
    badgeText: 'Admin',
    description: 'Acceso total sin restricciones a todas las funciones financieras, inventario, socios y configuración.',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    permissions: {
      accessTurnstile: true,
      manageClients: true,
      enrollBiometrics: true,
      posSales: true,
      manageInventory: true,
      cashRegister: true,
      viewReports: true,
      manageSettings: true,
      manageEmployees: true,
    },
  },
  {
    id: 'receptionist',
    name: 'Recepción & Cajero',
    badgeText: 'Recepción',
    description: 'Control de caja, venta de suplementos en mostrador, cobro de cuotas y enrolamiento biométrico de clientes.',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    permissions: {
      accessTurnstile: true,
      manageClients: true,
      enrollBiometrics: true,
      posSales: true,
      manageInventory: false,
      cashRegister: true,
      viewReports: false,
      manageSettings: false,
      manageEmployees: false,
    },
  },
  {
    id: 'trainer',
    name: 'Coach / Entrenador',
    badgeText: 'Coach',
    description: 'Consulta de socios, asistencias a clases, rutinas y expedientes médicos. Sin acceso a caja ni almacén.',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    permissions: {
      accessTurnstile: true,
      manageClients: true,
      enrollBiometrics: false,
      posSales: false,
      manageInventory: false,
      cashRegister: false,
      viewReports: true,
      manageSettings: false,
      manageEmployees: false,
    },
  },
];

export const INITIAL_SETTINGS: GymSettings = {
  gymName: 'LEGENDS PRO GYM',
  legalName: 'Legends Fitness & Performance S.A. de C.V.',
  rfc: 'LEG-920311-GYM',
  phone: '(55) 1234-5678',
  address: 'Blvd. de los Campeones #500, Colonia Condesa',
  email: 'contacto@legendsgym.com',
  turnstileTimeoutSeconds: 5,
  allowGracePeriodDays: 2,
  currencySymbol: 'MXN ($)',
};

export const LEGACY_REMOVED_PLAN_IDS = new Set(['CAT-PLAN-001', 'CAT-PLAN-007', 'CAT-PLAN-008']);

export function filterLegacyCatalogPlans(plans: SystemCatalogPlan[]): SystemCatalogPlan[] {
  return (plans || []).filter((p) => {
    if (!p || !p.id) return false;
    if (LEGACY_REMOVED_PLAN_IDS.has(p.id)) return false;
    if (p.name === 'Mensualidad Estándar' && p.price === 850) return false;
    if (p.name === 'Plan Trimestral Fuerza' && p.price === 2300) return false;
    if (p.name === 'Membresía Black VIP Anual' && p.price === 9500) return false;
    if (p.name === 'Pase por Día (Day Pass)' && p.price === 150) return false;
    return true;
  });
}

export const INITIAL_CATALOG_PLANS: SystemCatalogPlan[] = [
  {
    "id": "CAT-PLAN-002",
    "name": "Pase Semanal (Semana por persona)",
    "type": "weekly",
    "durationDays": 7,
    "price": 150,
    "benefits": [
      "Acceso por 7 días",
      "Área de pesas y cardio",
      "Acceso biométrico con huella"
    ],
    "active": true
  },
  {
    "id": "CAT-PLAN-003",
    "name": "Pase Quincenal (15 Días)",
    "type": "biweekly",
    "durationDays": 15,
    "price": 250,
    "benefits": [
      "Acceso por 15 días continuos",
      "Área de pesas y cardio",
      "Acceso biométrico con huella"
    ],
    "active": true
  },
  {
    "id": "CAT-PLAN-004",
    "name": "Mensualidad Individual",
    "type": "monthly",
    "durationDays": 30,
    "price": 420,
    "benefits": [
      "Acceso completo 30 días",
      "Acceso biométrico con huella",
      "Rutina de inducción",
      "Pesas y cardio"
    ],
    "active": true
  },
  {
    "id": "CAT-PLAN-005",
    "name": "Paquete 3 Personas (Mensual)",
    "type": "group",
    "durationDays": 30,
    "price": 1100,
    "benefits": [
      "Acceso mensual para 3 personas ($366/persona)",
      "Acceso biométrico individual",
      "Pesas y cardio"
    ],
    "active": true
  },
  {
    "id": "CAT-PLAN-006",
    "name": "Paquete 4 Personas (Mensual)",
    "type": "group",
    "durationDays": 30,
    "price": 1500,
    "benefits": [
      "Acceso mensual para 4 personas ($375/persona)",
      "Acceso biométrico individual",
      "Pesas y cardio"
    ],
    "active": true
  }
];
