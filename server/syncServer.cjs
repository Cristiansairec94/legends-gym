const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3001;
const ENV_DATA_DIR = process.env.LEGENDS_DATA_DIR ? path.resolve(process.env.LEGENDS_DATA_DIR) : '';
const WORKSPACE_DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_DATA_DIR = __dirname.includes('app.asar')
  ? path.resolve(path.dirname(process.execPath), 'data')
  : path.resolve(__dirname, '../data');
const DATA_DIR = ENV_DATA_DIR || (fs.existsSync(WORKSPACE_DATA_DIR) ? WORKSPACE_DATA_DIR : LOCAL_DATA_DIR);
const DB_FILE = path.join(DATA_DIR, 'legends_database.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('[DB] No se pudo crear directorio de datos:', err.message);
}

// Default initial members seed
const DEFAULT_MEMBERS = [];

// In-memory state with file backing
let db = {
  version: 1,
  updatedAt: new Date().toISOString(),
  members: [],
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
  pendingVisitRequests: [],
  pendingRegistrationRequests: [],
  deletedMemberIds: [],
  deletedProductIds: [],
  deletedExpenseIds: [],
  deletedEmployeeIds: []
};

// Filter legacy removed catalog plans from disk or older clients
const LEGACY_REMOVED_PLAN_IDS = new Set(['CAT-PLAN-001', 'CAT-PLAN-007', 'CAT-PLAN-008']);
function isLegacyRemovedPlan(p) {
  if (!p || !p.id) return true;
  if (LEGACY_REMOVED_PLAN_IDS.has(p.id)) return true;
  if (p.name === 'Mensualidad Estándar' && p.price === 850) return true;
  if (p.name === 'Plan Trimestral Fuerza' && p.price === 2300) return true;
  if (p.name === 'Membresía Black VIP Anual' && p.price === 9500) return true;
  if (p.name === 'Pase por Día (Day Pass)' && p.price === 150) return true;
  return false;
}

function isServerVisitSale(raw) {
  if (!raw || typeof raw !== 'object') return false;
  if (raw.saleType === 'visit') return true;
  if (raw.source === 'terminal_visit_authorized') return true;
  const id = String(raw.id || '').toUpperCase();
  const folio = String(raw.folio || '').toUpperCase();
  if (id.startsWith('SALE_VISIT') || id.startsWith('SALE-VISIT') || id.includes('_VISIT_')) return true;
  if (folio.startsWith('VIS-')) return true;
  const planName = String(raw.planName || '').toLowerCase();
  if (planName.includes('visita')) return true;
  const notes = String(raw.notes || '').toLowerCase();
  if (notes.includes('pase de visita')) return true;
  if (Array.isArray(raw.items)) {
    return raw.items.some(it => {
      const prodId = String(it?.product?.id || it?.id || '').toLowerCase();
      const barcode = String(it?.product?.barcode || '').toUpperCase();
      const name = String(it?.product?.name || it?.name || '').toLowerCase();
      return (
        prodId === 'prod_visit_pass' ||
        prodId === 'item_visit_pass' ||
        barcode === 'VIS-001' ||
        name.includes('pase de visita')
      );
    });
  }
  return false;
}

// Normalize visit / membership sale records so ERP IncomeHistoryView and ReceiptModal never receive incomplete fields
function normalizeServerSale(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const total = Number(raw.total ?? raw.amountPaid ?? 0);
  const id = raw.id || 'SALE_' + Date.now();
  const isVisit = isServerVisitSale(raw);
  const isMembership = !isVisit && (raw.saleType === 'membership' || id.startsWith('SALE-REG') || id.startsWith('PLAN-'));
  const resolvedSaleType = isVisit ? 'visit' : isMembership ? 'membership' : 'store';
  const defaultTitle = raw.planName || (isVisit ? 'Pase de Visita' : 'Cobro de acceso');
  const rawItems = Array.isArray(raw.items) && raw.items.length > 0 ? raw.items : null;
  const items = rawItems
    ? rawItems.map(it => {
        const unitPrice = Number(it?.unitPrice ?? it?.price ?? total);
        const qty = Number(it?.quantity ?? 1);
        const prodName = it?.product?.name || it?.name || defaultTitle;
        return {
          product: it?.product && it.product.name
            ? it.product
            : {
                id: it?.id || (isVisit ? 'ITEM_VISIT_PASS' : 'ITEM_GYM_COLLECTION'),
                name: prodName,
                brand: 'LEGENDS GYM',
                category: 'gear',
                price: unitPrice,
                costPrice: 0,
                stock: 999,
                minStock: 0
              },
          quantity: qty,
          unitPrice,
          subtotal: Number(it?.subtotal ?? it?.total ?? unitPrice * qty)
        };
      })
    : [{
        product: {
          id: isVisit ? 'ITEM_VISIT_PASS' : 'ITEM_GYM_COLLECTION',
          name: defaultTitle,
          brand: 'LEGENDS GYM',
          category: 'gear',
          price: total,
          costPrice: 0,
          stock: 999,
          minStock: 0
        },
        quantity: 1,
        unitPrice: total,
        subtotal: total
      }];

  return {
    ...raw,
    id,
    folio: raw.folio || (isVisit ? `VIS-${String(id).slice(-4)}` : id),
    timestamp: raw.timestamp || new Date().toISOString(),
    clientName: raw.clientName || 'Visitante del Día',
    items,
    subtotal: Number(raw.subtotal ?? total),
    tax: Number(raw.tax ?? 0),
    total,
    paymentMethod: raw.paymentMethod || 'cash',
    amountPaid: Number(raw.amountPaid ?? total),
    changeGiven: Number(raw.changeGiven ?? 0),
    cashierName: raw.cashierName || raw.authorizedBy || 'Recepción (RP)',
    cashierRole: raw.cashierRole || 'admin',
    saleType: resolvedSaleType,
    planName: raw.planName || (isVisit ? 'Pase de Visita' : undefined)
  };
}

function applyServerMembershipCash(session, amount, paymentMethod) {
  if (!session || session.status !== 'open' || !(amount > 0)) return;
  const method = paymentMethod || 'cash';
  if (method === 'cash') {
    session.totalMembershipsCash = (session.totalMembershipsCash || 0) + amount;
    session.expectedCash = (session.expectedCash || 0) + amount;
  } else if (method === 'card') {
    session.totalMembershipsCard = (session.totalMembershipsCard || 0) + amount;
  } else if (method === 'transfer') {
    session.totalMembershipsTransfer = (session.totalMembershipsTransfer || 0) + amount;
  }
}

function applyServerVisitCash(session, amount, paymentMethod) {
  if (!session || session.status !== 'open' || !(amount > 0)) return;
  const method = paymentMethod || 'cash';
  if (method === 'cash') {
    session.totalVisitsCash = (session.totalVisitsCash || 0) + amount;
    session.expectedCash = (session.expectedCash || 0) + amount;
  } else if (method === 'card') {
    session.totalVisitsCard = (session.totalVisitsCard || 0) + amount;
  } else if (method === 'transfer') {
    session.totalVisitsTransfer = (session.totalVisitsTransfer || 0) + amount;
  }
}

