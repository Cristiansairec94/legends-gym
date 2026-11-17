// In-memory backing store for Vercel serverless functions with optional Upstash/KV persistence
let store = {
  "version": 45,
  "updatedAt": "2026-10-20T15:12:20.539Z",
  "members": [],
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
  ],
  "branches": [],
  "accessLogs": [],
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
