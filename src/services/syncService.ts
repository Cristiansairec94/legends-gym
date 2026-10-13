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

/**
 * Returns the effective server URL for LAN sync
 */
export function getResolvedServerUrl(customUrl?: string): string {
  if (customUrl && customUrl.trim() && !customUrl.includes('.vercel.app')) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  try {
    const saved = localStorage.getItem('legends_terminal_standalone_config_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        parsed.serverUrl &&
        parsed.serverUrl.trim() &&
        !parsed.serverUrl.includes('.vercel.app')
      ) {
        return parsed.serverUrl.trim().replace(/\/+$/, '');
      }
    }
  } catch {}

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
  }

  return 'http://localhost:3001';
}

/**
 * Check if the sync server is reachable
 */
export async function checkServerHealth(serverUrl?: string): Promise<{
  online: boolean;
  version?: number;
  membersCount?: number;
  serverTime?: string;
  error?: string;
}> {
  const base = getResolvedServerUrl(serverUrl);
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
        version: data.version,
        membersCount: data.membersCount,
        serverTime: data.serverTime,
      };
    }
    return { online: false, error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { online: false, error: err.message || 'Offline' };
  }
}

/**
 * Fetch members from the sync server
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
  const base = getResolvedServerUrl(serverUrl);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

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
        members: Array.isArray(data.members) ? data.members : [],
        version: data.version || 0,
        hasChanges: Boolean(data.hasChanges),
      };
    }
    return { success: false, members: [], version: sinceVersion, hasChanges: false };
  } catch (err) {
    return { success: false, members: [], version: sinceVersion, hasChanges: false };
  }
}

/**
 * Push full members list to the server (e.g. initial backup or full export)
 */
export async function pushMembersToServer(
  members: Client[],
  serverUrl?: string
): Promise<{ success: boolean; version?: number }> {
  const base = getResolvedServerUrl(serverUrl);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${base}/api/sync/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      return { success: true, version: data.version };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

/**
 * Push a single member action (add, update, delete) to the server
 */
export async function pushMemberActionToServer(
  action: 'add' | 'update' | 'delete',
  data: { member?: Client; memberId?: string },
  serverUrl?: string
): Promise<{ success: boolean; version?: number }> {
  const base = getResolvedServerUrl(serverUrl);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${base}/api/sync/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      return { success: true, version: json.version };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

/**
 * Push an access log to the sync server
 */
export async function pushAccessLogToServer(
  log: AccessLog,
  serverUrl?: string
): Promise<boolean> {
  const base = getResolvedServerUrl(serverUrl);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${base}/api/sync/access-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch recent access logs from the server
 */
export async function fetchAccessLogsFromServer(serverUrl?: string): Promise<AccessLog[]> {
  const base = getResolvedServerUrl(serverUrl);
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
      return Array.isArray(data.logs) ? data.logs : [];
    }
    return [];
  } catch {
    return [];
  }
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

  const base = getResolvedServerUrl(serverUrl);
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