// Load existing database if available
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    db = { ...db, ...parsed };
    if (!Array.isArray(db.deletedMemberIds)) db.deletedMemberIds = [];
    if (!Array.isArray(db.deletedProductIds)) db.deletedProductIds = [];
    if (!Array.isArray(db.deletedExpenseIds)) db.deletedExpenseIds = [];
    if (!Array.isArray(db.deletedEmployeeIds)) db.deletedEmployeeIds = [];
    if (!Array.isArray(db.roles)) db.roles = [];
    if (!Array.isArray(db.branches)) db.branches = [];
    if (Array.isArray(db.catalogPlans)) {
      db.catalogPlans = db.catalogPlans.filter(p => !isLegacyRemovedPlan(p));
    }
    if (Array.isArray(db.sales)) {
      db.sales = db.sales.map(normalizeServerSale);
    }
    console.log(`[DB] Base de datos cargada desde ${DB_FILE} (${db.members.length} socios, ${db.accessLogs.length} accesos)`);
  } catch (e) {
    console.warn('[DB] No se pudo leer el archivo existente, usando base de datos limpia.');
  }
}

// Merge DEFAULT_MEMBERS (including MEM-008 Juan Solis) unless explicitly deleted
const mergedStartupMap = new Map();
for (const defM of DEFAULT_MEMBERS) {
  if (!db.deletedMemberIds.includes(defM.id)) {
    mergedStartupMap.set(defM.id, defM);
  }
}
for (const curM of db.members || []) {
  if (curM && curM.id && !db.deletedMemberIds.includes(curM.id)) {
    mergedStartupMap.set(curM.id, { ...(mergedStartupMap.get(curM.id) || {}), ...curM });
  }
}
db.members = Array.from(mergedStartupMap.values());


// Load gender-specific client avatars (Female: left dumbbell silhouette, Male: right dumbbell curl illustration)
let FEMALE_CLIENT_B64 = '';
let MALE_CLIENT_B64 = '';
try {
  const femCandidate = [
    path.resolve(__dirname, '../src/assets/avatars/female_client.png'),
    path.resolve(__dirname, '../public/avatars/female_client.png'),
    path.resolve(__dirname, '../dist/avatars/female_client.png'),
  ].find(p => fs.existsSync(p));
  const maleCandidate = [
    path.resolve(__dirname, '../src/assets/avatars/male_client.png'),
    path.resolve(__dirname, '../public/avatars/male_client.png'),
    path.resolve(__dirname, '../dist/avatars/male_client.png'),
  ].find(p => fs.existsSync(p));
  if (femCandidate) FEMALE_CLIENT_B64 = 'data:image/png;base64,' + fs.readFileSync(femCandidate).toString('base64');
  if (maleCandidate) MALE_CLIENT_B64 = 'data:image/png;base64,' + fs.readFileSync(maleCandidate).toString('base64');
} catch {}

const SERVER_FEMALE_NAMES = new Set([
  'alondra','maria','mary','carmen','ana','valeria','sofia','andrea','valentina','camila',
  'isabella','isabela','lucia','natalia','daniela','mariana','fernanda','gabriela','laura',
  'paula','patricia','claudia','diana','carolina','brenda','alejandra','sara','sarah',
  'monica','elena','rosa','jessica','yesica','vanessa','vanesa','karen','karla','carla',
  'guadalupe','lupita','ximena','jimena','paulina','adriana','lorena','esmeralda','rocio',
  'beatriz','teresa','gloria','margarita','leticia','silvia','yolanda','miriam','myriam',
  'veronica','elizabeth','elisabeth','raquel','ruth','susana','ivonne','fatima','estefania',
  'stephanie','monzerrat','monserrat','montserrat','rebeca','nayeli','marisol','araceli',
  'aracely','arely','areli','clara','cecilia','blanca','alma','alicia','luz','olga','irma',
  'juana','abigail','noemi','sarai','anahi','rubi','itzel','citlalli','xochitl','yazmin',
  'yasmin','jasmin','jazmin','lizbeth','lizeth','lissette','jaqueline','jacqueline','kimberly',
  'ashley','melanie','valery','nataly','nancy','fanny','yenny','jenny','jennifer','marifer',
  'mafer','pilar','mercedes','consuelo','concepcion','dolores','lourdes','isabel','maribel',
  'anabel','mabel','ester','esther','belen','soledad','trinidad','natividad','rosario',
  'amparo','milagros','wendy','heidy','ingrid','astrid','edith','judith','estela','perla',
  'dulce','estrella','cintia','cynthia','nadia','sonia','tania','katia','kenia','regina',
  'renata','romina','aitana','alexa','alexandra','alison','allison','amanda','amelia',
  'angela','angelica','antonia','ariadna','ariana','aurora','barbara','berenice','bianca'
]);

const SERVER_MALE_NAMES = new Set([
  'samuel','carlos','juan','jose','pedro','miguel','alejandro','diego','mateo','jorge',
  'luis','daniel','fernando','ricardo','eduardo','roberto','javier','david','sergio',
  'mario','pablo','marcos','marco','andres','hector','rodrigo','gabriel','rafael','arturo',
  'ivan','angel','raul','oscar','emilio','joaquin','manuel','francisco','antonio','enrique',
  'cesar','hugo','victor','ramon','gustavo','felipe','alonso','alberto','gonzalo','esteban',
  'mauricio','cristian','christian','kevin','brayan','brian','erik','eric','erick','ercik',
  'ruben','julio','gerardo','adrian','martin','santiago','sebastian','lucas','leonardo',
  'tomas','nicolas','emanuel','emmanuel','isaac','abraham','israel','isidro','ismael',
  'uriel','azael','gael','axel','joel','noel','abel','fidel','ariel','omar','edgar','nestor',
  'saul','paul','josue','noah','ian','alan','adair','aldair','yair','yahir','jair','efrain',
  'benjamin','valentin','agustin','fermin','roman','dylan','brandon','jonathan','johan'
]);

function detectMemberGender(fullName, explicitGender) {
  if (explicitGender === 'female' || explicitGender === 'male') return explicitGender;
  if (!fullName || typeof fullName !== 'string') return 'male';
  const clean = fullName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (!parts.length) return 'male';
  const first = parts[0];
  const second = parts[1] || '';
  if (first === 'maria' || (second && SERVER_FEMALE_NAMES.has(second) && (first === 'ma' || first === 'ma.'))) return 'female';
  if (first === 'jose' && second === 'maria') return 'male';
  if (SERVER_FEMALE_NAMES.has(first)) return 'female';
  if (SERVER_MALE_NAMES.has(first)) return 'male';
  if (second && SERVER_FEMALE_NAMES.has(second)) return 'female';
  if (second && SERVER_MALE_NAMES.has(second)) return 'male';
  if (first.endsWith('a') && !['luca','luka','borja','joshua','nikita','mustafa'].includes(first)) return 'female';
  if (first.endsWith('eth') || first.endsWith('beth') || first.endsWith('zel')) return 'female';
  return 'male';
}

function normalizeMemberAvatar(m) {
  if (!m || typeof m !== 'object') return m;
  const gender = detectMemberGender(m.fullName || m.name || '', m.gender);
  const av = m.avatarUrl || '';
  const targetB64 = gender === 'female' ? FEMALE_CLIENT_B64 : MALE_CLIENT_B64;
  if (!targetB64) return { ...m, gender };
  if (
    !av ||
    av.startsWith('preset:') ||
    av.startsWith('gender:') ||
    av.length > 150000 ||
    av.includes('c2pa') ||
    av.includes('unsplash.com') ||
    av.includes('svg+xml') ||
    av === FEMALE_CLIENT_B64 ||
    av === MALE_CLIENT_B64
  ) {
    return { ...m, gender, avatarUrl: targetB64 };
  }
  return { ...m, gender };
}

