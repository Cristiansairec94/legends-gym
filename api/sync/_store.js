// Serverless sync backing store for Vercel (with Vercel KV / Upstash Redis persistence + in-memory fallback)

const LEGACY_REMOVED_PLAN_IDS = new Set(['CAT-PLAN-001', 'CAT-PLAN-007']);

function isLegacyRemovedPlan(plan) {
  if (!plan || !plan.id) return true;
  if (LEGACY_REMOVED_PLAN_IDS.has(plan.id)) return true;
  const name = String(plan.name || '').toLowerCase();
  if (name.includes('pase por día') || name.includes('pase por dia') || name.includes('black vip')) {
    return true;
  }
  return false;
}

function sanitizeRoles(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((r) => r && r.id && String(r.id) !== 'trainer');
}

export function resolveSaleType(raw) {
  if (!raw) return 'store';
  const notes = String(raw.notes || '').toLowerCase();
  const planName = String(raw.planName || '').toLowerCase();
  const folio = String(raw.folio || '').toUpperCase();
  const items = Array.isArray(raw.items) ? raw.items : [];
  const itemText = items
    .map((i) => `${i?.product?.name || ''} ${i?.name || ''} ${i?.product?.id || ''}`)
    .join(' ')
    .toLowerCase();

  const isVisitByText =
    notes.includes('pase de visita') ||
    notes.includes('visita de ') ||
    planName.includes('pase de visita') ||
    folio.startsWith('VIS-') ||
    itemText.includes('pase de visita') ||
    itemText.includes('prod_visit_pass');

  if (raw.saleType === 'visit' || isVisitByText) return 'visit';
  if (raw.saleType === 'membership') return 'membership';
  if (
    raw.planType ||
    planName.includes('mensualidad') ||
    planName.includes('paquete') ||
    planName.includes('semanal') ||
    planName.includes('quincenal') ||
    notes.includes('inscripción') ||
    notes.includes('renovación') ||
    notes.includes('alta y cobro') ||
    notes.includes('alta grupal')
  ) {
    return 'membership';
  }
  return 'store';
}

export function normalizeServerSale(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const total = Number(raw.total ?? raw.amountPaid ?? 0) || 0;
  const id = raw.id || `SALE_${Date.now()}`;
  const saleType = resolveSaleType(raw);
  const defaultTitle = raw.planName || (saleType === 'visit' ? 'Pase de Visita' : 'Cobro de acceso');
  const rawItems = Array.isArray(raw.items) && raw.items.length > 0 ? raw.items : null;
  const items = rawItems
    ? rawItems.map((it) => {
        const unitPrice = Number(it?.unitPrice ?? it?.price ?? total) || 0;
        const qty = Number(it?.quantity ?? 1) || 1;
        const prodName = it?.product?.name || it?.name || defaultTitle;
        return {
          ...it,
          product:
            it?.product && it.product.name
              ? it.product
              : {
                  id: it?.id || (saleType === 'visit' ? 'prod_visit_pass' : 'ITEM_GYM_COLLECTION'),
                  name: prodName,
                  brand: 'LEGENDS GYM',
                  category: 'gear',
                  price: unitPrice,
                  costPrice: 0,
                  stock: 9999,
                  minStock: 0,
                },
          quantity: qty,
          unitPrice,
          subtotal: Number(it?.subtotal ?? it?.total ?? unitPrice * qty) || 0,
        };
      })
    : [
        {
          product: {
            id: saleType === 'visit' ? 'prod_visit_pass' : 'ITEM_GYM_COLLECTION',
            name: defaultTitle,
            brand: 'LEGENDS GYM',
            category: 'gear',
            price: total,
            costPrice: 0,
            stock: 9999,
            minStock: 0,
          },
          quantity: 1,
          unitPrice: total,
          subtotal: total,
        },
      ];

  return {
    ...raw,
    id,
    folio: raw.folio || (saleType === 'visit' ? `VIS-${String(id).slice(-4)}` : id),
    timestamp: raw.timestamp || new Date().toISOString(),
    clientName: raw.clientName || 'Visitante del Día',
    items,
    subtotal: Number(raw.subtotal ?? total) || 0,
    tax: Number(raw.tax ?? 0) || 0,
    total,
    paymentMethod: raw.paymentMethod || 'cash',
    amountPaid: Number(raw.amountPaid ?? total) || 0,
    changeGiven: Number(raw.changeGiven ?? 0) || 0,
    cashierName: raw.cashierName || raw.authorizedBy || 'Recepción (RP)',
    cashierRole: raw.cashierRole || 'admin',
    saleType,
    planName: raw.planName || (saleType === 'visit' ? 'Pase de Visita' : undefined),
  };
}

