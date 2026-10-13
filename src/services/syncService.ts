import { 
  Client, 
  AccessLog, 
  Sale, 
  Expense, 
  Product, 
  CashRegisterSession, 
  Branch, 
  SystemNotification 
} from '../types';
import { serializeGymAvatar } from '../utils/genderAvatar';

export interface SyncMessage {
  type: 
    | 'MEMBER_ADDED' 
    | 'MEMBER_UPDATED' 
    | 'MEMBER_DELETED' 
    | 'MEMBERS_REPLACED' 
    | 'ACCESS_LOG_ADDED'
    | 'SALE_ADDED'
    | 'EXPENSE_ADDED'
    | 'PRODUCT_UPDATED'
    | 'CASH_SESSION_UPDATED'
    | 'BRANCH_UPDATED'
    | 'NOTIFICATION_ADDED';
  member?: Client;
  memberId?: string;
  members?: Client[];
  log?: AccessLog;
  sale?: Sale;
  expense?: Expense;
  expenseId?: string;
  product?: Product;
  cashSession?: CashRegisterSession;
  branch?: Branch;
  notification?: SystemNotification;
  version?: number;
  sourceId?: string;
  timestamp: number;
}

// Unique instance ID so the sender does not re-process its own BroadcastChannel broadcasts
export const CLIENT_INSTANCE_ID = `client_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

const BROADCAST_CHANNEL_NAME = 'legends_gym_sync_bus_v1';
let syncChannel: BroadcastChannel | null = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch (e) {
  console.warn('[SyncService] BroadcastChannel not supported in this environment');
}

/**
 * Broadcast an event locally across tabs/windows on this machine
 */
export function broadcastLocalSync(event: Omit<SyncMessage, 'timestamp' | 'sourceId'>): void {
  if (!syncChannel) return;
  try {
    const payload: SyncMessage = {
      ...event,
      sourceId: CLIENT_INSTANCE_ID,
      timestamp: Date.now(),
    };
    syncChannel.postMessage(payload);
  } catch (err) {
    console.warn('[SyncService] Broadcast error:', err);
  }
}

/**
 * Subscribe to local broadcast messages
 */
export function subscribeToLocalSync(callback: (msg: SyncMessage) => void): () => void {
  if (!syncChannel) return () => {};
  const handler = (event: MessageEvent<SyncMessage>) => {
    if (event.data && event.data.sourceId !== CLIENT_INSTANCE_ID) {
      callback(event.data);
    }
  };
  syncChannel.addEventListener('message', handler);
  return () => {
    syncChannel?.removeEventListener('message', handler);
  };
}

export const CLOUD_SERVER_URL = 'https://legends-gym.vercel.app';
export const LOCAL_SERVER_URL = 'http://localhost:3001';

/**
 * Returns the effective server URL for sync (Cloud or LAN)
 */
export function getResolvedServerUrl(customUrl?: string): string {
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  try {
    const saved = localStorage.getItem('legends_terminal_standalone_config_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.serverUrl && parsed.serverUrl.trim()) {
        return parsed.serverUrl.trim().replace(/\/+$/, '');
      }
    }
  } catch {}

  // If running in browser (web app)
  if (typeof window !== 'undefined' && window.location.hostname && window.location.protocol !== 'file:') {
    const host = window.location.hostname;
    const isLocalNetwork =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.');
    if (isLocalNetwork) {
      return `http://${host}:3001`;
    }
    // On Vercel or custom domain: use same origin
    return window.location.origin;
  }

  // Default for standalone desktop app: Cloud Vercel server
  return CLOUD_SERVER_URL;
}

/**
 * Returns all candidate sync server URLs (both Local Desktop Server and Cloud Vercel Server)
 * so that changes made in the web ERP (Vercel or localhost) and the desktop executable
 * are always synchronized across both environments.
 */
export function getSyncTargets(customUrl?: string): string[] {
  const primary = getResolvedServerUrl(customUrl);
  const targets = new Set<string>([primary, LOCAL_SERVER_URL, CLOUD_SERVER_URL]);
  return Array.from(targets).filter(Boolean);
}

/**
 * Check if any sync server is reachable (prioritizes local server, falls back to cloud)
 */