function saveDbToDisk(options = {}) {
  try {
    if (Array.isArray(db.members)) {
      db.members = db.members.map(m => normalizeMemberAvatar(m));
    }
    if (Array.isArray(db.accessLogs)) {
      db.accessLogs = db.accessLogs.map(l => {
        if (l && typeof l.avatarUrl === 'string' && l.avatarUrl.length > 150000) {
          const { avatarUrl, ...rest } = l;
          return rest;
        }
        return l;
      });
    }
    const serialized = JSON.stringify(db, null, 2);
    try {
      fs.writeFileSync(DB_FILE, serialized, 'utf8');
    } catch (writeErr) {
      setTimeout(() => {
        try { fs.writeFileSync(DB_FILE, serialized, 'utf8'); } catch {}
      }, 250);
    }
    if (!options.skipCloudPush) {
      scheduleCloudMirrorPush();
    }
  } catch (e) {
    console.error('[DB] Error guardando en disco:', e);
  }
}

const CLOUD_SYNC_URL = (process.env.CLOUD_SYNC_URL || 'https://legends-gym-gold.vercel.app').replace(/\/+$/, '');
const IS_CLOUD_SYNC_DISABLED = process.env.DISABLE_CLOUD_SYNC === '1' || process.env.NODE_ENV === 'test';
let cloudMirrorTimer = null;
let cloudPollInterval = null;
let lastPushedLocalVersion = 0;
let lastCloudSeenVersion = 0;
let lastCloudSyncAt = null;
let isCloudSyncBusy = false;

function mergeCloudRecordsById(localList, remoteList, deletedIds = []) {
  const delSet = new Set(deletedIds || []);
  const map = new Map();
  let changed = false;
  for (const item of localList || []) {
    if (item && item.id && !delSet.has(item.id)) map.set(item.id, item);
  }
  for (const r of remoteList || []) {
    if (!r || !r.id || delSet.has(r.id)) continue;
    const cur = map.get(r.id);
    if (!cur) {
      map.set(r.id, r);
      changed = true;
    } else {
      const curTs = cur.updatedAt ? new Date(cur.updatedAt).getTime() : 0;
      const rTs = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
      if (rTs > curTs) {
        map.set(r.id, { ...cur, ...r });
        changed = true;
      }
    }
  }
  return { list: Array.from(map.values()), changed };
}