const DEFAULT_STORE = {
  version: 1,
  updatedAt: '2026-10-20T15:12:20.539Z',
  members: [],
  products: [],
  sales: [],
  expenses: [],
  employees: [],
  roles: [],
  branches: [],
  accessLogs: [],
  cashSession: null,
  terminalDesign: null,
  pendingVisitRequests: [],
  visitStatuses: {},
  pendingRegistrationRequests: [],
  registrationStatuses: {},
  recentEvents: [],
  deletedMemberIds: [],
  deletedProductIds: [],
  deletedExpenseIds: [],
  deletedEmployeeIds: [],
  settings: {
    gymName: 'LEGENDS PRO GYM',
    legalName: 'Legends Fitness & Performance S.A. de C.V.',
    rfc: 'LEG-920311-GYM',
    phone: '(55) 1234-5678',
    address: 'Blvd. de los Campeones #500, Colonia Condesa',
    email: 'contacto@legendsgym.com',
    turnstileTimeoutSeconds: 5,
    allowGracePeriodDays: 2,
    currencySymbol: 'MXN ($)',
  },
  catalogPlans: [
    {
      id: 'CAT-PLAN-002',
      name: 'Pase Semanal (Semana por persona)',
      type: 'weekly',
      durationDays: 7,
      price: 150,
      benefits: ['Acceso por 7 días', 'Área de pesas y cardio', 'Acceso biométrico con huella'],
      active: true,
    },
    {
      id: 'CAT-PLAN-003',
      name: 'Pase Quincenal (15 Días)',
      type: 'biweekly',
      durationDays: 15,
      price: 250,
      benefits: ['Acceso por 15 días continuos', 'Área de pesas y cardio', 'Acceso biométrico con huella'],
      active: true,
    },
    {
      id: 'CAT-PLAN-004',
      name: 'Mensualidad Individual',
      type: 'monthly',
      durationDays: 30,
      price: 420,
      benefits: ['Acceso completo 30 días', 'Acceso biométrico con huella', 'Rutina de inducción', 'Pesas y cardio'],
      active: true,
    },
    {
      id: 'CAT-PLAN-005',
      name: 'Paquete 3 Personas (Mensual)',
      type: 'group',
      durationDays: 30,
      price: 1100,
      benefits: ['Acceso mensual para 3 personas ($366/persona)', 'Acceso biométrico individual', 'Pesas y cardio'],
      active: true,
    },
    {
      id: 'CAT-PLAN-006',
      name: 'Paquete 4 Personas (Mensual)',
      type: 'group',
      durationDays: 30,
      price: 1500,
      benefits: ['Acceso mensual para 4 personas ($375/persona)', 'Acceso biométrico individual', 'Pesas y cardio'],
      active: true,
    },
  ],
};

let store = structuredClone(DEFAULT_STORE);
let lastPersistError = null;
const KV_KEY = 'legends_gym_store_v2';

export function getStorageDiagnostics() {
  const hasVercelKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  const persistentStorage = hasVercelKv || hasUpstash;
  const storageBackend = hasVercelKv
    ? 'vercel-kv'
    : hasUpstash
    ? 'upstash-redis'
    : 'memory-ephemeral';
  return {
    persistentStorage,
    storageBackend,
    lastPersistError,
  };
}

