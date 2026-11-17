import { 
  Client, 
  AccessLog, 
  Sale, 
  Expense, 
  Product, 
  CashRegisterSession, 
  Branch, 
  SystemNotification,
  Employee,
  RoleDefinition,
  GymSettings,
  SystemCatalogPlan,
  PaymentMethod
} from '../types';
import { serializeGymAvatar } from '../utils/genderAvatar';
import { TerminalEntryDesignConfig } from '../utils/terminalDesign';

export interface SyncMessage {
  type: 
    | 'MEMBER_ADDED' 
    | 'MEMBER_UPDATED' 
    | 'MEMBER_DELETED' 
    | 'MEMBERS_REPLACED' 
    | 'MEMBERS_CLEARED'
    | 'DATABASE_UPDATED'
    | 'ACCESS_LOG_ADDED'
    | 'SALE_ADDED'
    | 'EXPENSE_ADDED'
    | 'PRODUCT_UPDATED'
    | 'CASH_SESSION_UPDATED'
    | 'BRANCH_UPDATED'
    | 'NOTIFICATION_ADDED'
    | 'VISIT_PASS_REQUESTED'
    | 'VISIT_PASS_AUTHORIZED'
    | 'VISIT_PASS_REJECTED'
    | 'MEMBER_REGISTRATION_REQUESTED'
    | 'MEMBER_REGISTRATION_AUTHORIZED'
    | 'MEMBER_REGISTRATION_REJECTED'
    | 'TERMINAL_DESIGN_UPDATED';
  terminalDesign?: TerminalEntryDesignConfig;
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
  visitRequest?: {
    id: string;
    clientName: string;
    cost: number;
    timestamp: number;
    status?: 'pending' | 'authorized' | 'rejected';
  };
  registrationRequest?: {
    id: string;
    memberData: any;
    paymentMethod: PaymentMethod;
    timestamp: number;
    status?: 'pending' | 'authorized' | 'rejected';
  };
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

export const CLOUD_SERVER_URL = 'https://legends-gym-gold.vercel.app';
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

  // Default for standalone desktop app: Local Desktop Sync Server first
  return LOCAL_SERVER_URL;
}

/**
 * Returns all candidate sync server URLs (both Local Desktop Server and Cloud Vercel Server)
 * so that changes made in the web ERP (Vercel or localhost) and the desktop executable
 * are always synchronized across both environments.
 */
