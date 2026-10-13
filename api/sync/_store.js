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
    }
  ],
  accessLogs: []
};

// Check if Upstash / Vercel KV is available
async function kvFetch(command, ...args) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/${command}/${args.map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();
    return json.result;
  } catch {
    return null;
  }
}

export async function getMembers() {
  const kvData = await kvFetch('GET', 'legends_gym_store');
  if (kvData) {
    try {
      store = typeof kvData === 'string' ? JSON.parse(kvData) : kvData;
    } catch {}
  }
  return store;
}

export async function saveMembers(members) {
  store.members = members;
  store.version += 1;
  store.updatedAt = new Date().toISOString();
  await kvFetch('SET', 'legends_gym_store', JSON.stringify(store));
  return store;
}

export async function addOrUpdateMember(member) {
  const filtered = store.members.filter(m => m.id !== member.id);
  store.members = [member, ...filtered];
  store.version += 1;
  store.updatedAt = new Date().toISOString();
  await kvFetch('SET', 'legends_gym_store', JSON.stringify(store));
  return store;
}

export async function deleteMember(memberId) {
  store.members = store.members.filter(m => m.id !== memberId);
  store.version += 1;
  store.updatedAt = new Date().toISOString();
  await kvFetch('SET', 'legends_gym_store', JSON.stringify(store));
  return store;
}

export async function addAccessLog(log) {
  store.accessLogs = [log, ...store.accessLogs].slice(0, 500);
  await kvFetch('SET', 'legends_gym_store', JSON.stringify(store));
  return store;
}

export async function getAccessLogs() {
  return store.accessLogs;
}