async function kvFetch(command, ...args) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([command, ...args]),
    });
    if (res.ok) {
      const json = await res.json();
      lastPersistError = null;
      return json.result;
    }
    lastPersistError = `KV HTTP ${res.status}`;
  } catch (err) {
    lastPersistError = err?.message || 'KV request error';
  }

  try {
    const res = await fetch(`${url}/${command}/${args.map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      lastPersistError = null;
      return json.result;
    }
  } catch {}

  return null;
}

async function hydrateFromKv() {
  const kvData = await kvFetch('GET', KV_KEY);
  if (kvData) {
    try {
      const parsed = typeof kvData === 'string' ? JSON.parse(kvData) : kvData;
      if (parsed && typeof parsed === 'object') {
        store = {
          ...structuredClone(DEFAULT_STORE),
          ...parsed,
          visitStatuses: parsed.visitStatuses || {},
          registrationStatuses: parsed.registrationStatuses || {},
          recentEvents: Array.isArray(parsed.recentEvents) ? parsed.recentEvents : [],
        };
      }
    } catch {}
  }
  return store;
}

async function persistStore(eventPayload) {
  if (eventPayload) {
    if (!Array.isArray(store.recentEvents)) store.recentEvents = [];
    store.recentEvents.push({
      ...eventPayload,
      timestamp: eventPayload.timestamp || Date.now(),
    });
    if (store.recentEvents.length > 40) {
      store.recentEvents = store.recentEvents.slice(-40);
    }
  }
  prunePendingItems();
  store.version = (Number(store.version) || 0) + 1;
  store.updatedAt = new Date().toISOString();
  await kvFetch('SET', KV_KEY, JSON.stringify(store));
  return store;
}

function prunePendingItems() {
  const cutoff = Date.now() - 30 * 60 * 1000;
  if (Array.isArray(store.pendingVisitRequests)) {
    store.pendingVisitRequests = store.pendingVisitRequests.filter((r) => !r.timestamp || r.timestamp > cutoff);
  } else {
    store.pendingVisitRequests = [];
  }
  if (Array.isArray(store.pendingRegistrationRequests)) {
    store.pendingRegistrationRequests = store.pendingRegistrationRequests.filter((r) => !r.timestamp || r.timestamp > cutoff);
  } else {
    store.pendingRegistrationRequests = [];
  }
}

function ensureOpenCashSession(baseSession) {
  if (baseSession && typeof baseSession === 'object') {
    return {
      totalSalesCash: 0,
      totalSalesCard: 0,
      totalSalesTransfer: 0,
      totalMembershipsCash: 0,
      totalMembershipsCard: 0,
      totalMembershipsTransfer: 0,
      totalVisitsCash: 0,
      totalVisitsCard: 0,
      totalVisitsTransfer: 0,
      expectedCash: 0,
      status: 'open',
      ...baseSession,
    };
  }
  return {
    id: 'CAJA-' + new Date().toISOString().slice(0, 10),
    openedAt: new Date(new Date().setHours(6, 0, 0, 0)).toISOString(),
    openedBy: 'Recepción (Cloud)',
    initialCash: 0,
    totalSalesCash: 0,
    totalSalesCard: 0,
    totalSalesTransfer: 0,
    totalMembershipsCash: 0,
    totalMembershipsCard: 0,
    totalMembershipsTransfer: 0,
    totalVisitsCash: 0,
    totalVisitsCard: 0,
    totalVisitsTransfer: 0,
    expectedCash: 0,
    status: 'open',
  };
}

function applyCashBucket(session, amount, paymentMethod, bucket) {
  if (!session || session.status !== 'open' || amount <= 0) return session;
  const next = { ...session, updatedAt: new Date().toISOString() };
  if (bucket === 'visit') {
    if (paymentMethod === 'cash') {
      next.totalVisitsCash = (next.totalVisitsCash || 0) + amount;
      next.expectedCash = (next.expectedCash || 0) + amount;
    } else if (paymentMethod === 'card') {
      next.totalVisitsCard = (next.totalVisitsCard || 0) + amount;
    } else if (paymentMethod === 'transfer') {
      next.totalVisitsTransfer = (next.totalVisitsTransfer || 0) + amount;
    }
  } else {
    if (paymentMethod === 'cash') {
      next.totalMembershipsCash = (next.totalMembershipsCash || 0) + amount;
      next.expectedCash = (next.expectedCash || 0) + amount;
    } else if (paymentMethod === 'card') {
      next.totalMembershipsCard = (next.totalMembershipsCard || 0) + amount;
    } else if (paymentMethod === 'transfer') {
      next.totalMembershipsTransfer = (next.totalMembershipsTransfer || 0) + amount;
    }
  }
  return next;
}

export async function getFullDatabase() {
  await hydrateFromKv();
  prunePendingItems();
  return store;
}

export async function getRecentEvents(sinceTs = 0) {
  await hydrateFromKv();
  const cutoff = Number(sinceTs) || 0;
  return (store.recentEvents || []).filter((e) => (e.timestamp || 0) > cutoff);
}

export async function saveFullDatabase(incoming) {
  await hydrateFromKv();
  if (!incoming || typeof incoming !== 'object') return store;

  if (Array.isArray(incoming.deletedMemberIds)) {
    const s = new Set([...(store.deletedMemberIds || []), ...incoming.deletedMemberIds]);
    store.deletedMemberIds = Array.from(s);
  }
  if (Array.isArray(incoming.deletedProductIds)) {
    const s = new Set([...(store.deletedProductIds || []), ...incoming.deletedProductIds]);
    store.deletedProductIds = Array.from(s);
  }
  if (Array.isArray(incoming.deletedExpenseIds)) {
    const s = new Set([...(store.deletedExpenseIds || []), ...incoming.deletedExpenseIds]);
    store.deletedExpenseIds = Array.from(s);
  }
  if (Array.isArray(incoming.deletedEmployeeIds)) {
    const s = new Set([...(store.deletedEmployeeIds || []), ...incoming.deletedEmployeeIds.filter((id) => id !== 'EMP-000')]);
    store.deletedEmployeeIds = Array.from(s);
  }

  if (Array.isArray(incoming.members)) {
    const deleted = new Set(store.deletedMemberIds || []);
    const map = new Map();
    for (const m of store.members || []) {
      if (m && m.id && !deleted.has(m.id)) map.set(m.id, m);
    }
    for (const m of incoming.members) {
      if (m && m.id && !deleted.has(m.id)) {
        map.set(m.id, { ...(map.get(m.id) || {}), ...m });
      }
    }
    store.members = Array.from(map.values());
  }

  if (Array.isArray(incoming.products)) {
    const deleted = new Set(store.deletedProductIds || []);
    const map = new Map();
    for (const p of store.products || []) {
      if (p && p.id && !deleted.has(p.id)) map.set(p.id, p);
    }
    for (const p of incoming.products) {
      if (p && p.id && !deleted.has(p.id)) {
        map.set(p.id, { ...(map.get(p.id) || {}), ...p });
      }
    }
    store.products = Array.from(map.values());
  }

  if (Array.isArray(incoming.sales)) {
    const map = new Map();
    for (const s of store.sales || []) {
      if (s && s.id) map.set(s.id, normalizeServerSale(s));
    }
    for (const rawSale of incoming.sales) {
      if (rawSale && rawSale.id) {
        const norm = normalizeServerSale(rawSale);
        map.set(norm.id, { ...(map.get(norm.id) || {}), ...norm });
      }
    }
    store.sales = Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );
  }

  if (Array.isArray(incoming.expenses)) {
    const deleted = new Set(store.deletedExpenseIds || []);
    const map = new Map();
    for (const e of store.expenses || []) {
      if (e && e.id && !deleted.has(e.id)) map.set(e.id, e);
    }
    for (const e of incoming.expenses) {
      if (e && e.id && !deleted.has(e.id)) {
        map.set(e.id, { ...(map.get(e.id) || {}), ...e });
      }
    }
    store.expenses = Array.from(map.values()).sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );
  }

  if (incoming.cashSession) {
    const curTime = new Date(store.cashSession?.updatedAt || store.cashSession?.openedAt || 0).getTime();
    const incTime = new Date(incoming.cashSession.updatedAt || incoming.cashSession.openedAt || 0).getTime();
    if (!store.cashSession || incTime >= curTime) {
      store.cashSession = incoming.cashSession;
    }
  }

  if (Array.isArray(incoming.employees)) {
    const deleted = new Set(store.deletedEmployeeIds || []);
    const map = new Map();
    for (const emp of store.employees || []) {
      if (emp && emp.id && !deleted.has(emp.id) && emp.role !== 'trainer') map.set(emp.id, emp);
    }
    for (const emp of incoming.employees) {
      if (!emp || !emp.id || deleted.has(emp.id)) continue;
      if (emp.id === 'EMP-003' && emp.role === 'trainer') continue;
      const sanitized = emp.role === 'trainer' ? { ...emp, role: 'receptionist' } : emp;
      const existing = map.get(sanitized.id);
      if (!existing) {
        map.set(sanitized.id, sanitized);
      } else {
        const curTs = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const incTs = sanitized.updatedAt ? new Date(sanitized.updatedAt).getTime() : 0;
        if (incTs > curTs || (curTs === 0 && incTs === 0)) {
          map.set(sanitized.id, { ...existing, ...sanitized });
        }
      }
    }
    store.employees = Array.from(map.values());
  }

  if (Array.isArray(incoming.roles) && incoming.roles.length > 0) {
    store.roles = sanitizeRoles(incoming.roles);
  }

  if (Array.isArray(incoming.branches) && incoming.branches.length > 0) {
    const map = new Map();
    for (const b of store.branches || []) if (b && b.id) map.set(b.id, b);
    for (const b of incoming.branches) if (b && b.id) map.set(b.id, { ...(map.get(b.id) || {}), ...b });
    store.branches = Array.from(map.values());
  }

  if (incoming.settings && typeof incoming.settings === 'object') {
    store.settings = { ...(store.settings || {}), ...incoming.settings };
  }

  if (incoming.terminalDesign && typeof incoming.terminalDesign === 'object') {
    const curTs = new Date(store.terminalDesign?.updatedAt || 0).getTime();
    const incTs = new Date(incoming.terminalDesign.updatedAt || 0).getTime();
    if (!store.terminalDesign || incTs >= curTs) {
      store.terminalDesign = incoming.terminalDesign;
    }
  }

  if (Array.isArray(incoming.catalogPlans)) {
    const map = new Map();
    for (const p of store.catalogPlans || []) {
      if (p && p.id && !isLegacyRemovedPlan(p)) map.set(p.id, p);
    }
    for (const p of incoming.catalogPlans) {
      if (p && p.id && !isLegacyRemovedPlan(p)) map.set(p.id, { ...(map.get(p.id) || {}), ...p });
    }
    store.catalogPlans = Array.from(map.values());
  }

  if (Array.isArray(incoming.accessLogs)) {
    const map = new Map();
    for (const l of store.accessLogs || []) {
      if (l && l.id) map.set(l.id, l);
    }
    for (const l of incoming.accessLogs) {
      if (l && l.id) map.set(l.id, l);
    }
    store.accessLogs = Array.from(map.values())
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, 1000);
  }

  await persistStore();
  return store;
}

export async function updateEntity(entity, action, item, itemId) {
  await hydrateFromKv();
  let sseEvent = null;

  if (entity === 'products') {
    if (!Array.isArray(store.products)) store.products = [];
    if (!Array.isArray(store.deletedProductIds)) store.deletedProductIds = [];
    if (action === 'delete') {
      const id = itemId || item?.id;
      if (id) {
        if (!store.deletedProductIds.includes(id)) store.deletedProductIds.push(id);
        store.products = store.products.filter((p) => p.id !== id);
      }
    } else if (item && item.id) {
      store.deletedProductIds = store.deletedProductIds.filter((id) => id !== item.id);
      const exists = store.products.some((p) => p.id === item.id);
      store.products = exists
        ? store.products.map((p) => (p.id === item.id ? { ...p, ...item } : p))
        : [item, ...store.products];
      sseEvent = { type: 'PRODUCT_UPDATED', product: item };
    }
  } else if (entity === 'sales') {
    if (!Array.isArray(store.sales)) store.sales = [];
    if (item && item.id) {
      const norm = normalizeServerSale(item);
      const exists = store.sales.some((s) => s.id === norm.id);
      store.sales = exists
        ? store.sales.map((s) => (s.id === norm.id ? { ...s, ...norm } : s))
        : [norm, ...store.sales];
      sseEvent = { type: 'SALE_ADDED', sale: norm };
    }
  } else if (entity === 'expenses') {
    if (!Array.isArray(store.expenses)) store.expenses = [];
    if (!Array.isArray(store.deletedExpenseIds)) store.deletedExpenseIds = [];
    if (action === 'delete') {
      const id = itemId || item?.id;
      if (id) {
        if (!store.deletedExpenseIds.includes(id)) store.deletedExpenseIds.push(id);
        store.expenses = store.expenses.filter((e) => e.id !== id);
      }
    } else if (item && item.id) {
      store.deletedExpenseIds = store.deletedExpenseIds.filter((id) => id !== item.id);
      const exists = store.expenses.some((e) => e.id === item.id);
      store.expenses = exists
        ? store.expenses.map((e) => (e.id === item.id ? { ...e, ...item } : e))
        : [item, ...store.expenses];
      sseEvent = { type: 'EXPENSE_ADDED', expense: item };
    }
  } else if (entity === 'cashSession') {
    if (item) {
      store.cashSession = item;
      sseEvent = { type: 'CASH_SESSION_UPDATED', cashSession: item };
    }
  } else if (entity === 'employees') {
    if (!Array.isArray(store.employees)) store.employees = [];
    if (!Array.isArray(store.deletedEmployeeIds)) store.deletedEmployeeIds = [];
    if (action === 'delete') {
      const id = itemId || item?.id;
      if (id && id !== 'EMP-000') {
        if (!store.deletedEmployeeIds.includes(id)) store.deletedEmployeeIds.push(id);
        store.employees = store.employees.filter((e) => e.id !== id);
      }
    } else if (item && item.id) {
      store.deletedEmployeeIds = store.deletedEmployeeIds.filter((id) => id !== item.id);
      const exists = store.employees.some((e) => e.id === item.id);
      store.employees = exists
        ? store.employees.map((e) => (e.id === item.id ? { ...e, ...item } : e))
        : [item, ...store.employees];
    }
  } else if (entity === 'roles') {
    if (Array.isArray(item)) {
      store.roles = sanitizeRoles(item);
      sseEvent = { type: 'ROLES_UPDATED', roles: store.roles };
    }
  } else if (entity === 'branches') {
    if (Array.isArray(item)) {
      store.branches = item;
    } else if (item && item.id) {
      if (!Array.isArray(store.branches)) store.branches = [];
      const exists = store.branches.some((b) => b.id === item.id);
      store.branches = exists
        ? store.branches.map((b) => (b.id === item.id ? { ...b, ...item } : b))
        : [item, ...store.branches];
      sseEvent = { type: 'BRANCH_UPDATED', branch: item };
    }
  } else if (entity === 'settings') {
    if (item) store.settings = { ...(store.settings || {}), ...item };
  } else if (entity === 'terminalDesign') {
    if (item) {
      store.terminalDesign = item;
      sseEvent = { type: 'TERMINAL_DESIGN_UPDATED', terminalDesign: item };
    }
  } else if (entity === 'catalogPlans') {
    if (!Array.isArray(store.catalogPlans)) store.catalogPlans = [];
    if (action === 'delete') {
      const id = itemId || item?.id;
      if (id) store.catalogPlans = store.catalogPlans.filter((p) => p.id !== id);
    } else if (item && item.id && !isLegacyRemovedPlan(item)) {
      const exists = store.catalogPlans.some((p) => p.id === item.id);
      store.catalogPlans = exists
        ? store.catalogPlans.map((p) => (p.id === item.id ? { ...p, ...item } : p))
        : [...store.catalogPlans, item];
    }
  } else if (entity === 'accessLogs' && action === 'replace' && Array.isArray(item)) {
    store.accessLogs = item;
  }

  await persistStore(sseEvent || { type: 'DATABASE_UPDATED' });
  return store;
}

export async function getMembers() {
  await hydrateFromKv();
  return store;
}

export async function saveMembers(members, replace = false) {
  await hydrateFromKv();
  if (replace) {
    store.members = Array.isArray(members) ? members : [];
    if (store.members.length === 0) {
      store.deletedMemberIds = [];
    }
    await persistStore({ type: 'MEMBERS_REPLACED', members: store.members });
    return store;
  }
  return saveFullDatabase({ members });
}

export async function addOrUpdateMember(member, changeType = 'update') {
  await hydrateFromKv();
  if (!Array.isArray(store.deletedMemberIds)) store.deletedMemberIds = [];
  store.deletedMemberIds = store.deletedMemberIds.filter((id) => id !== member.id);
  const exists = (store.members || []).some((m) => m.id === member.id);
  const filtered = (store.members || []).filter((m) => m.id !== member.id);
  store.members = [member, ...filtered];
  await persistStore({
    type: !exists || changeType === 'add' ? 'MEMBER_ADDED' : 'MEMBER_UPDATED',
    member,
  });
  return store;
}

export async function deleteMember(memberId) {
  await hydrateFromKv();
  if (!Array.isArray(store.deletedMemberIds)) store.deletedMemberIds = [];
  if (!store.deletedMemberIds.includes(memberId)) store.deletedMemberIds.push(memberId);
  store.members = (store.members || []).filter((m) => m.id !== memberId);
  await persistStore({ type: 'MEMBER_DELETED', memberId });
  return store;
}

export async function addAccessLog(log) {
  await hydrateFromKv();
  store.accessLogs = [log, ...(store.accessLogs || []).filter((l) => l.id !== log.id)].slice(0, 1000);
  await persistStore({ type: 'ACCESS_LOG_ADDED', log });
  return store;
}

export async function getAccessLogs() {
  await hydrateFromKv();
  return store.accessLogs;
}

// Visit Pass Workflow
export async function getVisitRequests(checkId) {
  await hydrateFromKv();
  prunePendingItems();
  const statusEntry = checkId ? (store.visitStatuses?.[checkId] || null) : null;
  return {
    requests: store.pendingVisitRequests || [],
    statusEntry,
  };
}

export async function createVisitRequest(payload) {
  await hydrateFromKv();
  const reqId = payload?.id || `VIS_${Date.now()}`;
  const visitReq = {
    id: reqId,
    clientName: payload?.clientName || 'Visitante del Día',
    cost: Number(payload?.cost) || 50,
    timestamp: payload?.timestamp || Date.now(),
    status: 'pending',
  };
  store.pendingVisitRequests = [visitReq, ...(store.pendingVisitRequests || []).filter((r) => r.id !== reqId)];
  store.visitStatuses = store.visitStatuses || {};
  store.visitStatuses[reqId] = { id: reqId, status: 'pending', clientName: visitReq.clientName, cost: visitReq.cost, timestamp: Date.now() };
  await persistStore({ type: 'VISIT_PASS_REQUESTED', visitRequest: visitReq });
  return visitReq;
}

export async function authorizeVisitRequest(payload) {
  await hydrateFromKv();
  const reqId = payload?.id;
  const existingStatus = reqId ? store.visitStatuses?.[reqId] : null;
  if (existingStatus && existingStatus.status === 'authorized') {
    return {
      duplicate: true,
      cost: existingStatus.cost || 50,
      clientName: existingStatus.clientName || 'Visitante del Día',
      saleId: `SALE_VISIT_${reqId}`,
    };
  }

  const existingReq = (store.pendingVisitRequests || []).find((r) => r.id === reqId);
  const clientName = payload?.clientName || existingReq?.clientName || 'Visitante del Día';
  const cost = Number(payload?.cost) || existingReq?.cost || 50;
  const paymentMethod = payload?.paymentMethod || 'cash';
  const authorizedBy = payload?.authorizedBy || 'Recepción (RP)';

  store.pendingVisitRequests = (store.pendingVisitRequests || []).filter((r) => r.id !== reqId);
  store.visitStatuses = store.visitStatuses || {};
  if (reqId) {
    store.visitStatuses[reqId] = { id: reqId, status: 'authorized', clientName, cost, timestamp: Date.now() };
  }

  const saleId = payload?.sale?.id || (reqId ? `SALE_VISIT_${reqId}` : `SALE_VISIT_${Date.now()}`);
  const existingSale = (store.sales || []).find((s) => s.id === saleId);
  const visitSale =
    existingSale ||
    normalizeServerSale(
      payload?.sale || {
        id: saleId,
        folio: `VIS-${String(Date.now()).slice(-4)}`,
        timestamp: new Date().toISOString(),
        clientName,
        items: [
          {
            product: {
              id: 'prod_visit_pass',
              name: 'Pase de Visita por 1 Día',
              brand: 'LEGENDS GYM',
              category: 'gear',
              price: cost,
              costPrice: 0,
              stock: 9999,
              minStock: 0,
            },
            quantity: 1,
            unitPrice: cost,
            subtotal: cost,
          },
        ],
        subtotal: cost,
        tax: 0,
        total: cost,
        paymentMethod,
        amountPaid: cost,
        changeGiven: 0,
        cashierName: authorizedBy,
        cashierRole: 'admin',
        notes: `Pase de Visita de ${clientName} ($${cost})`,
        saleType: 'visit',
        planName: 'Pase de Visita',
      }
    );

  if (!existingSale) {
    store.sales = [visitSale, ...(store.sales || [])];
    if (payload?.cashSession && payload.cashSession.id) {
      store.cashSession = payload.cashSession;
    } else {
      store.cashSession = applyCashBucket(ensureOpenCashSession(store.cashSession), cost, paymentMethod, 'visit');
    }
  }

  const visitLog = {
    id: 'LOG_VIS_' + Date.now(),
    timestamp: new Date().toISOString(),
    clientName,
    planName: `Visita ($${cost})`,
    status: 'granted',
    method: 'visit_pass',
    reason: 'Visita Autorizada por RP',
  };
  store.accessLogs = [visitLog, ...(store.accessLogs || [])].slice(0, 1000);

  await persistStore({
    type: 'VISIT_PASS_AUTHORIZED',
    visitRequest: { id: reqId, clientName, cost, status: 'authorized' },
    visitRequestId: reqId,
    sale: visitSale,
    cashSession: store.cashSession,
    log: visitLog,
  });

  return {
    authorized: true,
    cost,
    clientName,
    saleId,
    logId: visitLog.id,
  };
}

export async function rejectVisitRequest(reqId) {
  await hydrateFromKv();
  store.pendingVisitRequests = (store.pendingVisitRequests || []).filter((r) => r.id !== reqId);
  store.visitStatuses = store.visitStatuses || {};
  if (reqId) {
    store.visitStatuses[reqId] = { id: reqId, status: 'rejected', clientName: '', timestamp: Date.now() };
  }
  await persistStore({
    type: 'VISIT_PASS_REJECTED',
    visitRequest: { id: reqId, clientName: '', cost: 50, status: 'rejected' },
    visitRequestId: reqId,
  });
  return true;
}

// Member Registration Workflow
export async function getRegistrationRequests(checkId) {
  await hydrateFromKv();
  prunePendingItems();
  const statusEntry = checkId ? (store.registrationStatuses?.[checkId] || null) : null;
  return {
    requests: store.pendingRegistrationRequests || [],
    statusEntry,
  };
}

export async function createRegistrationRequest(payload) {
  await hydrateFromKv();
  const reqId = payload?.id || `REG_${Date.now()}`;
  const regReq = {
    id: reqId,
    memberData: payload?.memberData || {},
    paymentMethod: payload?.paymentMethod || 'cash',
    timestamp: payload?.timestamp || Date.now(),
    status: 'pending',
  };
  store.pendingRegistrationRequests = [
    regReq,
    ...(store.pendingRegistrationRequests || []).filter((r) => r.id !== reqId),
  ];
  store.registrationStatuses = store.registrationStatuses || {};
  store.registrationStatuses[reqId] = { id: reqId, status: 'pending', timestamp: Date.now() };
  await persistStore({ type: 'MEMBER_REGISTRATION_REQUESTED', registrationRequest: regReq });
  return regReq;
}

export async function authorizeRegistrationRequest(payload) {
  await hydrateFromKv();
  const reqId = payload?.id;
  store.pendingRegistrationRequests = (store.pendingRegistrationRequests || []).filter((r) => r.id !== reqId);
  store.registrationStatuses = store.registrationStatuses || {};
  if (reqId) {
    store.registrationStatuses[reqId] = { id: reqId, status: 'authorized', timestamp: Date.now() };
  }

  const member = payload?.member;
  const incomingMembers =
    Array.isArray(payload?.members) && payload.members.length > 0
      ? payload.members.filter((m) => m && m.id)
      : member && member.id
      ? [member]
      : [];
  const primaryMember = incomingMembers[0] || member;
  const sale = payload?.sale;
  const paymentMethod = payload?.paymentMethod || 'cash';
  const planPrice = Number(primaryMember?.membership?.price || sale?.total || 0) || 0;

  if (incomingMembers.length > 0) {
    const incomingIds = new Set(incomingMembers.map((m) => m.id));
    store.members = [...incomingMembers, ...(store.members || []).filter((m) => !incomingIds.has(m.id))];
    store.deletedMemberIds = (store.deletedMemberIds || []).filter((id) => !incomingIds.has(id));
  }

  const normalizedSale = sale && sale.id ? normalizeServerSale(sale) : null;
  const existingSale = normalizedSale ? (store.sales || []).find((s) => s.id === normalizedSale.id) : null;
  if (normalizedSale) {
    store.sales = [normalizedSale, ...(store.sales || []).filter((s) => s.id !== normalizedSale.id)];
  }

  if (payload?.cashSession && payload.cashSession.id) {
    store.cashSession = payload.cashSession;
  } else if (!existingSale && planPrice > 0) {
    store.cashSession = applyCashBucket(ensureOpenCashSession(store.cashSession), planPrice, paymentMethod, 'membership');
  }

  const memberNamesList =
    incomingMembers.length > 1
      ? incomingMembers.map((m) => m.fullName).join(', ')
      : primaryMember?.fullName || 'Nuevo Socio';

  const regLog = {
    id: 'LOG_REG_' + Date.now(),
    timestamp: new Date().toISOString(),
    clientName: memberNamesList,
    planName: primaryMember?.membership?.planName || 'Membresía',
    status: 'granted',
    method: 'membership_registration',
    reason:
      incomingMembers.length > 1
        ? `Alta Grupal (${incomingMembers.length} socios) y Pago Registrado en RP • Torniquete Abierto`
        : 'Alta de Socio y Pago Registrado en RP • Torniquete Abierto',
  };
  store.accessLogs = [regLog, ...(store.accessLogs || [])].slice(0, 1000);

  await persistStore({
    type: 'MEMBER_REGISTRATION_AUTHORIZED',
    registrationRequest: { id: reqId, memberData: primaryMember, status: 'authorized' },
    registrationRequestId: reqId,
    member: primaryMember,
    members: incomingMembers,
    sale: normalizedSale || sale,
    cashSession: store.cashSession,
    log: regLog,
  });

  return {
    authorized: true,
    id: reqId,
    memberId: primaryMember?.id,
    memberIds: incomingMembers.map((m) => m.id),
    saleId: sale?.id,
  };
}

export async function rejectRegistrationRequest(reqId) {
  await hydrateFromKv();
  store.pendingRegistrationRequests = (store.pendingRegistrationRequests || []).filter((r) => r.id !== reqId);
  store.registrationStatuses = store.registrationStatuses || {};
  if (reqId) {
    store.registrationStatuses[reqId] = { id: reqId, status: 'rejected', timestamp: Date.now() };
  }
  await persistStore({
    type: 'MEMBER_REGISTRATION_REJECTED',
    registrationRequestId: reqId,
  });
  return true;
}