export function getSyncTargets(customUrl?: string): string[] {
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isFileOrElectron =
    typeof window !== 'undefined' &&
    (window.location.protocol === 'file:' || Boolean((window as any).electronAPI?.isElectron));
  const primary = getResolvedServerUrl(customUrl);
  const targets = new Set<string>();

  if (isHttps) {
    if (primary) targets.add(primary);
    targets.add(CLOUD_SERVER_URL);
  } else if (isFileOrElectron) {
    // Always prioritize local desktop sync server first so ERP <-> Terminal events arrive in <5ms
    targets.add(LOCAL_SERVER_URL);
    if (primary) targets.add(primary);
    targets.add(CLOUD_SERVER_URL);
  } else {
    if (primary) targets.add(primary);
    targets.add(LOCAL_SERVER_URL);
    targets.add(CLOUD_SERVER_URL);
  }

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
        const res = await fetch(`${base}/api/sync/database`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'entity_change',
            entity: 'members',
            changeType: action,
            item: compactData.member,
            itemId: compactData.memberId || compactData.member?.id
          }),
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

  const isHttps = window.location.protocol === 'https:';
  const resolvedCustom = serverUrl && serverUrl.trim() ? getResolvedServerUrl(serverUrl) : '';
  const bases = new Set<string>();
  if (!isHttps) {
    bases.add(LOCAL_SERVER_URL);
  }
  if (resolvedCustom) {
    bases.add(resolvedCustom);
  }
  if (bases.size === 0) {
    bases.add(CLOUD_SERVER_URL);
  }

  const seenEventTimestamps = new Map<string, number>();
  const cleanups: Array<() => void> = [];

  bases.forEach((base) => {
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
              const dedupeId =
                parsed.registrationRequest?.id ||
                parsed.visitRequest?.id ||
                parsed.visitRequestId ||
                parsed.registrationRequestId ||
                parsed.member?.id ||
                parsed.log?.id ||
                '';
              const isRequestLifecycleEvent =
                parsed.type.startsWith('VISIT_PASS_') ||
                parsed.type.startsWith('MEMBER_REGISTRATION_');
              const key = isRequestLifecycleEvent
                ? `${parsed.type}:${dedupeId}`
                : `${parsed.type}:${dedupeId}:${parsed.timestamp || ''}`;
              const now = Date.now();
              if (dedupeId) {
                const prevTs = seenEventTimestamps.get(key);
                if (prevTs && now - prevTs < 30000) return;
                seenEventTimestamps.set(key, now);
                if (seenEventTimestamps.size > 200) {
                  const firstKey = seenEventTimestamps.keys().next().value;
                  if (firstKey) seenEventTimestamps.delete(firstKey);
                }
              }
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
    cleanups.push(() => {
      isClosed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    });
  });

  return () => {
    cleanups.forEach((fn) => fn());
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

export interface SyncedDatabase {
  version: number;
  updatedAt: string;
  members?: Client[];
  products?: Product[];
  sales?: Sale[];
  expenses?: Expense[];
  cashSession?: CashRegisterSession | null;
  employees?: Employee[];
  roles?: RoleDefinition[];
  settings?: GymSettings | null;
  catalogPlans?: SystemCatalogPlan[];
  branches?: Branch[];
  accessLogs?: AccessLog[];
  pendingVisitRequests?: any[];
  pendingRegistrationRequests?: any[];
  terminalDesign?: TerminalEntryDesignConfig;
}

/**
 * Fetch full gym database from all available servers (Local + Cloud)
 */
export async function fetchFullDatabaseFromServer(
  serverUrl?: string,
  sinceVersion: number = 0
): Promise<{
  success: boolean;
  database?: SyncedDatabase;
  version: number;
  hasChanges: boolean;
}> {
  const targets = getSyncTargets(serverUrl);
  const responses = await Promise.all(
    targets.map(async (base) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${base}/api/sync/database?sinceVersion=${sinceVersion}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            return {
              success: true,
              version: Number(json.version || 0),
              database: json.database as SyncedDatabase,
              hasChanges: json.hasChanges !== undefined ? json.hasChanges : (Number(json.version || 0) > sinceVersion)
            };
          }
        }
      } catch {}
      return null;
    })
  );

  const valid = responses.filter((r): r is NonNullable<typeof r> => r !== null && r.success);
  if (valid.length === 0) {
    return { success: false, version: sinceVersion, hasChanges: false };
  }

  // Pick the response with the highest version
  valid.sort((a, b) => b.version - a.version);
  const best = valid[0];

  return {
    success: true,
    database: best.database,
    version: best.version,
    hasChanges: best.hasChanges !== undefined ? best.hasChanges : (best.version > sinceVersion),
  };
}

/**
 * Push full gym database to all sync servers (Local + Cloud)
 */
