import {
  getStorageDiagnostics,
  getFullDatabase,
  saveFullDatabase,
  updateEntity,
  getMembers,
  saveMembers,
  addOrUpdateMember,
  deleteMember,
  addAccessLog,
  getAccessLogs,
  getVisitRequests,
  createVisitRequest,
  authorizeVisitRequest,
  rejectVisitRequest,
  getRegistrationRequests,
  createRegistrationRequest,
  authorizeRegistrationRequest,
  rejectRegistrationRequest,
  getRecentEvents,
} from './_store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawUrl = req.url || '/';
  const parsedUrl = new URL(rawUrl, 'http://localhost');
  const pathname = parsedUrl.pathname;

  let body = req.body;
  if (typeof body === 'string' && body.trim()) {
    try {
      body = JSON.parse(body);
    } catch {}
  }

  try {
    // 1. /api/sync/status
    if (pathname.endsWith('/status')) {
      const store = await getFullDatabase();
      const diag = getStorageDiagnostics();
      return res.status(200).json({
        status: 'online',
        app: 'FITNESS LEGENDS ERP SYNC SERVER (CLOUD / VERCEL)',
        version: store.version,
        updatedAt: store.updatedAt,
        membersCount: store.members?.length || 0,
        productsCount: store.products?.length || 0,
        salesCount: store.sales?.length || 0,
        employeesCount: store.employees?.length || 0,
        logsCount: store.accessLogs?.length || 0,
        pendingVisitsCount: store.pendingVisitRequests?.length || 0,
        pendingRegistrationsCount: store.pendingRegistrationRequests?.length || 0,
        persistentStorage: diag.persistentStorage,
        storageBackend: diag.storageBackend,
        lastPersistError: diag.lastPersistError,
        cloud: true,
        serverTime: new Date().toISOString(),
      });
    }

    // 2. /api/sync/events (short-lived serverless SSE bridge; client polling & EventSource auto-reconnect handle 24/7 sync)
    if (pathname.endsWith('/events')) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write(': connected\n\n');
      const sinceParam = Number(parsedUrl.searchParams.get('since') || 0);
      if (sinceParam > 0) {
        const recent = await getRecentEvents(sinceParam);
        for (const evt of recent) {
          res.write(`data: ${JSON.stringify(evt)}\n\n`);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
      res.write(': ping\n\n');
      return res.end();
    }

    // 3. Visit Pass Endpoints (/visit-requests, /visit-request, /visit-authorize, /visit-reject)
    if (pathname.endsWith('/visit-requests') && req.method === 'GET') {
      const checkId = parsedUrl.searchParams.get('id');
      const result = await getVisitRequests(checkId);
      return res.status(200).json(result);
    }

    if (pathname.endsWith('/visit-request') && req.method === 'POST') {
      const visitRequest = await createVisitRequest(body || {});
      return res.status(200).json({ success: true, visitRequest });
    }

    if (pathname.endsWith('/visit-authorize') && req.method === 'POST') {
      const result = await authorizeVisitRequest(body || {});
      return res.status(200).json({ success: true, ...result });
    }

    if (pathname.endsWith('/visit-reject') && req.method === 'POST') {
      await rejectVisitRequest(body?.id);
      return res.status(200).json({ success: true, rejected: true, id: body?.id });
    }

    // 4. Registration Request Endpoints
    if (pathname.endsWith('/registration-requests') && req.method === 'GET') {
      const checkId = parsedUrl.searchParams.get('id');
      const result = await getRegistrationRequests(checkId);
      return res.status(200).json(result);
    }

    if (pathname.endsWith('/registration-request') && req.method === 'POST') {
      const registrationRequest = await createRegistrationRequest(body || {});
      return res.status(200).json({ success: true, registrationRequest });
    }

    if (pathname.endsWith('/registration-authorize') && req.method === 'POST') {
      const result = await authorizeRegistrationRequest(body || {});
      return res.status(200).json({ success: true, ...result });
    }

    if (pathname.endsWith('/registration-reject') && req.method === 'POST') {
      await rejectRegistrationRequest(body?.id);
      return res.status(200).json({ success: true, rejected: true, id: body?.id });
    }

    // 5. Access Logs (/access-log, /access-logs)
    if (pathname.includes('/access-log')) {
      if (req.method === 'POST') {
        if (body?.log) {
          const store = await addAccessLog(body.log);
          return res.status(200).json({
            success: true,
            version: store.version,
            logId: body.log.id,
          });
        }
        return res.status(400).json({ error: 'Falta objeto log' });
      }
      if (req.method === 'GET') {
        const logs = await getAccessLogs();
        return res.status(200).json({
          success: true,
          logs: logs || [],
        });
      }
    }

    // 6. Members (/members)
    if (pathname.endsWith('/members')) {
      if (req.method === 'GET') {
        const store = await getMembers();
        return res.status(200).json({
          success: true,
          version: store.version,
          updatedAt: store.updatedAt,
          members: store.members || [],
          hasChanges: true,
        });
      }

      if (req.method === 'POST') {
        if (body?.action === 'clear' || (Array.isArray(body?.members) && body?.replace)) {
          const store = await saveMembers(Array.isArray(body?.members) ? body.members : [], true);
          return res.status(200).json({
            success: true,
            version: store.version,
            membersCount: store.members?.length || 0,
            updatedAt: store.updatedAt,
          });
        }

        if (Array.isArray(body?.members)) {
          const store = await saveMembers(body.members, false);
          return res.status(200).json({
            success: true,
            version: store.version,
            membersCount: store.members?.length || 0,
            updatedAt: store.updatedAt,
          });
        }

        if (body?.action === 'add' || body?.action === 'update') {
          if (!body.member) return res.status(400).json({ error: 'Falta objeto member' });
          const store = await addOrUpdateMember(body.member, body.action);
          return res.status(200).json({
            success: true,
            version: store.version,
            member: body.member,
          });
        }

        if (body?.action === 'delete') {
          const id = body.memberId || body.id;
          if (!id) return res.status(400).json({ error: 'Falta memberId para eliminar' });
          const store = await deleteMember(id);
          return res.status(200).json({
            success: true,
            version: store.version,
            deletedId: id,
          });
        }
      }
    }

    // 7. Master Database & Atomic Entity Sync (/database, /entity)
    if (req.method === 'GET') {
      const store = await getFullDatabase();
      const sinceParam = req.query?.sinceVersion || parsedUrl.searchParams.get('sinceVersion') || '0';
      const since = parseInt(sinceParam, 10) || 0;

      if (since > 0 && store.version === since) {
        return res.status(200).json({
          success: true,
          version: store.version,
          updatedAt: store.updatedAt,
          hasChanges: false,
        });
      }

      return res.status(200).json({
        success: true,
        version: store.version,
        updatedAt: store.updatedAt,
        hasChanges: true,
        database: store,
      });
    }

    if (req.method === 'POST') {
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
            store = await addOrUpdateMember(item, changeType);
          }
          return res.status(200).json({
            success: true,
            version: store?.version,
            updatedAt: store?.updatedAt,
            entity,
            changeType,
          });
        }

        if (entity === 'accessLogs' || entity === 'accessLog') {
          if (changeType === 'replace' && Array.isArray(item)) {
            const store = await updateEntity('accessLogs', 'replace', item, itemId);
            return res.status(200).json({
              success: true,
              version: store.version,
              updatedAt: store.updatedAt,
              entity,
              changeType,
            });
          }
          const store = await addAccessLog(item);
          return res.status(200).json({
            success: true,
            version: store.version,
            updatedAt: store.updatedAt,
            entity,
            changeType,
          });
        }

        const updatedStore = await updateEntity(entity, changeType, item, itemId);
        return res.status(200).json({
          success: true,
          version: updatedStore.version,
          updatedAt: updatedStore.updatedAt,
          entity,
          changeType,
        });
      }

      if (body?.action === 'full_sync' || body?.database) {
        const incomingDb = body.database || body;
        const updatedStore = await saveFullDatabase(incomingDb);
        return res.status(200).json({
          success: true,
          version: updatedStore.version,
          updatedAt: updatedStore.updatedAt,
          database: updatedStore,
        });
      }

      return res.status(400).json({ error: 'Formato o acción no válida' });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en /api/sync master handler:', err);
    return res.status(500).json({ error: 'Error interno en servidor Vercel: ' + (err?.message || 'Error desconocido') });
  }
}