async function mirrorPushToCloud() {
  if (IS_CLOUD_SYNC_DISABLED || isCloudSyncBusy || typeof fetch !== 'function') return;
  if (db.version <= lastPushedLocalVersion && lastPushedLocalVersion > 0) return;
  isCloudSyncBusy = true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${CLOUD_SYNC_URL}/api/sync/database`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'full_sync',
        database: {
          members: db.members,
          products: db.products,
          sales: db.sales,
          expenses: db.expenses,
          cashSession: db.cashSession,
          employees: db.employees,
          roles: db.roles,
          settings: db.settings,
          catalogPlans: db.catalogPlans,
          branches: db.branches,
          accessLogs: db.accessLogs,
          terminalDesign: db.terminalDesign,
          deletedMemberIds: db.deletedMemberIds,
          deletedProductIds: db.deletedProductIds,
          deletedExpenseIds: db.deletedExpenseIds,
          deletedEmployeeIds: db.deletedEmployeeIds,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      lastPushedLocalVersion = db.version;
      if (json && json.version) lastCloudSeenVersion = Number(json.version);
      lastCloudSyncAt = new Date().toISOString();
    }
  } catch {
    // Non-blocking background sync: retry automatically on next tick
  } finally {
    isCloudSyncBusy = false;
  }
}

async function mirrorPullFromCloud() {
  if (IS_CLOUD_SYNC_DISABLED || isCloudSyncBusy || typeof fetch !== 'function') return;
  isCloudSyncBusy = true;
  let needsRehydratePush = false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${CLOUD_SYNC_URL}/api/sync/database?sinceVersion=${lastCloudSeenVersion}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return;
    const json = await res.json();
    if (!json || !json.success) return;
    const remoteVer = Number(json.version || 0);
    if (remoteVer === 0) return;

    const remoteDb = json.database;
    if (
      remoteDb &&
      remoteVer <= 1 &&
      (!remoteDb.members || remoteDb.members.length === 0) &&
      (!remoteDb.sales || remoteDb.sales.length === 0) &&
      ((db.members && db.members.length > 0) || (db.sales && db.sales.length > 0))
    ) {
      needsRehydratePush = true;
      lastPushedLocalVersion = 0;
      return;
    }

    lastCloudSeenVersion = remoteVer;
    if (!remoteDb) return;

    let anyLocalChange = false;
    for (const delKey of ['deletedMemberIds', 'deletedProductIds', 'deletedExpenseIds', 'deletedEmployeeIds']) {
      if (Array.isArray(remoteDb[delKey])) {
        const mergedSet = new Set([...(db[delKey] || []), ...remoteDb[delKey]]);
        if (mergedSet.size > (db[delKey] || []).length) {
          db[delKey] = Array.from(mergedSet);
          anyLocalChange = true;
        }
      }
    }

    const mRes = mergeCloudRecordsById(db.members, remoteDb.members, db.deletedMemberIds);
    if (mRes.changed) { db.members = mRes.list; anyLocalChange = true; }

    const pRes = mergeCloudRecordsById(db.products, remoteDb.products, db.deletedProductIds);
    if (pRes.changed) { db.products = pRes.list; anyLocalChange = true; }

    const sRes = mergeCloudRecordsById(db.sales, (remoteDb.sales || []).map(normalizeServerSale), []);
    if (sRes.changed) { db.sales = sRes.list; anyLocalChange = true; }

    const eRes = mergeCloudRecordsById(db.expenses, remoteDb.expenses, db.deletedExpenseIds);
    if (eRes.changed) { db.expenses = eRes.list; anyLocalChange = true; }

    const empRes = mergeCloudRecordsById(db.employees, remoteDb.employees, db.deletedEmployeeIds);
    if (empRes.changed) { db.employees = empRes.list; anyLocalChange = true; }

    const cpRes = mergeCloudRecordsById(db.catalogPlans, (remoteDb.catalogPlans || []).filter(p => !isLegacyRemovedPlan(p)), []);
    if (cpRes.changed) { db.catalogPlans = cpRes.list; anyLocalChange = true; }

    const logRes = mergeCloudRecordsById(db.accessLogs, remoteDb.accessLogs, []);
    if (logRes.changed) { db.accessLogs = logRes.list.slice(0, 1000); anyLocalChange = true; }

    if (remoteDb.cashSession) {
      const lTs = new Date(db.cashSession?.updatedAt || db.cashSession?.openedAt || 0).getTime();
      const rTs = new Date(remoteDb.cashSession.updatedAt || remoteDb.cashSession.openedAt || 0).getTime();
      if (!db.cashSession || rTs > lTs) {
        db.cashSession = remoteDb.cashSession;
        anyLocalChange = true;
      }
    }
    if (remoteDb.terminalDesign) {
      const lTs = new Date(db.terminalDesign?.updatedAt || 0).getTime();
      const rTs = new Date(remoteDb.terminalDesign.updatedAt || 0).getTime();
      if (!db.terminalDesign || rTs > lTs) {
        db.terminalDesign = remoteDb.terminalDesign;
        anyLocalChange = true;
      }
    }

    if (Array.isArray(remoteDb.pendingVisitRequests)) {
      const vr = mergeCloudRecordsById(db.pendingVisitRequests, remoteDb.pendingVisitRequests, []);
      if (vr.changed) { db.pendingVisitRequests = vr.list; anyLocalChange = true; }
    }
    if (Array.isArray(remoteDb.pendingRegistrationRequests)) {
      const rr = mergeCloudRecordsById(db.pendingRegistrationRequests, remoteDb.pendingRegistrationRequests, []);
      if (rr.changed) { db.pendingRegistrationRequests = rr.list; anyLocalChange = true; }
    }

    lastCloudSyncAt = new Date().toISOString();
    if (anyLocalChange) {
      db.version += 1;
      db.updatedAt = new Date().toISOString();
      saveDbToDisk({ skipCloudPush: true });
      broadcastSseEvent({ type: 'DATABASE_UPDATED', version: db.version, timestamp: Date.now() });
    }
  } catch {
    // offline or unreachable cloud
  } finally {
    isCloudSyncBusy = false;
    if (needsRehydratePush) {
      mirrorPushToCloud().catch(() => {});
    }
  }
}

function scheduleCloudMirrorPush() {
  if (IS_CLOUD_SYNC_DISABLED) return;
  if (cloudMirrorTimer) clearTimeout(cloudMirrorTimer);
  cloudMirrorTimer = setTimeout(() => {
    cloudMirrorTimer = null;
    mirrorPushToCloud().catch(() => {});
  }, 1200);
}

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Access-Control-Request-Private-Network');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

function sendJson(res, statusCode, data) {
  setCorsHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.writeHead(statusCode);
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) { // 50MB limit
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Active Server-Sent Events (SSE) subscribers
const sseClients = new Set();
const recentVisitStatuses = new Map();

function recordVisitStatus(reqId, entry) {
  if (!reqId) return;
  recentVisitStatuses.set(reqId, { ...entry, updatedAt: Date.now() });
  if (recentVisitStatuses.size > 100) {
    const oldestKey = recentVisitStatuses.keys().next().value;
    if (oldestKey) recentVisitStatuses.delete(oldestKey);
  }
}

function broadcastSseEvent(eventData) {
  const message = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Heartbeat ping every 15 seconds to keep SSE connections open indefinitely
let pingInterval = null;

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  try {
    // 0. Server-Sent Events (SSE) Real-Time Stream
    if (pathname === '/api/sync/events' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
      });
      res.write(': connected\n\n');
      sseClients.add(res);
      console.log(`[SSE] Nuevo cliente conectado. Clientes activos en vivo: ${sseClients.size}`);
      
      req.on('close', () => {
        sseClients.delete(res);
        console.log(`[SSE] Cliente desconectado. Clientes activos restantes: ${sseClients.size}`);
      });
      return;
    }

    // 1. Healthcheck and status
    if (pathname === '/api/sync/status' || pathname === '/api/status') {
      return sendJson(res, 200, {
        status: 'online',
        app: 'FITNESS LEGENDS ERP SYNC SERVER',
        version: db.version,
        updatedAt: db.updatedAt,
        membersCount: db.members.length,
        logsCount: db.accessLogs.length,
        sseClientsCount: sseClients.size,
        persistentStorage: true,
        storageBackend: 'local-json',
        cloudMirrorEnabled: !IS_CLOUD_SYNC_DISABLED,
        cloudSyncUrl: IS_CLOUD_SYNC_DISABLED ? null : CLOUD_SYNC_URL,
        lastCloudSyncAt,
        serverTime: new Date().toISOString()
      });
    }

    // 2. GET Members list
    if ((pathname === '/api/sync/members' || pathname === '/api/members') && req.method === 'GET') {
      const clientVersion = parseInt(reqUrl.searchParams.get('sinceVersion') || '0', 10);
      return sendJson(res, 200, {
        version: db.version,
        updatedAt: db.updatedAt,
        hasChanges: clientVersion < db.version,
        members: db.members
      });
    }

    // 3. POST Members list (Update all or add/modify/delete)
    if ((pathname === '/api/sync/members' || pathname === '/api/members') && req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (!Array.isArray(db.deletedMemberIds)) db.deletedMemberIds = [];

      if (Array.isArray(body.members)) {
        if (body.forceReplace) {
          db.members = body.members;
        } else {
          // Merge incoming members with existing db.members so no newly added member is accidentally wiped out
          const mergedMap = new Map();
          for (const m of db.members) {
            if (m && m.id && !db.deletedMemberIds.includes(m.id)) {
              mergedMap.set(m.id, m);
            }
          }
          for (const m of body.members) {
            if (m && m.id && !db.deletedMemberIds.includes(m.id)) {
              mergedMap.set(m.id, { ...(mergedMap.get(m.id) || {}), ...m });
            }
          }
          db.members = Array.from(mergedMap.values());
        }
        db.version += 1;
        db.updatedAt = new Date().toISOString();
        saveDbToDisk();
        console.log(`[SYNC] Lista completa de socios sincronizada (${db.members.length} socios, v${db.version})`);
        
        broadcastSseEvent({
          type: 'MEMBERS_REPLACED',
          members: db.members,
          version: db.version,
          timestamp: Date.now()
        });

        return sendJson(res, 200, {
          success: true,
          version: db.version,
          updatedAt: db.updatedAt,
          membersCount: db.members.length,
          members: db.members
        });
      }

      if (body.action === 'add' && body.member) {
        db.deletedMemberIds = db.deletedMemberIds.filter(id => id !== body.member.id);
        const filtered = db.members.filter(m => m.id !== body.member.id);
        db.members = [body.member, ...filtered];
        db.version += 1;
        db.updatedAt = new Date().toISOString();
        saveDbToDisk();
        console.log(`[SYNC] Socio agregado: ${body.member.fullName} (${body.member.id}, v${db.version})`);

        broadcastSseEvent({
          type: 'MEMBER_ADDED',
          member: body.member,
          version: db.version,
          timestamp: Date.now()
        });

        return sendJson(res, 200, { success: true, version: db.version, member: body.member });
      }

      if (body.action === 'update' && body.member) {
        const exists = db.members.some(m => m.id === body.member.id);
        if (exists) {
          db.members = db.members.map(m => m.id === body.member.id ? { ...m, ...body.member } : m);
        } else {
          db.members = [body.member, ...db.members];
        }
        db.version += 1;
        db.updatedAt = new Date().toISOString();
        saveDbToDisk();
        console.log(`[SYNC] Socio actualizado: ${body.member.fullName} (${body.member.id}, v${db.version})`);

        broadcastSseEvent({
          type: 'MEMBER_UPDATED',
          member: body.member,
          version: db.version,
          timestamp: Date.now()
        });

        return sendJson(res, 200, { success: true, version: db.version, member: body.member });
      }

      if (body.action === 'delete' && body.memberId) {
        if (!db.deletedMemberIds.includes(body.memberId)) {
          db.deletedMemberIds.push(body.memberId);
        }
        db.members = db.members.filter(m => m.id !== body.memberId);
        db.version += 1;
        db.updatedAt = new Date().toISOString();
        saveDbToDisk();
        console.log(`[SYNC] Socio eliminado: ID ${body.memberId} (Restantes: ${db.members.length}, v${db.version})`);

        broadcastSseEvent({
          type: 'MEMBER_DELETED',
          memberId: body.memberId,
          version: db.version,
          timestamp: Date.now()
        });

        return sendJson(res, 200, { success: true, version: db.version, deletedId: body.memberId });
      }

      return sendJson(res, 400, { error: 'Formato de actualizaciÃ³n no vÃ¡lido' });
    }

    // 4. POST Access Log from Turnstile Terminal (Desktop Standalone App)
    if ((pathname === '/api/sync/access-log' || pathname === '/api/access-log') && req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (body.log) {
        const incomingLog = body.log;
        
        // Prevent duplicate logs with same ID
        const existingIdx = db.accessLogs.findIndex(l => l.id === incomingLog.id);
        if (existingIdx >= 0) {
          db.accessLogs[existingIdx] = incomingLog;
        } else {
          db.accessLogs = [incomingLog, ...db.accessLogs].slice(0, 1000); // keep up to 1000 logs
        }
        
        // If granted, also increment checkInsCount on member in database
        if (incomingLog.status === 'granted' && incomingLog.clientId) {
          db.members = db.members.map(m => {
            if (m.id === incomingLog.clientId) {
              return {
                ...m,
                checkInsCount: (m.checkInsCount || 0) + 1,
                lastCheckIn: incomingLog.timestamp || new Date().toISOString()
              };
            }
            return m;
          });
        }

        db.updatedAt = new Date().toISOString();
        saveDbToDisk();

        console.log(`[ACCESO] ${incomingLog.status === 'granted' ? 'âœ…' : 'âŒ'} ${incomingLog.clientName || 'Desconocido'} - ${incomingLog.reason || ''}`);
        
        // BROADCAST INSTANTLY TO ALL CONNECTED ERP DASHBOARDS VIA SSE (<50ms latency)
        broadcastSseEvent({
          type: 'ACCESS_LOG_ADDED',
          log: incomingLog,
          timestamp: Date.now()
        });

        return sendJson(res, 200, { success: true, logId: incomingLog.id });
      }
      return sendJson(res, 400, { error: 'Falta objeto log' });
    }

    // 4.1 GET Pending Visit Requests (optionally checking specific request status)
    if ((pathname === '/api/sync/visit-requests' || pathname === '/api/visit-requests') && req.method === 'GET') {
      if (!Array.isArray(db.pendingVisitRequests)) db.pendingVisitRequests = [];
      const checkId = reqUrl.searchParams.get('id');
      return sendJson(res, 200, {
        requests: db.pendingVisitRequests,
        statusEntry: checkId ? (recentVisitStatuses.get(checkId) || null) : null
      });
    }

    // 4.2 POST New Visit Pass Request from Terminal
    if ((pathname === '/api/sync/visit-request' || pathname === '/api/visit-request') && req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (!Array.isArray(db.pendingVisitRequests)) db.pendingVisitRequests = [];
      
      const reqId = body.id || ('VIS_' + Date.now());
      const visitReq = {
        id: reqId,
        clientName: body.clientName || 'Visitante del Día',
        cost: Number(body.cost) || 50,
        timestamp: body.timestamp || Date.now(),
        status: 'pending'
      };

      db.pendingVisitRequests = [visitReq, ...db.pendingVisitRequests.filter(r => r.id !== reqId)];
      recordVisitStatus(reqId, { status: 'pending', clientName: visitReq.clientName, cost: visitReq.cost });
      db.version += 1;
      db.updatedAt = new Date().toISOString();
      saveDbToDisk();

      console.log(`[VISITA] 🔔 Solicitud de Pase de Visita recibida: ${visitReq.clientName} ($${visitReq.cost})`);

      broadcastSseEvent({
        type: 'VISIT_PASS_REQUESTED',
        visitRequest: visitReq,
        timestamp: Date.now()
      });

      return sendJson(res, 200, { success: true, visitRequest: visitReq });
    }

    // 4.3 POST Authorize Visit Pass from ERP (RP) upon collecting $50
    if ((pathname === '/api/sync/visit-authorize' || pathname === '/api/visit-authorize') && req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (!Array.isArray(db.pendingVisitRequests)) db.pendingVisitRequests = [];
      
      const reqId = body.id;
      const existingStatus = reqId ? recentVisitStatuses.get(reqId) : null;
      if (existingStatus && existingStatus.status === 'authorized') {
        return sendJson(res, 200, {
          success: true,
          authorized: true,
          duplicate: true,
          cost: existingStatus.cost || 50,
          clientName: existingStatus.clientName || 'Visitante del Día'
        });
      }

      const existingReq = db.pendingVisitRequests.find(r => r.id === reqId);
      const clientName = body.clientName || existingReq?.clientName || 'Visitante del Día';
      const cost = Number(body.cost) || existingReq?.cost || 50;
      const paymentMethod = body.paymentMethod || 'cash';
      const authorizedBy = body.authorizedBy || 'Administrador (RP)';

      // Remove from pending
      db.pendingVisitRequests = db.pendingVisitRequests.filter(r => r.id !== reqId);
      recordVisitStatus(reqId, { status: 'authorized', clientName, cost });

      // Create official idempotent complete Sale record of $50 in ERP Ingresos
      const saleId = body.sale?.id || (reqId ? `SALE_VISIT_${reqId}` : ('SALE_VISIT_' + Date.now()));
      const existingSale = Array.isArray(db.sales) ? db.sales.find(s => s.id === saleId) : null;
      const visitSale = existingSale || normalizeServerSale(body.sale || {
        id: saleId,
        folio: `VIS-${String(Date.now()).slice(-4)}`,
        timestamp: new Date().toISOString(),
        clientName: clientName,
        items: [{
          product: {
            id: 'prod_visit_pass',
            name: 'Pase de Visita',
            brand: 'LEGENDS GYM',
            category: 'gear',
            price: cost,
            costPrice: 0,
            stock: 9999,
            minStock: 0
          },
          quantity: 1,
          unitPrice: cost,
          subtotal: cost
        }],
        subtotal: cost,
        tax: 0,
        total: cost,
        paymentMethod: paymentMethod,
        amountPaid: cost,
        changeGiven: 0,
        cashierName: authorizedBy,
        cashierRole: 'admin',
        notes: `Pase de Visita de ${clientName} ($${cost})`,
        saleType: 'visit',
        planName: 'Pase de Visita',
        source: 'terminal_visit_authorized'
      });
      if (!Array.isArray(db.sales)) db.sales = [];
      if (!existingSale) {
        db.sales = [visitSale, ...db.sales];
        if (body.cashSession && body.cashSession.id) {
          db.cashSession = body.cashSession;
        } else {
          applyServerVisitCash(db.cashSession, cost, paymentMethod);
        }
      }

      // Record access log
      const visitLog = {
        id: 'LOG_VIS_' + Date.now(),
        timestamp: new Date().toISOString(),
        clientName: clientName,
        planName: 'Visita ($' + cost + ')',
        status: 'granted',
        method: 'visit_pass',
        reason: 'Visita Autorizada por RP'
      };
      if (!Array.isArray(db.accessLogs)) db.accessLogs = [];
      db.accessLogs = [visitLog, ...db.accessLogs].slice(0, 1000);

      db.version += 1;
      db.updatedAt = new Date().toISOString();
      saveDbToDisk();

      console.log(`[VISITA] ✅ Pase de Visita AUTORIZADO por RP: ${clientName} - $${cost} cobrados`);

      broadcastSseEvent({
        type: 'VISIT_PASS_AUTHORIZED',
        visitRequest: { id: reqId, clientName, cost, status: 'authorized' },
        sale: visitSale,
        cashSession: db.cashSession,
        log: visitLog,
        version: db.version,
        timestamp: Date.now()
      });

      return sendJson(res, 200, {
        success: true,
        authorized: true,
        cost,
        clientName,
        saleId,
        logId: visitLog.id
      });
    }

    // 4.4 POST Reject Visit Pass from ERP
    if ((pathname === '/api/sync/visit-reject' || pathname === '/api/visit-reject') && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const reqId = body.id;
      if (!Array.isArray(db.pendingVisitRequests)) db.pendingVisitRequests = [];
      db.pendingVisitRequests = db.pendingVisitRequests.filter(r => r.id !== reqId);
      recordVisitStatus(reqId, { status: 'rejected', clientName: '' });
      db.version += 1;
      db.updatedAt = new Date().toISOString();
      saveDbToDisk();

      console.log(`[VISITA] ❌ Pase de Visita rechazado: ${reqId}`);

      broadcastSseEvent({
        type: 'VISIT_PASS_REJECTED',
        visitRequest: { id: reqId, clientName: '', cost: 50, status: 'rejected' },
        visitRequestId: reqId,
        timestamp: Date.now()
      });

      return sendJson(res, 200, { success: true, rejected: true, id: reqId });
    }

    // 4.5 GET Pending Member Registration Requests
    if ((pathname === '/api/sync/registration-requests' || pathname === '/api/registration-requests') && req.method === 'GET') {
      if (!Array.isArray(db.pendingRegistrationRequests)) db.pendingRegistrationRequests = [];
      return sendJson(res, 200, {
        requests: db.pendingRegistrationRequests
      });
    }

    // 4.6 POST New Member Registration Request from Terminal
    if ((pathname === '/api/sync/registration-request' || pathname === '/api/registration-request') && req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (!Array.isArray(db.pendingRegistrationRequests)) db.pendingRegistrationRequests = [];
      
      const reqId = body.id || ('REG_' + Date.now());
      const regReq = {
        id: reqId,
        memberData: body.memberData || {},
        paymentMethod: body.paymentMethod || 'cash',
        timestamp: body.timestamp || Date.now(),
        status: 'pending'
      };

      db.pendingRegistrationRequests = [regReq, ...db.pendingRegistrationRequests.filter(r => r.id !== reqId)];
      db.version += 1;
      db.updatedAt = new Date().toISOString();
      saveDbToDisk();

      console.log(`[REGISTRO] 🔔 Solicitud de Alta de Socio recibida: ${regReq.memberData.fullName || 'Nuevo Socio'} ($${regReq.memberData.planPrice || 0})`);

      broadcastSseEvent({
        type: 'MEMBER_REGISTRATION_REQUESTED',
        registrationRequest: regReq,
        timestamp: Date.now()
      });

      return sendJson(res, 200, { success: true, registrationRequest: regReq });
    }

    // 4.7 POST Authorize Member Registration from ERP upon collecting payment
    if ((pathname === '/api/sync/registration-authorize' || pathname === '/api/registration-authorize') && req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (!Array.isArray(db.pendingRegistrationRequests)) db.pendingRegistrationRequests = [];
      
      const reqId = body.id;
      db.pendingRegistrationRequests = db.pendingRegistrationRequests.filter(r => r.id !== reqId);

      const member = body.member;
      const incomingMembers = Array.isArray(body.members) && body.members.length > 0
        ? body.members.filter(m => m && m.id)
        : (member && member.id ? [member] : []);
      const primaryMember = incomingMembers[0] || member;
      const sale = body.sale;
      const paymentMethod = body.paymentMethod || 'cash';
      const planPrice = Number(primaryMember?.membership?.price || sale?.total || 0);

      if (incomingMembers.length > 0) {
        if (!Array.isArray(db.members)) db.members = [];
        const incomingIds = new Set(incomingMembers.map(m => m.id));
        db.members = [...incomingMembers, ...db.members.filter(m => !incomingIds.has(m.id))];
      }

      const normalizedRegSale = sale && sale.id ? normalizeServerSale(sale) : null;
      const existingRegSale = normalizedRegSale && Array.isArray(db.sales)
        ? db.sales.find(s => s.id === normalizedRegSale.id)
        : null;

      if (normalizedRegSale) {
        if (!Array.isArray(db.sales)) db.sales = [];
        db.sales = [normalizedRegSale, ...db.sales.filter(s => s.id !== normalizedRegSale.id)];
      }

      if (body.cashSession && body.cashSession.id) {
        db.cashSession = body.cashSession;
      } else if (!existingRegSale && planPrice > 0) {
        applyServerMembershipCash(db.cashSession, planPrice, paymentMethod);
      }

      const memberNamesList = incomingMembers.length > 1
        ? incomingMembers.map(m => m.fullName).join(', ')
        : (primaryMember?.fullName || 'Nuevo Socio');

      const regLog = {
        id: 'LOG_REG_' + Date.now(),
        timestamp: new Date().toISOString(),
        clientName: memberNamesList,
        planName: primaryMember?.membership?.planName || 'Membresía',
        status: 'granted',
        method: 'membership_registration',
        reason: incomingMembers.length > 1
          ? `Alta Grupal (${incomingMembers.length} socios) y Pago Registrado en RP • Torniquete Abierto`
          : 'Alta de Socio y Pago Registrado en RP • Torniquete Abierto'
      };
      if (!Array.isArray(db.accessLogs)) db.accessLogs = [];
      db.accessLogs = [regLog, ...db.accessLogs].slice(0, 1000);

      db.version += 1;
      db.updatedAt = new Date().toISOString();
      saveDbToDisk();

      console.log(`[REGISTRO] ✅ Alta de Socio AUTORIZADA por RP: ${memberNamesList} - $${planPrice} cobrados`);

      broadcastSseEvent({
        type: 'MEMBER_REGISTRATION_AUTHORIZED',
        registrationRequest: { id: reqId, memberData: primaryMember, status: 'authorized' },
        member: primaryMember,
        members: incomingMembers,
        sale: normalizedRegSale || sale,
        cashSession: db.cashSession,
        log: regLog,
        version: db.version,
        timestamp: Date.now()
      });

      return sendJson(res, 200, {
        success: true,
        authorized: true,
        id: reqId,
        memberId: primaryMember?.id,
        memberIds: incomingMembers.map(m => m.id),
        saleId: sale?.id
      });
    }

    // 4.8 POST Reject Member Registration from ERP
    if ((pathname === '/api/sync/registration-reject' || pathname === '/api/registration-reject') && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const reqId = body.id;
      if (!Array.isArray(db.pendingRegistrationRequests)) db.pendingRegistrationRequests = [];
      db.pendingRegistrationRequests = db.pendingRegistrationRequests.filter(r => r.id !== reqId);
      db.version += 1;
      db.updatedAt = new Date().toISOString();
      saveDbToDisk();

      console.log(`[REGISTRO] ❌ Solicitud de Alta de Socio rechazada: ${reqId}`);

      broadcastSseEvent({
        type: 'MEMBER_REGISTRATION_REJECTED',
        registrationRequestId: reqId,
        timestamp: Date.now()
      });

      return sendJson(res, 200, { success: true, rejected: true, id: reqId });
    }

    // 5. GET Access Logs
    if ((pathname === '/api/sync/access-logs' || pathname === '/api/access-logs') && req.method === 'GET') {
      return sendJson(res, 200, {
        logs: db.accessLogs
      });
    }

    // 6. Full Database Sync (GET & POST)
    if ((pathname === '/api/sync/database' || pathname === '/api/database') && req.method === 'GET') {
      return sendJson(res, 200, {
        success: true,
        version: db.version,
        updatedAt: db.updatedAt,
        database: db
      });
    }

    if ((pathname === '/api/sync/database' || pathname === '/api/database') && req.method === 'POST') {
      const body = await parseJsonBody(req);
      
      if (body.action === 'entity_change') {
        const { entity, changeType, item, itemId } = body;
        if (!entity) return sendJson(res, 400, { error: 'Falta campo entity' });

        if (entity === 'members') {
          if (!Array.isArray(db.members)) db.members = [];
          if (!Array.isArray(db.deletedMemberIds)) db.deletedMemberIds = [];
          if (changeType === 'delete') {
            const id = itemId || item?.id;
            if (id) {
              if (!db.deletedMemberIds.includes(id)) db.deletedMemberIds.push(id);
              db.members = db.members.filter(m => m.id !== id);
              broadcastSseEvent({ type: 'MEMBER_DELETED', memberId: id, version: db.version + 1, timestamp: Date.now() });
              console.log(`[SYNC] Socio eliminado via database sync: ${id}`);
            }
          } else if (item && item.id) {
            db.deletedMemberIds = db.deletedMemberIds.filter(id => id !== item.id);
            const exists = db.members.some(m => m.id === item.id);
            if (exists) {
              db.members = db.members.map(m => m.id === item.id ? { ...m, ...item } : m);
              broadcastSseEvent({ type: 'MEMBER_UPDATED', member: item, version: db.version + 1, timestamp: Date.now() });
              console.log(`[SYNC] Socio actualizado via database sync: ${item.fullName || item.id}`);
            } else {
              db.members = [item, ...db.members];
              broadcastSseEvent({ type: 'MEMBER_ADDED', member: item, version: db.version + 1, timestamp: Date.now() });
              console.log(`[SYNC] Nuevo socio registrado via database sync: ${item.fullName || item.id}`);
            }
          }
        } else if (entity === 'products') {
          if (!Array.isArray(db.products)) db.products = [];
          if (!Array.isArray(db.deletedProductIds)) db.deletedProductIds = [];
          if (changeType === 'delete') {
            const id = itemId || item?.id;
            if (id) {
              db.deletedProductIds.push(id);
              db.products = db.products.filter(p => p.id !== id);
            }
          } else if (item && item.id) {
            db.deletedProductIds = db.deletedProductIds.filter(id => id !== item.id);
            const exists = db.products.some(p => p.id === item.id);
            if (exists) {
              db.products = db.products.map(p => p.id === item.id ? { ...p, ...item } : p);
            } else {
              db.products = [item, ...db.products];
            }
          }
        } else if (entity === 'sales') {
          if (!Array.isArray(db.sales)) db.sales = [];
          if (item && item.id) {
            const exists = db.sales.some(s => s.id === item.id);
            if (exists) {
              db.sales = db.sales.map(s => s.id === item.id ? { ...s, ...item } : s);
            } else {
              db.sales = [item, ...db.sales];
            }
          }
        } else if (entity === 'expenses') {
          if (!Array.isArray(db.expenses)) db.expenses = [];
          if (!Array.isArray(db.deletedExpenseIds)) db.deletedExpenseIds = [];
          if (changeType === 'delete') {
            const id = itemId || item?.id;
            if (id) {
              db.deletedExpenseIds.push(id);
              db.expenses = db.expenses.filter(e => e.id !== id);
            }
          } else if (item && item.id) {
            db.deletedExpenseIds = db.deletedExpenseIds.filter(id => id !== item.id);
            const exists = db.expenses.some(e => e.id === item.id);
            if (exists) {
              db.expenses = db.expenses.map(e => e.id === item.id ? { ...e, ...item } : e);
            } else {
              db.expenses = [item, ...db.expenses];
            }
          }
        } else if (entity === 'cashSession') {
          if (item) db.cashSession = item;
        } else if (entity === 'employees') {
          if (!Array.isArray(db.employees)) db.employees = [];
          if (!Array.isArray(db.deletedEmployeeIds)) db.deletedEmployeeIds = [];
          if (changeType === 'delete') {
            const id = itemId || item?.id;
            if (id) {
              db.deletedEmployeeIds.push(id);
              db.employees = db.employees.filter(e => e.id !== id);
            }
          } else if (item && item.id) {
            db.deletedEmployeeIds = db.deletedEmployeeIds.filter(id => id !== item.id);
            const exists = db.employees.some(e => e.id === item.id);
            if (exists) {
              db.employees = db.employees.map(e => e.id === item.id ? { ...e, ...item } : e);
            } else {
              db.employees = [item, ...db.employees];
            }
          }
        } else if (entity === 'settings') {
          if (item) db.settings = { ...(db.settings || {}), ...item };
        } else if (entity === 'roles') {
          if (Array.isArray(item)) db.roles = item.filter(r => r && r.id !== 'trainer');
        } else if (entity === 'branches') {
          if (Array.isArray(item)) {
            db.branches = item;
          } else if (item && item.id) {
            if (!Array.isArray(db.branches)) db.branches = [];
            const exists = db.branches.some(b => b.id === item.id);
            db.branches = exists ? db.branches.map(b => b.id === item.id ? { ...b, ...item } : b) : [item, ...db.branches];
          }
        } else if (entity === 'terminalDesign') {
          if (item) db.terminalDesign = item;
        } else if (entity === 'catalogPlans') {
          if (!Array.isArray(db.catalogPlans)) db.catalogPlans = [];
          if (changeType === 'delete') {
            const id = itemId || item?.id;
            if (id) db.catalogPlans = db.catalogPlans.filter(p => p.id !== id);
          } else if (item && item.id) {
            const exists = db.catalogPlans.some(p => p.id === item.id);
            if (exists) {
              db.catalogPlans = db.catalogPlans.map(p => p.id === item.id ? { ...p, ...item } : p);
            } else {
              db.catalogPlans = [...db.catalogPlans, item];
            }
          }
        }

        db.version += 1;
        db.updatedAt = new Date().toISOString();
        saveDbToDisk();
        broadcastSseEvent({ type: 'DATABASE_UPDATED', entity, changeType, version: db.version, timestamp: Date.now() });
        return sendJson(res, 200, { success: true, version: db.version, updatedAt: db.updatedAt, entity, changeType });
      }

      if (body.action === 'full_sync' || body.database) {
        const incoming = body.database || body;
        if (Array.isArray(incoming.deletedMemberIds)) {
          db.deletedMemberIds = Array.from(new Set([...(db.deletedMemberIds || []), ...incoming.deletedMemberIds]));
        }
        if (Array.isArray(incoming.deletedProductIds)) {
          db.deletedProductIds = Array.from(new Set([...(db.deletedProductIds || []), ...incoming.deletedProductIds]));
        }
        if (Array.isArray(incoming.deletedExpenseIds)) {
          db.deletedExpenseIds = Array.from(new Set([...(db.deletedExpenseIds || []), ...incoming.deletedExpenseIds]));
        }
        if (Array.isArray(incoming.deletedEmployeeIds)) {
          db.deletedEmployeeIds = Array.from(new Set([...(db.deletedEmployeeIds || []), ...incoming.deletedEmployeeIds.filter(id => id !== 'EMP-000')]));
        }
        if (Array.isArray(incoming.members)) {
          const map = new Map();
          for (const m of db.members || []) if (m && m.id && !db.deletedMemberIds?.includes(m.id)) map.set(m.id, m);
          for (const m of incoming.members) if (m && m.id && !db.deletedMemberIds?.includes(m.id)) map.set(m.id, { ...(map.get(m.id) || {}), ...m });
          db.members = Array.from(map.values());
        }
        if (Array.isArray(incoming.products)) {
          const map = new Map();
          for (const p of db.products || []) if (p && p.id && !db.deletedProductIds?.includes(p.id)) map.set(p.id, p);
          for (const p of incoming.products) if (p && p.id && !db.deletedProductIds?.includes(p.id)) map.set(p.id, { ...(map.get(p.id) || {}), ...p });
          db.products = Array.from(map.values());
        }
        if (Array.isArray(incoming.sales)) {
          const map = new Map();
          for (const s of db.sales || []) if (s && s.id) map.set(s.id, normalizeServerSale(s));
          for (const s of incoming.sales) if (s && s.id) map.set(s.id, { ...(map.get(s.id) || {}), ...normalizeServerSale(s) });
          db.sales = Array.from(map.values());
        }
        if (Array.isArray(incoming.expenses)) {
          const map = new Map();
          for (const e of db.expenses || []) if (e && e.id && !db.deletedExpenseIds?.includes(e.id)) map.set(e.id, e);
          for (const e of incoming.expenses) if (e && e.id && !db.deletedExpenseIds?.includes(e.id)) map.set(e.id, { ...(map.get(e.id) || {}), ...e });
          db.expenses = Array.from(map.values());
        }
        if (incoming.cashSession) {
          const lTs = new Date(db.cashSession?.updatedAt || db.cashSession?.openedAt || 0).getTime();
          const rTs = new Date(incoming.cashSession.updatedAt || incoming.cashSession.openedAt || 0).getTime();
          if (!db.cashSession || rTs >= lTs) db.cashSession = incoming.cashSession;
        }
        if (Array.isArray(incoming.employees)) {
          const map = new Map();
          for (const emp of db.employees || []) if (emp && emp.id && !db.deletedEmployeeIds?.includes(emp.id) && emp.role !== 'trainer') map.set(emp.id, emp);
          for (const emp of incoming.employees) {
            if (emp && emp.id && !db.deletedEmployeeIds?.includes(emp.id) && !(emp.id === 'EMP-003' && emp.role === 'trainer')) {
              const normEmp = emp.role === 'trainer' ? { ...emp, role: 'receptionist' } : emp;
              const existing = map.get(normEmp.id);
              if (!existing) {
                map.set(normEmp.id, normEmp);
              } else {
                const exTs = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
                const incTs = normEmp.updatedAt ? new Date(normEmp.updatedAt).getTime() : 0;
                if (incTs > exTs || (exTs === 0 && incTs === 0)) {
                  map.set(normEmp.id, { ...existing, ...normEmp });
                }
              }
            }
          }
          db.employees = Array.from(map.values());
        }
        if (Array.isArray(incoming.roles) && incoming.roles.length > 0) {
          db.roles = incoming.roles.filter(r => r && r.id !== 'trainer');
        }
        if (Array.isArray(incoming.branches) && incoming.branches.length > 0) {
          const map = new Map();
          for (const b of db.branches || []) if (b && b.id) map.set(b.id, b);
          for (const b of incoming.branches) if (b && b.id) map.set(b.id, { ...(map.get(b.id) || {}), ...b });
          db.branches = Array.from(map.values());
        }
        if (incoming.settings) db.settings = { ...(db.settings || {}), ...incoming.settings };
        if (incoming.terminalDesign) {
          const curTs = new Date(db.terminalDesign?.updatedAt || 0).getTime();
          const incTs = new Date(incoming.terminalDesign.updatedAt || 0).getTime();
          if (!db.terminalDesign || incTs >= curTs) {
            db.terminalDesign = incoming.terminalDesign;
          }
        }
        if (Array.isArray(incoming.catalogPlans)) {
          const map = new Map();
          for (const p of db.catalogPlans || []) if (!isLegacyRemovedPlan(p)) map.set(p.id, p);
          for (const p of incoming.catalogPlans) if (!isLegacyRemovedPlan(p)) map.set(p.id, { ...(map.get(p.id) || {}), ...p });
          db.catalogPlans = Array.from(map.values());
        }
        if (Array.isArray(incoming.accessLogs)) {
          const map = new Map();
          for (const l of db.accessLogs || []) if (l && l.id) map.set(l.id, l);
          for (const l of incoming.accessLogs) if (l && l.id) map.set(l.id, l);
          db.accessLogs = Array.from(map.values()).slice(0, 1000);
        }

        db.version += 1;
        db.updatedAt = new Date().toISOString();
        saveDbToDisk();
        broadcastSseEvent({ type: 'DATABASE_UPDATED', version: db.version, timestamp: Date.now() });
        return sendJson(res, 200, { success: true, version: db.version, updatedAt: db.updatedAt, database: db });
      }

      return sendJson(res, 400, { error: 'Formato no vÃ¡lido' });
    }

    // Default 404
    return sendJson(res, 404, { error: 'Ruta no encontrada', path: pathname });
  } catch (err) {
    console.error('[ERROR] Error en peticiÃ³n sync:', err);
    return sendJson(res, 500, { error: 'Error interno del servidor de sincronizaciÃ³n' });
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[SYNC SERVER] Puerto ${PORT} ya estÃ¡ en uso por otra instancia. Modo cliente LAN compartido activo.`);
  } else {
    console.error('[SYNC SERVER] Error del servidor:', err);
  }
});