export async function pushFullDatabaseToServer(
  database: Partial<SyncedDatabase>,
  serverUrl?: string
): Promise<{ success: boolean; version?: number }> {
  const targets = getSyncTargets(serverUrl);
  const results = await Promise.all(
    targets.map(async (base) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${base}/api/sync/database`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'full_sync', database }),
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
 * Push an atomic entity change (products, sales, expenses, cashSession, employees, settings, catalogPlans)
 * to all sync servers so all devices update in real time
 */
export async function pushEntityChangeToServer(
  entity: 'products' | 'sales' | 'expenses' | 'cashSession' | 'employees' | 'settings' | 'catalogPlans' | 'members' | 'accessLogs' | 'terminalDesign',
  changeType: 'add' | 'update' | 'delete',
  item: any,
  itemId?: string,
  serverUrl?: string
): Promise<{ success: boolean; version?: number }> {
  const targets = getSyncTargets(serverUrl);
  const results = await Promise.all(
    targets.map(async (base) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`${base}/api/sync/database`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'entity_change', entity, changeType, item, itemId }),
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



async function postToSyncTargetsFirstSuccess<T = any>(
  endpoint: string,
  payload: Record<string, any>,
  serverUrl?: string,
  timeoutMs = 3500
): Promise<T | null> {
  const targets = getSyncTargets(serverUrl);
  if (targets.length === 0) return null;

  return new Promise<T | null>((resolve) => {
    let settled = false;
    let remaining = targets.length;

    targets.forEach(async (base) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(`${base}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const json = (await res.json()) as T;
          if (!settled) {
            settled = true;
            resolve(json);
          }
          return;
        }
      } catch {}
      remaining -= 1;
      if (remaining === 0 && !settled) {
        settled = true;
        resolve(null);
      }
    });
  });
}

/**
 * Visit Pass Turnstile Synchronization Methods
 */
export async function pushVisitRequestToServer(
  request: { id: string; clientName: string; cost: number; timestamp?: number },
  serverUrl?: string
): Promise<{ success: boolean; visitRequest?: any }> {
  broadcastLocalSync({
    type: 'VISIT_PASS_REQUESTED',
    visitRequest: { ...request, timestamp: request.timestamp || Date.now(), status: 'pending' }
  });

  const json = await postToSyncTargetsFirstSuccess<{ visitRequest?: any }>(
    '/api/sync/visit-request',
    request,
    serverUrl
  );
  return { success: true, visitRequest: json?.visitRequest || request };
}

export async function pushVisitAuthorizeToServer(
  authorization: { id: string; clientName?: string; cost?: number; paymentMethod?: string; authorizedBy?: string; sale?: any; cashSession?: any },
  serverUrl?: string
): Promise<{ success: boolean; authorized?: boolean }> {
  broadcastLocalSync({
    type: 'VISIT_PASS_AUTHORIZED',
    visitRequest: {
      id: authorization.id,
      clientName: authorization.clientName || 'Visitante del Día',
      cost: authorization.cost || 50,
      timestamp: Date.now(),
      status: 'authorized'
    },
    sale: authorization.sale,
    cashSession: authorization.cashSession
  });

  await postToSyncTargetsFirstSuccess('/api/sync/visit-authorize', authorization, serverUrl);
  return { success: true, authorized: true };
}

export async function pushVisitRejectToServer(
  requestId: string,
  serverUrl?: string
): Promise<{ success: boolean }> {
  broadcastLocalSync({
    type: 'VISIT_PASS_REJECTED',
    visitRequest: { id: requestId, clientName: '', cost: 50, timestamp: Date.now(), status: 'rejected' }
  });

  await postToSyncTargetsFirstSuccess('/api/sync/visit-reject', { id: requestId }, serverUrl, 3000);
  return { success: true };
}

