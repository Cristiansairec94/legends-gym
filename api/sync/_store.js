// In-memory backing store for Vercel serverless functions with optional Upstash/KV persistence
let store = {
  version: 1,
  updatedAt: new Date().toISOString(),
  members: [
    {
      id: 'MEM-001',
      fullName: 'Carlos Mendoza',
      documentId: '45892011',
      email: 'carlos.mendoza@email.com',
      phone: '+52 55 1234 5678',
      biometricRegistered: true,
      biometricHash: 'BIO_HASH_MENDOZA_001',
      biometricTemplate: 'FP_THUMB_RIGHT_001',
      membership: {
        planType: 'vip',
        planName: 'Membresía Black VIP Anual',
        startDate: '2026-01-10',
        endDate: '2027-01-10',
        price: 9500,
        status: 'active',
        daysRemaining: 95,
      },
      checkInsCount: 142,
      lastCheckIn: '2026-10-06T18:30:00Z',
      totalSpentInStore: 3450,
      createdAt: '2025-01-10',
    },
    {
      id: 'MEM-002',
      fullName: 'Valeria Ríos Gómez',
      documentId: '78291034',
      email: 'valeria.rios@email.com',
      phone: '+52 55 4433 2211',
      biometricRegistered: true,
      biometricHash: 'BIO_HASH_RIOS_002',
      biometricTemplate: 'FP_INDEX_RIGHT_002',
      membership: {
        planType: 'monthly',
        planName: 'Mensualidad Estándar',
        startDate: '2026-09-15',
        endDate: '2026-10-15',
        price: 850,
        status: 'active',
        daysRemaining: 2,
      },
      checkInsCount: 18,
      lastCheckIn: '2026-10-05T09:15:00Z',
      totalSpentInStore: 620,
      createdAt: '2025-03-15',
    },
    {
      id: 'MEM-003',
      fullName: 'Alejandro Morales',
      documentId: '12903844',
      email: 'alex.morales@email.com',
      phone: '+52 55 8899 0011',
      biometricRegistered: true,
      biometricHash: 'BIO_HASH_MORALES_003',
      biometricTemplate: 'FP_THUMB_LEFT_003',
      membership: {
        planType: 'quarterly',
        planName: 'Plan Trimestral Fuerza',
        startDate: '2026-07-01',
        endDate: '2026-10-01',
        price: 2200,
        status: 'expired',
        daysRemaining: -12,
      },
      checkInsCount: 45,
      lastCheckIn: '2026-09-28T19:40:00Z',
      totalSpentInStore: 1100,
      createdAt: '2024-11-20',
    },
    {
      id: 'MEM-004',
      fullName: 'Sofía Domínguez',
      documentId: '89104523',
      email: 'sofia.dominguez@email.com',
      phone: '+52 55 6655 4433',
      biometricRegistered: true,
      biometricHash: 'BIO_HASH_DOMINGUEZ_004',
      biometricTemplate: 'FP_INDEX_RIGHT_004',
      membership: {
        planType: 'monthly',
        planName: 'Mensualidad Estándar',
        startDate: '2026-09-02',
        endDate: '2026-10-02',
        price: 850,
        status: 'expired',
        daysRemaining: -5,
      },
      checkInsCount: 19,
      lastCheckIn: '2026-10-01T17:10:00Z',
      totalSpentInStore: 350,
      createdAt: '2026-05-02',
    },
    {
      id: 'MEM-005',
      fullName: 'Mateo Guerrero',
      documentId: '34519820',
      email: 'mateo.guerrero@email.com',
      phone: '+52 55 8899 0011',
      biometricRegistered: true,
      biometricHash: 'BIO_HASH_GUERRERO_005',
      biometricTemplate: 'FP_THUMB_LEFT_005',
      membership: {
        planType: 'annual',
        planName: 'Plan Anual Élite',
        startDate: '2025-11-01',
        endDate: '2026-11-01',
        price: 7500,
        status: 'active',
        daysRemaining: 25,
      },
      checkInsCount: 215,
      lastCheckIn: '2026-10-07T06:00:00Z',
      totalSpentInStore: 5890,
      createdAt: '2024-11-01',
    },
    {
      id: 'MEM-006',
      fullName: 'Camila Navarro',
      documentId: '91023487',
      email: 'camila.navarro@email.com',
      phone: '+52 55 5544 3322',
      biometricRegistered: true,
      biometricHash: 'BIO_HASH_NAVARRO_006',
      biometricTemplate: 'FP_INDEX_RIGHT_006',
      membership: {
        planType: 'monthly',
        planName: 'Mensualidad Estándar',
        startDate: '2026-10-05',
        endDate: '2026-11-05',
        price: 850,
        status: 'active',
        daysRemaining: 29,
      },
      checkInsCount: 3,
      lastCheckIn: '2026-10-06T19:00:00Z',
      totalSpentInStore: 120,
      createdAt: '2026-10-05',
    },
    {
      id: 'MEM-007',
      fullName: 'Ricardo Vargas Luna',
      documentId: '11223344',
      email: 'ricardo.vargas@email.com',
      phone: '+52 55 3322 1100',
      biometricRegistered: true,
      biometricHash: 'BIO_HASH_VARGAS_007',
      biometricTemplate: 'FP_THUMB_RIGHT_007',
      membership: {
        planType: 'vip',
        planName: 'Membresía Black VIP Anual',
        startDate: '2026-03-15',
        endDate: '2027-03-15',
        price: 9500,
        status: 'active',
        daysRemaining: 159,
      },
      checkInsCount: 98,
      lastCheckIn: '2026-10-07T08:45:00Z',
      totalSpentInStore: 4200,
      createdAt: '2025-03-15',
    },
    {
      id: 'MEM-008',
      fullName: 'Juan Solis',
      documentId: '55892018',
      email: 'juan.solis@email.com',
      phone: '+52 55 4829 1039',
      biometricRegistered: true,
      biometricHash: 'BIO_HASH_SOLIS_008',
      biometricTemplate: 'FP_THUMB_RIGHT_008',
      membership: {
        planType: 'monthly',
        planName: 'Mensualidad Estándar',
        startDate: '2026-10-13',
        endDate: '2026-11-13',
        price: 850,
        status: 'active',
        daysRemaining: 30,
      },
      checkInsCount: 1,
      lastCheckIn: '2026-10-13T12:00:00Z',
      totalSpentInStore: 0,
      createdAt: '2026-10-13',
    }
  ],
  products: [],
  sales: [],
  expenses: [],
  cashSession: null,
  employees: [],
  roles: [],
  settings: null,
  catalogPlans: [],
  branches: [],
  accessLogs: [],
  deletedMemberIds: [],
  deletedProductIds: [],
  deletedExpenseIds: [],
  deletedEmployeeIds: []
};

// Check if Upstash / Vercel KV is available
async function kvFetch(command, ...args) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    // Upstash REST API POST format handles arbitrarily large JSON payloads
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

  // Fallback to GET endpoint
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
  store.accessLogs = [log, ...store.accessLogs].slice(0, 1000);
  await kvFetch('SET', 'legends_gym_store', JSON.stringify(store));
  return store;
}

export async function getAccessLogs() {
  await getFullDatabase();
  return store.accessLogs;
}
