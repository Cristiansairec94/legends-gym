import { getFullDatabase, saveFullDatabase, updateEntity } from './_store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const store = await getFullDatabase();
      return res.status(200).json({
        success: true,
        version: store.version,
        updatedAt: store.updatedAt,
        database: store
      });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch {}
      }

      if (body?.action === 'entity_change') {
        const { entity, changeType, item, itemId } = body;
        if (!entity) {
          return res.status(400).json({ error: 'Falta campo entity' });
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
    console.error('Error en /api/sync/database:', err);
    return res.status(500).json({ error: 'Error interno en servidor Vercel' });
  }
}
