import { getMembers, saveMembers, addOrUpdateMember, deleteMember } from './_store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const data = await getMembers();
      return res.status(200).json({
        version: data.version,
        updatedAt: data.updatedAt,
        members: data.members,
        hasChanges: true
      });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch {}
      }

      if (Array.isArray(body?.members)) {
        const data = await saveMembers(body.members);
        return res.status(200).json({
          success: true,
          version: data.version,
          membersCount: data.members.length,
          updatedAt: data.updatedAt
        });
      }

      if (body?.action === 'add' || body?.action === 'update') {
        if (!body.member) {
          return res.status(400).json({ error: 'Falta objeto member' });
        }
        const data = await addOrUpdateMember(body.member);
        return res.status(200).json({
          success: true,
          version: data.version,
          member: body.member
        });
      }

      if (body?.action === 'delete') {
        const idToDelete = body.memberId || body.id;
        if (!idToDelete) {
          return res.status(400).json({ error: 'Falta memberId para eliminar' });
        }
        const data = await deleteMember(idToDelete);
        return res.status(200).json({
          success: true,
          version: data.version,
          deletedId: idToDelete
        });
      }

      return res.status(400).json({ error: 'Acción o formato no válido' });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en /api/sync/members:', err);
    return res.status(500).json({ error: 'Error interno en servidor Vercel' });
  }
}
