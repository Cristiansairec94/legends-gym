const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3001;
const WORKSPACE_DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_DATA_DIR = __dirname.includes('app.asar')
  ? path.resolve(path.dirname(process.execPath), 'data')
  : path.resolve(__dirname, '../data');
const DATA_DIR = fs.existsSync(WORKSPACE_DATA_DIR) ? WORKSPACE_DATA_DIR : LOCAL_DATA_DIR;
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
const DEFAULT_MEMBERS = [
  {
    id: 'MEM-001',
    fullName: 'Carlos Mendoza',
    documentId: '45892011',
    email: 'carlos.mendoza@email.com',
    phone: '+52 55 1234 5678',
    birthDate: '1992-05-14',
    emergencyContact: {
      name: 'María Mendoza',
      phone: '+52 55 9876 5432',
      relationship: 'Esposa',
    },
    medicalNotes: 'Hipertensión leve controlada. Apto para levantamiento de fuerza.',
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
    lastCheckIn: new Date().toISOString(),
    totalSpentInStore: 3450,
    createdAt: '2025-01-10',
  },
  {
    id: 'MEM-002',
    fullName: 'Valeria Ríos Gómez',
    documentId: '78291034',
    email: 'valeria.rios@email.com',
    phone: '+52 55 4433 2211',
    birthDate: '1998-11-20',
    emergencyContact: {
      name: 'Roberto Ríos',
      phone: '+52 55 2211 4433',
      relationship: 'Padre',
    },
    medicalNotes: 'Ninguna lesión. Entrenamiento de hipertrofia y glúteos.',
    biometricRegistered: true,
    biometricHash: 'BIO_HASH_RIOS_002',
    biometricTemplate: 'FP_INDEX_RIGHT_002',
    membership: {
      planType: 'monthly',
      planName: 'Mensualidad Estándar',
      startDate: '2026-09-25',
      endDate: '2026-10-25',
      price: 850,
      status: 'active',
      daysRemaining: 18,
    },
    checkInsCount: 28,
    lastCheckIn: new Date().toISOString(),
    totalSpentInStore: 1200,
    createdAt: '2026-06-15',
  },
  {
    id: 'MEM-003',
    fullName: 'Alejandro Soto Vega',
    documentId: '63901245',
    email: 'alejandro.soto@email.com',
    phone: '+52 55 7788 9900',
    birthDate: '1989-03-30',
    emergencyContact: {
      name: 'Lorena Vega',
      phone: '+52 55 3344 5566',
      relationship: 'Hermana',
    },
    medicalNotes: 'Operación de menisco en 2023. Evitar sentadillas profundas sin vendaje.',
    biometricRegistered: true,
    biometricHash: 'BIO_HASH_SOTO_003',
    biometricTemplate: 'FP_THUMB_RIGHT_003',
    membership: {
      planType: 'quarterly',
      planName: 'Plan Trimestral Fuerza',
      startDate: '2026-07-09',
      endDate: '2026-10-09',
      price: 2300,
      status: 'expiring_soon',
      daysRemaining: 2,
    },
    checkInsCount: 56,
    lastCheckIn: new Date().toISOString(),
    totalSpentInStore: 2100,
    createdAt: '2025-07-09',
  },
  {
    id: 'MEM-004',
    fullName: 'Sofía Domínguez',
    documentId: '89104523',
    email: 'sofia.dominguez@email.com',
    phone: '+52 55 6655 4433',
    birthDate: '1995-08-12',
    emergencyContact: {
      name: 'Andrés Domínguez',
      phone: '+52 55 1199 8877',
      relationship: 'Esposo',
    },
    medicalNotes: 'Alergia a la proteína de soya.',
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
    lastCheckIn: new Date().toISOString(),
    totalSpentInStore: 350,
    createdAt: '2026-05-02',
  },
  {
    id: 'MEM-005',
    fullName: 'Mateo Guerrero',
    documentId: '32091487',
    email: 'mateo.guerrero@email.com',
    phone: '+52 55 9900 1122',
    birthDate: '2004-02-18',
    emergencyContact: {
      name: 'Patricia Guerrero',
      phone: '+52 55 8822 3344',
      relationship: 'Madre',
    },
    medicalNotes: 'Desarrollo muscular juvenil.',
    biometricRegistered: true,
    biometricHash: 'BIO_HASH_GUERRERO_005',
    biometricTemplate: 'FP_THUMB_LEFT_005',
    membership: {
      planType: 'monthly',
      planName: 'Plan Estudiante Gym',
      startDate: '2026-09-29',
      endDate: '2026-10-29',
      price: 650,
      status: 'active',
      daysRemaining: 22,
    },
    checkInsCount: 15,
    lastCheckIn: new Date().toISOString(),
    totalSpentInStore: 450,
    createdAt: '2026-08-29',
  },
  {
    id: 'MEM-006',
    fullName: 'Laura Paredes Ruiz',
    documentId: '54019283',
    email: 'laura.paredes@email.com',
    phone: '+52 55 3322 1100',
    birthDate: '1997-07-04',
    emergencyContact: {
      name: 'Carmen Ruiz',
      phone: '+52 55 4411 9988',
      relationship: 'Madre',
    },
    medicalNotes: 'Inscripción reciente. Apta para actividad física.',
    biometricRegistered: true,
    biometricHash: 'BIO_HASH_PAREDES_006',
    biometricTemplate: 'FP_THUMB_RIGHT_006',
    membership: {
      planType: 'monthly',
      planName: 'Mensualidad Estándar',
      startDate: '2026-10-06',
      endDate: '2026-11-06',
      price: 850,
      status: 'active',
      daysRemaining: 30,
    },
    checkInsCount: 1,
    totalSpentInStore: 850,
    createdAt: '2026-10-06',
  },
  {
    id: 'MEM-007',
    fullName: 'Diego Alarcón Cruz',
    documentId: '90812345',
    email: 'diego.alarcon@email.com',
    phone: '+52 55 8765 4321',
    birthDate: '1991-09-17',
    emergencyContact: {
      name: 'Gabriel Alarcón',
      phone: '+52 55 7766 5544',
      relationship: 'Hermano',
    },
    medicalNotes: 'Entrenamiento funcional de alta intensidad.',
    biometricRegistered: true,
    biometricHash: 'BIO_HASH_ALARCON_007',
    biometricTemplate: 'FP_INDEX_RIGHT_007',
    membership: {
      planType: 'daily',
      planName: 'Pase por Día (Day Pass)',
      startDate: '2026-10-05',
      endDate: '2026-10-05',
      price: 150,
      status: 'expired',
      daysRemaining: -2,
    },
    checkInsCount: 4,
    lastCheckIn: new Date().toISOString(),
    totalSpentInStore: 180,
    createdAt: '2026-09-01',
  },
  {
    id: 'MEM-008',
    fullName: 'Juan Solis',
    documentId: '55892018',
    email: 'juan.solis@email.com',
    phone: '+52 55 6789 1234',
    birthDate: '1994-04-12',
    emergencyContact: {
      name: 'Familiar de Contacto',
      phone: '+52 55 9999 8888',
      relationship: 'Familiar',
    },
    medicalNotes: 'Apto para actividad física general.',
    biometricRegistered: true,
    biometricHash: 'BIO_HASH_SOLIS_008',
    biometricTemplate: 'FP_THUMB_RIGHT_008',
    membership: {
      planType: 'monthly',
      planName: 'Mensualidad Estándar',
      startDate: '2026-10-13',
      endDate: '2026-11-12',
      price: 850,
      status: 'active',
      daysRemaining: 30,
    },
    checkInsCount: 0,
    totalSpentInStore: 850,
    createdAt: '2026-10-13',
  }
];

