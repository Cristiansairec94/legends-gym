import { 
  getFullDatabase, 
  saveFullDatabase, 
  updateEntity, 
  getMembers, 
  saveMembers, 
  addOrUpdateMember, 
  deleteMember, 
  addAccessLog, 
  getAccessLogs 
} from './_store.js';

export default async function handler(req, res) {
  // Global CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const urlPath = req.url || '';
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }

  try {
    // 1. Endpoint: /api/sync/status
    if (urlPath.includes('/status')) {
      const store = await getFullDatabase();
      return res.status(200).json({
        status: 'online',
        app: 'FITNESS LEGENDS ERP SYNC SERVER (CLOUD / VERCEL)',
        version: store.version,
        updatedAt: store.updatedAt,
        membersCount: store.members?.length || 0,
        productsCount: store.products?.length || 0,
        employeesCount: store.employees?.length || 0,
        logsCount: store.accessLogs?.length || 0,
        cloud: true,
        serverTime: new Date().toISOString()
      });
    }

    // 2. Endpoint: /api/sync/access-logs or /api/sync/access-log
    if (urlPath.includes('/access-log')) {
      if (req.method === 'POST') {
        if (body?.log) {
          const store = await addAccessLog(body.log);
          return res.status(200).json({
            success: true,
            version: store.version,
            logId: body.log.id
          });
        }
        return res.status(400).json({ error: 'Falta objeto log' });
      }

      if (req.method === 'GET') {
        const logs = await getAccessLogs();
        return res.status(200).json({
          success: true,
          logs: logs || []
        });
      }
    }

    // 3. Endpoint: /api/sync/members
    if (urlPath.includes('/members')) {
      if (req.method === 'GET') {
        const store = await getMembers();
        return res.status(200).json({
          success: true,
          version: store.version,
          updatedAt: store.updatedAt,
          members: store.members || [],
          hasChanges: true
        });
      }

      if (req.method === 'POST') {
        if (Array.isArray(body?.members)) {
          const store = await saveMembers(body.members);
          return res.status(200).json({
            success: true,
            version: store.version,
            membersCount: store.members?.length || 0,
            updatedAt: store.updatedAt
          });
        }

        if (body?.action === 'add' || body?.action === 'update') {
          if (!body.member) return res.status(400).json({ error: 'Falta objeto member' });
          const store = await addOrUpdateMember(body.member);
          return res.status(200).json({
            success: true,
            version: store.version,
            member: body.member
          });
        }

        if (body?.action === 'delete') {
          const id = body.memberId || body.id;
          if (!id) return res.status(400).json({ error: 'Falta memberId para eliminar' });
          const store = await deleteMember(id);
          return res.status(200).json({
            success: true,
            version: store.version,
            deletedId: id
          });
        }
      }
    }

    // 4. Endpoint: /api/sync/database (Master Full & Atomic Sync)
    if (req.method === 'GET') {
      const store = await getFullDatabase();
      const sinceParam = req.query?.sinceVersion || (new URL(urlPath, 'http://localhost').searchParams.get('sinceVersion')) || 0;
      const since = parseInt(sinceParam, 10);

      if (since > 0 && store.version <= since) {
        return res.status(200).json({
          success: true,
          version: store.version,
          updatedAt: store.updatedAt,
          hasChanges: false
        });
      }

      return res.status(200).json({
        success: true,
        version: store.version,
        updatedAt: store.updatedAt,
        hasChanges: true,
        database: store
      });
    }

    if (req.method === 'POST') {
      // Atomic Entity Change (products, sales, expenses, cashSession, employees, settings, catalogPlans, members, accessLogs)
      if (body?.action === 'entity_change') {
        const { entity, changeType, item, itemId } = body;
        if (!entity) {
          return res.status(400).json({ error: 'Falta campo entity' });
        }

        if (entity === 'members') {
          let store;
          if (changeType === 'delete') {
            store = await deleteMember(itemId || item?.id);
          } else if (item) {
            store = await addOrUpdateMember(item);
          }
          return res.status(200).json({
            success: true,
            version: store?.version,
            updatedAt: store?.updatedAt,
            entity,
            changeType
          });
        }

        if (entity === 'accessLogs' || entity === 'accessLog') {
          const store = await addAccessLog(item);
          return res.status(200).json({
            success: true,
            version: store.version,
            updatedAt: store.updatedAt,
            entity,
            changeType
          });
        }

        const updatedStore = await updateEntity(entity, changeType, item, itemId);
        return res.status(200).json({
          success: true,
          version: updatedStore.version,
          updatedAt: updatedStore.updatedAt,
          entity,
          changeType
        });
      }

      // Full Database Sync / Import / Backup Restore
      if (body?.action === 'full_sync' || body?.database) {
        const incomingDb = body.database || body;
        const updatedStore = await saveFullDatabase(incomingDb);
        return res.status(200).json({
          success: true,
          version: updatedStore.version,
          updatedAt: updatedStore.updatedAt,
          database: updatedStore
        });
      }

      return res.status(400).json({ error: 'Formato o acción no válida' });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en /api/sync master handler:', err);
    return res.status(500).json({ error: 'Error interno en servidor Vercel: ' + err.message });
  }
}
