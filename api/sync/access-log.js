import { addAccessLog } from './_store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }

    if (body?.log) {
      await addAccessLog(body.log);
      return res.status(200).json({ success: true, logId: body.log.id });
    }
    return res.status(400).json({ error: 'Falta objeto log' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