export async function fetchPendingVisitRequestsFromServer(
  serverUrl?: string
): Promise<Array<{ id: string; clientName: string; cost: number; timestamp: number }>> {
  const targets = getSyncTargets(serverUrl);
  for (const base of targets) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${base}/api/sync/visit-requests`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.requests)) return json.requests;
      }
    } catch {}
  }
  return [];
}

/**
 * Checks the server-side status ('pending' | 'authorized' | 'rejected') of a specific visit request ID.
 */
export async function fetchVisitRequestStatusFromServer(
  requestId: string,
  serverUrl?: string
): Promise<{ status: 'pending' | 'authorized' | 'rejected' | 'unknown'; clientName?: string }> {
  if (!requestId) return { status: 'unknown' };
  const targets = getSyncTargets(serverUrl);
  for (const base of targets) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(
        `${base}/api/sync/visit-requests?id=${encodeURIComponent(requestId)}`,
        { signal: controller.signal }
      );
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        if (json.statusEntry && json.statusEntry.status) {
          return {
            status: json.statusEntry.status,
            clientName: json.statusEntry.clientName,
          };
        }
        if (Array.isArray(json.requests)) {
          const found = json.requests.find((r: any) => r && r.id === requestId);
          if (found) return { status: 'pending', clientName: found.clientName };
        }
      }
    } catch {}
  }
  return { status: 'unknown' };
}

/**
 * Push Member Registration Request from Terminal to all servers (Local + Cloud)
 */
export async function pushRegistrationRequestToServer(
  regRequest: { id: string; memberData: any; paymentMethod: PaymentMethod; timestamp?: number },
  serverUrl?: string
): Promise<{ success: boolean; registrationRequest?: any }> {
  broadcastLocalSync({
    type: 'MEMBER_REGISTRATION_REQUESTED',
    registrationRequest: {
      id: regRequest.id,
      memberData: regRequest.memberData,
      paymentMethod: regRequest.paymentMethod,
      timestamp: regRequest.timestamp || Date.now(),
      status: 'pending'
    }
  });

  const targets = getSyncTargets(serverUrl);
  const results = await Promise.all(
    targets.map(async (base) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${base}/api/sync/registration-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(regRequest),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const json = await res.json();
          return json.registrationRequest || regRequest;
        }
      } catch {}
      return null;
    })
  );
  return { success: true, registrationRequest: results.find(Boolean) || regRequest };
}

/**
 * Authorize Member Registration upon collecting payment in ERP (RP)
 */
export async function pushRegistrationAuthorizeToServer(
  authData: { id: string; member: any; members?: any[]; sale?: any; cashSession?: any; paymentMethod?: PaymentMethod; authorizedBy?: string },
  serverUrl?: string
): Promise<{ success: boolean; authorized?: boolean }> {
  broadcastLocalSync({
    type: 'MEMBER_REGISTRATION_AUTHORIZED',
    registrationRequest: {
      id: authData.id,
      memberData: authData.member,
      paymentMethod: authData.paymentMethod || 'cash',
      timestamp: Date.now(),
      status: 'authorized'
    },
    member: authData.member,
    members: authData.members,
    sale: authData.sale,
    cashSession: authData.cashSession
  });

  const targets = getSyncTargets(serverUrl);
  await Promise.allSettled(
    targets.map(async (base) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        await fetch(`${base}/api/sync/registration-authorize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authData),
          signal: controller.signal,
        });
        clearTimeout(timer);
      } catch {}
    })
  );
  return { success: true, authorized: true };
}

/**
 * Reject Member Registration from ERP
 */
export async function pushRegistrationRejectToServer(
  requestId: string,
  serverUrl?: string
): Promise<{ success: boolean }> {
  broadcastLocalSync({
    type: 'MEMBER_REGISTRATION_REJECTED',
    registrationRequest: {
      id: requestId,
      memberData: null,
      paymentMethod: 'cash',
      timestamp: Date.now(),
      status: 'rejected'
    }
  });

  const targets = getSyncTargets(serverUrl);
  await Promise.allSettled(
    targets.map(async (base) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        await fetch(`${base}/api/sync/registration-reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: requestId }),
          signal: controller.signal,
        });
        clearTimeout(timer);
      } catch {}
    })
  );
  return { success: true };
}

/**
 * Fetch pending registration requests from server
 */
export async function fetchPendingRegistrationRequestsFromServer(
  serverUrl?: string
): Promise<Array<{ id: string; memberData: any; paymentMethod: PaymentMethod; timestamp: number }>> {
  const targets = getSyncTargets(serverUrl);
  for (const base of targets) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${base}/api/sync/registration-requests`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.requests)) return json.requests;
      }
    } catch {}
  }
  return [];
}