export async function checkServerHealth(serverUrl?: string): Promise<{
  online: boolean;
  version?: number;
  membersCount?: number;
  serverTime?: string;
  error?: string;
}> {
  const targets = getSyncTargets(serverUrl);
  const results = await Promise.all(
    targets.map(async (base) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${base}/api/sync/status`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          return {
            online: true,
            base,
            version: data.version,
            membersCount: data.membersCount,
            serverTime: data.serverTime,
          };
        }
      } catch {}
      return null;
    })
  );

  const valid = results.filter((r): r is NonNullable<typeof r> => r !== null);
  if (valid.length > 0) {
    // Prefer the target with the most members or local server
    const best = valid.sort((a, b) => (b.membersCount || 0) - (a.membersCount || 0))[0];
    return {
      online: true,
      version: best.version,
      membersCount: best.membersCount,
      serverTime: best.serverTime,
    };
  }
  return { online: false, error: 'Offline' };
}

/**
 * Fetch and merge members from all active sync servers (Local + Cloud)
 */
export async function fetchMembersFromServer(
  serverUrl?: string,
  sinceVersion: number = 0
): Promise<{
  success: boolean;
  members: Client[];
  version: number;
  hasChanges: boolean;
}> {
  const targets = getSyncTargets(serverUrl);
  const responses = await Promise.all(
    targets.map(async (base) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${base}/api/sync/members?sinceVersion=${sinceVersion}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          return {
            success: true,
            base,
            members: Array.isArray(data.members) ? (data.members as Client[]) : [],
            version: Number(data.version || 0),
            hasChanges: Boolean(data.hasChanges),
          };
        }
      } catch {}
      return null;
    })
  );

  const valid = responses.filter((r): r is NonNullable<typeof r> => r !== null && r.success);
  if (valid.length === 0) {
    return { success: false, members: [], version: sinceVersion, hasChanges: false };
  }

  // Merge members across all reachable servers (preserving newest/local additions)
  const mergedMap = new Map<string, Client>();
  // Process cloud first, then local server so local persistent DB state wins on conflict while keeping all unique IDs
  const ordered = [...valid].reverse();
  for (const resp of ordered) {
    for (const m of resp.members) {
      if (m && m.id) {
        mergedMap.set(m.id, { ...(mergedMap.get(m.id) || {}), ...m });
      }
    }
  }

  const maxVersion = Math.max(...valid.map((v) => v.version), sinceVersion);
  const anyChanges = valid.some((v) => v.hasChanges) || mergedMap.size > 0;

  return {
    success: true,
    members: Array.from(mergedMap.values()),
    version: maxVersion,
    hasChanges: anyChanges,
  };
}

/**
 * Push full members list to all sync servers (Local + Cloud)
 */
export async function pushMembersToServer(
  members: Client[],
  serverUrl?: string
): Promise<{ success: boolean; version?: number }> {
  const targets = getSyncTargets(serverUrl);
  const compactMembers = members.map((m) => ({
    ...m,
    avatarUrl: serializeGymAvatar(m.avatarUrl),
  }));
  const results = await Promise.all(
    targets.map(async (base) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        const res = await fetch(`${base}/api/sync/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ members: compactMembers }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          return { success: true, version: data.version };
        }
      } catch {}
      return { success: false };
    })
  );

  const succeeded = results.find((r) => r.success);
  return succeeded || { success: false };
}

/**
 * Push a single member action (add, update, delete) to all sync servers (Local + Cloud)
 */
export async function pushMemberActionToServer(
  action: 'add' | 'update' | 'delete',
  data: { member?: Client; memberId?: string },
  serverUrl?: string
): Promise<{ success: boolean; version?: number }> {
  const targets = getSyncTargets(serverUrl);
  const compactData = data.member
    ? { ...data, member: { ...data.member, avatarUrl: serializeGymAvatar(data.member.avatarUrl) } }
    : data;
  const results = await Promise.all(
    targets.map(async (base) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`${base}/api/sync/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...compactData }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const json = await res.json();
          return { success: true, version: json.version };
        }
      } catch {}
      return { success: false };
    })
  );

  const succeeded = results.find((r) => r.success);
  return succeeded || { success: false };
}

/**
 * Push an access log to all sync servers (Local + Cloud)
 */
export async function pushAccessLogToServer(
  log: AccessLog,
  serverUrl?: string
): Promise<boolean> {
  const targets = getSyncTargets(serverUrl);
  const compactLog = {
    ...log,
    avatarUrl: serializeGymAvatar(log.avatarUrl),
  };
  const results = await Promise.all(
    targets.map(async (base) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${base}/api/sync/access-log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ log: compactLog }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        return res.ok;
      } catch {
        return false;
      }
    })
  );
  return results.some(Boolean);
}

/**
 * Fetch recent access logs from all reachable servers
 */
export async function fetchAccessLogsFromServer(serverUrl?: string): Promise<AccessLog[]> {
  const targets = getSyncTargets(serverUrl);
  const responses = await Promise.all(
    targets.map(async (base) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${base}/api/sync/access-logs`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          return Array.isArray(data.logs) ? (data.logs as AccessLog[]) : [];
        }
      } catch {}
      return [];
    })
  );

  const logMap = new Map<string, AccessLog>();
  for (const logs of responses) {
    for (const l of logs) {
      if (l && l.id && !logMap.has(l.id)) {
        logMap.set(l.id, l);
      }
    }
  }
  return Array.from(logMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Connect to the server's Server-Sent Events (SSE) stream for real-time remote sync.
 * Receives instant push notifications for ACCESS_LOG_ADDED, MEMBERS_UPDATED, etc.
 */
export function subscribeToRemoteSync(
  callback: (msg: SyncMessage) => void,
  serverUrl?: string
): () => void {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return () => {};
  }

  // Use local server for persistent SSE stream when on desktop/local, or custom URL if specified
  const base = serverUrl && serverUrl.trim() ? getResolvedServerUrl(serverUrl) : LOCAL_SERVER_URL;
  let eventSource: EventSource | null = null;
  let isClosed = false;
  let reconnectTimer: any = null;

  const connect = () => {
    if (isClosed) return;
    try {
      eventSource = new EventSource(`${base}/api/sync/events`);

      eventSource.onmessage = (event) => {
        try {
          if (!event.data || event.data.trim() === ': ping' || event.data.trim() === ': connected') return;
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.type) {
            callback(parsed);
          }
        } catch {
          // ignore parsing error
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!isClosed && !reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, 3000);
        }
      };
    } catch {
      if (!isClosed && !reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, 5000);
      }
    }
  };

  connect();

  return () => {
    isClosed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}

/**
 * Helper to check if a date string falls on the current calendar day
 */
export function isTodayDate(dateStr: string): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  } catch {
    return false;
  }
}