function startServer(port = PORT) {
  server.listen(port, '0.0.0.0', () => {
    saveDbToDisk({ skipCloudPush: true });
    if (!pingInterval) {
      pingInterval = setInterval(() => {
        for (const client of sseClients) {
          try {
            client.write(': ping\n\n');
          } catch {
            sseClients.delete(client);
          }
        }
      }, 15000);
    }
    if (!IS_CLOUD_SYNC_DISABLED) {
      setTimeout(() => {
        mirrorPullFromCloud()
          .then(() => mirrorPushToCloud())
          .catch(() => {});
      }, 1500);
      if (!cloudPollInterval) {
        cloudPollInterval = setInterval(() => {
          mirrorPullFromCloud().catch(() => {});
        }, 12000);
      }
    }
    const ips = getLocalIpAddresses();
    console.log('\n======================================================');
    console.log('   FITNESS LEGENDS - SERVIDOR DE SINCRONIZACIÓN LAN');
    console.log('======================================================');
    console.log(`[*] Puerto activo: ${port}`);
    console.log('[*] Direcciones IP disponibles para conectar la terminal:');
    ips.forEach(ip => {
      console.log(`    -> http://${ip}:${port}`);
    });
    console.log(`    -> http://localhost:${port} (mismo equipo)`);
    console.log('======================================================\n');
  });
}

// Auto-start when executed directly via node
if (require.main === module) {
  startServer(PORT);
}

module.exports = {
  server,
  startServer,
  broadcastSseEvent,
  db
};