// In-memory state with file backing
let db = {
  version: 1,
  updatedAt: new Date().toISOString(),
  members: [],
  deletedMemberIds: [],
  accessLogs: []
};

// Load existing database if available
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    db = { ...db, ...parsed };
    if (!Array.isArray(db.deletedMemberIds)) db.deletedMemberIds = [];
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
saveDbToDisk();

function saveDbToDisk() {
  try {
    if (Array.isArray(db.members)) {
      db.members = db.members.map(m => {
        if (m && typeof m.avatarUrl === 'string' && m.avatarUrl.length > 150000) {
          const { avatarUrl, ...rest } = m;
          return rest;
        }
        return m;
      });
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
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('[DB] Error guardando en disco:', e);
  }
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
const pingInterval = setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': ping\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 15000);

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

      return sendJson(res, 400, { error: 'Formato de actualización no válido' });
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

        console.log(`[ACCESO] ${incomingLog.status === 'granted' ? '✅' : '❌'} ${incomingLog.clientName || 'Desconocido'} - ${incomingLog.reason || ''}`);
        
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

    // 5. GET Access Logs
    if ((pathname === '/api/sync/access-logs' || pathname === '/api/access-logs') && req.method === 'GET') {
      return sendJson(res, 200, {
        logs: db.accessLogs
      });
    }

    // Default 404
    return sendJson(res, 404, { error: 'Ruta no encontrada', path: pathname });
  } catch (err) {
    console.error('[ERROR] Error en petición sync:', err);
    return sendJson(res, 500, { error: 'Error interno del servidor de sincronización' });
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[SYNC SERVER] Puerto ${PORT} ya está en uso por otra instancia. Modo cliente LAN compartido activo.`);
  } else {
    console.error('[SYNC SERVER] Error del servidor:', err);
  }
});

function startServer(port = PORT) {
  server.listen(port, '0.0.0.0', () => {
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
