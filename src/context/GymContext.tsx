import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { 
  Client, 
  Product, 
  Sale, 
  AccessLog, 
  CashRegisterSession, 
  UserRole, 
  CartItem, 
  PaymentMethod,
  MembershipPlanType,
  Employee,
  RoleDefinition,
  GymSettings,
  SystemCatalogPlan,
  RolePermissions,
  Branch,
  Expense,
  SystemNotification,
  SyncState,
  SecurityAuditEvent
} from '../types';
import { storage } from '../services/storage';
import { sounds } from '../services/audio';
import { getGymAvatar } from '../utils/genderAvatar';
import { verifySecret, checkEmployeeShiftAllowed } from '../utils/securityCrypto';
import { 
  broadcastLocalSync, 
  subscribeToLocalSync, 
  subscribeToRemoteSync,
  pushMemberActionToServer, 
  pushMembersToServer,
  pushAccessLogToServer,
  fetchMembersFromServer,
  fetchAccessLogsFromServer,
  checkServerHealth,
  isTodayDate
} from '../services/syncService';

interface GymContextType {
  // Auth & Session
  currentUser: Employee | null;
  isAuthenticated: boolean;
  securityAlert: string | null;
  clearSecurityAlert: () => void;
  securityAuditLogs: SecurityAuditEvent[];
  login: (
    identifier: string,
    passOrPin: string,
    supervisorOverridePin?: string
  ) => {
    success: boolean;
    message?: string;
    user?: Employee;
    lockedOut?: boolean;
    lockoutUntil?: number;
    requiresSupervisorOverride?: boolean;
  };
  loginQuick: (employeeId: string) => boolean;
  logout: (reason?: string | unknown) => void;
  verifySupervisorPin: (pinOrPass: string, actionLabel?: string) => boolean;
  requestSupervisorAuth: (actionLabel: string, onAuthorized: () => void) => void;
  pendingSupervisorAction: { actionLabel: string; onAuthorized: () => void } | null;
  cancelSupervisorAuth: () => void;

  // Roles
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  roles: RoleDefinition[];
  updateRolePermissions: (roleId: UserRole, permissions: Partial<RolePermissions>) => void;

  // Multi-Sucursal (Branches)
  branches: Branch[];
  activeBranchId: string;
  activeBranch: Branch;
  setActiveBranchId: (id: string) => void;
  updateBranch: (id: string, updates: Partial<Branch>) => void;

  // Members
  members: Client[];
  addMember: (clientData: Partial<Client>, initialPaymentMethod?: PaymentMethod) => Client;
  updateMember: (id: string, updates: Partial<Client>) => void;
  deleteMember: (id: string) => void;
  renewMembership: (id: string, planType: MembershipPlanType, months: number, price: number, paymentMethod: PaymentMethod) => void;
  enrollFingerprint: (id: string, templateCode: string) => boolean;
  getMemberById: (id: string) => Client | undefined;
  replaceMembers: (newMembers: Client[]) => void;
  syncMembersWithServer: (customServerUrl?: string) => Promise<boolean>;

  // Products & Inventory
  products: Product[];
  addProduct: (productData: Omit<Product, 'id'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (id: string, amount: number) => void;

  // Cart & POS
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartSubtotal: number;
  cartTax: number;
  cartItemsCount: number;
  processSale: (paymentMethod: PaymentMethod, amountPaid: number, clientId?: string, notes?: string) => Sale;

  // Sales History
  sales: Sale[];
  todaySalesTotal: number;
  todaySalesCount: number;
  todayStoreSalesTotal: number;
  todayMembershipsSalesTotal: number;

  // Gastos (Expenses)
  expenses: Expense[];
  addExpense: (expenseData: Omit<Expense, 'id' | 'folio'>) => Expense;
  deleteExpense: (id: string) => void;
  todayExpensesTotal: number;
  monthExpensesTotal: number;

  // Notificaciones
  notifications: SystemNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  addNotification: (notification: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => void;
  deleteNotification: (id: string) => void;

  // Sincronización & Backup
  syncState: SyncState;
  toggleOnlineMode: () => void;
  forceSync: () => Promise<void>;
  storageUsageKb: number;
  exportDatabase: () => string;
  importDatabase: (json: string) => boolean;
  resetDatabase: () => void;

  // Biometric & Access Control
  accessLogs: AccessLog[];
  verifyBiometricAccess: (biometricQuery: string) => { granted: boolean; client?: Client; reason: string; log: AccessLog };
  registerExit: (clientId?: string) => void;
  clearAccessLogs: () => void;

  // Cash Session
  cashSession: CashRegisterSession;
  updateCashSession: (session: CashRegisterSession) => void;
  closeCashSession: (countedCash: number, notes?: string, leaveCashInDrawer?: boolean, remanentCash?: number, withdrawnCash?: number) => void;
  openCashSession: (initialCash: number) => void;

  // Empleados (Staff)
  employees: Employee[];
  addEmployee: (employeeData: Omit<Employee, 'id'>) => Employee;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  // Configuración & Catálogos
  gymSettings: GymSettings;
  updateGymSettings: (updates: Partial<GymSettings>) => void;
  catalogPlans: SystemCatalogPlan[];
  addCatalogPlan: (plan: Omit<SystemCatalogPlan, 'id'>) => SystemCatalogPlan;
  updateCatalogPlan: (id: string, updates: Partial<SystemCatalogPlan>) => void;
  deleteCatalogPlan: (id: string) => void;

  // Quick stats
  activeMembersCount: number;
  todayCheckInsCount: number;
  lowStockProductsCount: number;
  isTerminalConnected: boolean;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export const GymProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => storage.getActiveRole());
  const [members, setMembers] = useState<Client[]>(() => storage.getMembers());
  const membersRef = useRef<Client[]>(members);
  membersRef.current = members;
  const [products, setProducts] = useState<Product[]>(() => storage.getProducts());
  const [sales, setSales] = useState<Sale[]>(() => storage.getSales());
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>(() => storage.getAccessLogs());
  const [cashSession, setCashSession] = useState<CashRegisterSession>(() => storage.getCashSession());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(() => storage.getEmployees());
  const [roles, setRoles] = useState<RoleDefinition[]>(() => storage.getRoles());
  const [gymSettings, setGymSettings] = useState<GymSettings>(() => storage.getSettings());
  const [catalogPlans, setCatalogPlans] = useState<SystemCatalogPlan[]>(() => storage.getCatalogPlans());
  
  // New State: Multi-Sucursal, Gastos, Notificaciones, Sync
  const [branches, setBranches] = useState<Branch[]>(() => storage.getBranches());
  const [activeBranchId, setActiveBranchIdState] = useState<string>(() => storage.getActiveBranchId());
  const [expenses, setExpenses] = useState<Expense[]>(() => storage.getExpenses());
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => storage.getNotifications());
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: true,
    lastSyncedAt: storage.getLastSyncDate(),
    pendingSyncCount: 0,
    isSyncing: false,
    storageUsageKb: storage.getStorageUsageKb(),
  });

  const [currentUser, setCurrentUserState] = useState<Employee | null>(() => storage.getCurrentUser());
  const currentUserRef = useRef<Employee | null>(currentUser);
  currentUserRef.current = currentUser;
  const runtimeTabIdRef = useRef<string>(`TAB_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  const [securityAlert, setSecurityAlertState] = useState<string | null>(() => storage.getSecurityAlert());
  const [securityAuditLogs, setSecurityAuditLogs] = useState<SecurityAuditEvent[]>(() => storage.getSecurityAuditLogs());
  const isAuthenticated = currentUser !== null;
  const [isTerminalConnected, setIsTerminalConnected] = useState<boolean>(false);

  const clearSecurityAlert = useCallback(() => {
    setSecurityAlertState(null);
    storage.setSecurityAlert(null);
  }, []);

  // Sync to storage
  useEffect(() => {
    membersRef.current = members;
    storage.saveMembers(members);
  }, [members]);
  useEffect(() => { storage.saveProducts(products); }, [products]);
  useEffect(() => { storage.saveSales(sales); }, [sales]);
  useEffect(() => { storage.saveAccessLogs(accessLogs); }, [accessLogs]);
  useEffect(() => { storage.saveCashSession(cashSession); }, [cashSession]);
  useEffect(() => { storage.saveEmployees(employees); }, [employees]);
  useEffect(() => { storage.saveRoles(roles); }, [roles]);
  useEffect(() => { storage.saveSettings(gymSettings); }, [gymSettings]);
  useEffect(() => { storage.saveCatalogPlans(catalogPlans); }, [catalogPlans]);
  useEffect(() => { storage.saveBranches(branches); }, [branches]);
  useEffect(() => { storage.saveExpenses(expenses); }, [expenses]);
  useEffect(() => { storage.saveNotifications(notifications); }, [notifications]);

  // Helper to safely merge member lists without losing local or remote additions
  const mergeMemberLists = useCallback((currentList: Client[], incomingList: Client[]): Client[] => {
    const deletedIds = storage.getDeletedMemberIds();
    const map = new Map<string, Client>();
    for (const m of currentList) {
      if (m && m.id && !deletedIds.includes(m.id)) {
        map.set(m.id, m);
      }
    }
    for (const m of incomingList) {
      if (m && m.id && !deletedIds.includes(m.id)) {
        const existing = map.get(m.id);
        map.set(m.id, {
          ...(existing || {}),
          ...m,
          biometricRegistered: m.biometricRegistered !== undefined ? m.biometricRegistered : (existing?.biometricRegistered ?? true),
          biometricHash: m.biometricHash || existing?.biometricHash || `BIO_HASH_${m.id}`,
          biometricTemplate: m.biometricTemplate || existing?.biometricTemplate || `FP_THUMB_RIGHT_${m.id}`,
          avatarUrl: getGymAvatar(m.fullName, m.avatarUrl || existing?.avatarUrl)
        });
      }
    }
    return Array.from(map.values());
  }, []);

  // Helper to process any incoming access log from Desktop Terminal or Remote Server
  const ingestIncomingAccessLog = useCallback((incomingLog: AccessLog) => {
    if (!incomingLog || !incomingLog.id) return;

    setAccessLogs(prev => {
      if (prev.some(l => l.id === incomingLog.id)) {
        return prev;
      }

      // If access was granted, also update member check-in count and branch occupancy
      if (incomingLog.status === 'granted') {
        if (incomingLog.clientId) {
          setMembers(prevMembers => {
            const next = prevMembers.map(m => {
              if (m.id === incomingLog.clientId) {
                return {
                  ...m,
                  checkInsCount: (m.checkInsCount || 0) + 1,
                  lastCheckIn: incomingLog.timestamp || new Date().toISOString()
                };
              }
              return m;
            });
            membersRef.current = next;
            return next;
          });
        }

        setBranches(prevBranches => prevBranches.map(b => {
          if (b.id === activeBranchId) {
            return {
              ...b,
              currentOccupancy: Math.min(b.maxCapacity, b.currentOccupancy + 1)
            };
          }
          return b;
        }));
      }

      // Re-broadcast locally so all open browser tabs/windows update in unison
      broadcastLocalSync({ type: 'ACCESS_LOG_ADDED', log: incomingLog });

      return [incomingLog, ...prev];
    });
  }, [activeBranchId]);

  // Real-time synchronization bus listener across tabs/windows/instances & remote terminal
  useEffect(() => {
    // 1. Local BroadcastChannel listener (inter-tab communication)
    const unsubscribeLocal = subscribeToLocalSync((msg) => {
      if (msg.type === 'MEMBER_ADDED' && msg.member) {
        setMembers(prev => {
          const next = [msg.member!, ...prev.filter(m => m.id !== msg.member!.id)];
          membersRef.current = next;
          return next;
        });
      } else if (msg.type === 'MEMBER_UPDATED' && msg.member) {
        setMembers(prev => {
          const exists = prev.some(m => m.id === msg.member!.id);
          const next = exists
            ? prev.map(m => m.id === msg.member!.id ? { ...m, ...msg.member } : m)
            : [msg.member!, ...prev];
          membersRef.current = next;
          return next;
        });
      } else if (msg.type === 'MEMBER_DELETED' && msg.memberId) {
        storage.addDeletedMemberId(msg.memberId);
        setMembers(prev => {
          const next = prev.filter(m => m.id !== msg.memberId);
          membersRef.current = next;
          return next;
        });
      } else if (msg.type === 'MEMBERS_REPLACED' && Array.isArray(msg.members)) {
        setMembers(prev => {
          const next = mergeMemberLists(prev, msg.members!);
          membersRef.current = next;
          return next;
        });
      } else if (msg.type === 'ACCESS_LOG_ADDED' && msg.log) {
        setAccessLogs(prev => {
          if (prev.some(l => l.id === msg.log!.id)) return prev;
          return [msg.log!, ...prev];
        });
      } else if (msg.type === 'SALE_ADDED' && msg.sale) {
        setSales(prev => {
          if (prev.some(s => s.id === msg.sale!.id)) return prev;
          return [msg.sale!, ...prev];
        });
      } else if (msg.type === 'EXPENSE_ADDED' && msg.expense) {
        setExpenses(prev => {
          if (prev.some(e => e.id === msg.expense!.id)) return prev;
          return [msg.expense!, ...prev];
        });
      } else if (msg.type === 'PRODUCT_UPDATED' && msg.product) {
        setProducts(prev => prev.map(p => p.id === msg.product!.id ? msg.product! : p));
      } else if (msg.type === 'CASH_SESSION_UPDATED' && msg.cashSession) {
        setCashSession(msg.cashSession);
      } else if (msg.type === 'BRANCH_UPDATED' && msg.branch) {
        setBranches(prev => prev.map(b => b.id === msg.branch!.id ? msg.branch! : b));
      } else if (msg.type === 'NOTIFICATION_ADDED' && msg.notification) {
        setNotifications(prev => {
          if (prev.some(n => n.id === msg.notification!.id)) return prev;
          return [msg.notification!, ...prev];
        });
      }
    });

    // 2. Remote Server-Sent Events (SSE) listener for instantaneous push from Desktop Terminal
    const unsubscribeRemote = subscribeToRemoteSync((msg) => {
      setIsTerminalConnected(true);
      if (msg.type === 'ACCESS_LOG_ADDED' && msg.log) {
        ingestIncomingAccessLog(msg.log);
      } else if (msg.type === 'MEMBER_ADDED' && msg.member) {
        setMembers(prev => {
          const next = [msg.member!, ...prev.filter(m => m.id !== msg.member!.id)];
          membersRef.current = next;
          return next;
        });
      } else if (msg.type === 'MEMBER_UPDATED' && msg.member) {
        setMembers(prev => {
          const exists = prev.some(m => m.id === msg.member!.id);
          const next = exists
            ? prev.map(m => m.id === msg.member!.id ? { ...m, ...msg.member } : m)
            : [msg.member!, ...prev];
          membersRef.current = next;
          return next;
        });
      } else if (msg.type === 'MEMBER_DELETED' && msg.memberId) {
        storage.addDeletedMemberId(msg.memberId);
        setMembers(prev => {
          const next = prev.filter(m => m.id !== msg.memberId);
          membersRef.current = next;
          return next;
        });
      } else if (msg.type === 'MEMBERS_REPLACED' && Array.isArray(msg.members)) {
        setMembers(prev => {
          const next = mergeMemberLists(prev, msg.members!);
          membersRef.current = next;
          return next;
        });
      }
    });

    // 3. Initial server connection & healthcheck + bidirectional member merge + load historical access logs
    const syncServerData = async () => {
      try {
        const status = await checkServerHealth();
        setIsTerminalConnected(status.online);
        if (status.online) {
          const data = await fetchMembersFromServer();
          if (data.success && data.members.length > 0) {
            const merged = mergeMemberLists(membersRef.current, data.members);
            membersRef.current = merged;
            setMembers(merged);
            // Push merged list back so both local server and cloud server have all members
            pushMembersToServer(merged).catch(() => {});
          } else if (membersRef.current.length > 0) {
            pushMembersToServer(membersRef.current).catch(() => {});
          }

          // Fetch previous access logs from server so historical check-ins are not lost
          const serverLogs = await fetchAccessLogsFromServer();
          if (serverLogs && serverLogs.length > 0) {
            serverLogs.forEach(l => ingestIncomingAccessLog(l));
          }
        }
      } catch {
        setIsTerminalConnected(false);
      }
    };

    syncServerData();

    // 4. Background safety polling (every 2.5 seconds) for both members and check-ins
    const pollInterval = setInterval(() => {
      fetchMembersFromServer().then(data => {
        if (data.success && data.members.length > 0) {
          setIsTerminalConnected(true);
          setMembers(prev => {
            const next = mergeMemberLists(prev, data.members);
            membersRef.current = next;
            return next;
          });
        }
      }).catch(() => {});

      fetchAccessLogsFromServer().then(logs => {
        setIsTerminalConnected(true);
        if (logs && logs.length > 0) {
          logs.forEach(l => ingestIncomingAccessLog(l));
        }
      }).catch(() => {
        // Silent error
      });
    }, 2500);

    return () => {
      unsubscribeLocal();
      unsubscribeRemote();
      clearInterval(pollInterval);
    };
  }, [ingestIncomingAccessLog, mergeMemberLists]);

  // Security Guard: Single-Tab Session Binding & Anti-Copy/Paste URL Hijacking
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const isTerm =
      searchParams.get('mode') === 'terminal' ||
      searchParams.get('terminal') === 'true' ||
      window.location.hash.includes('terminal') ||
      localStorage.getItem('legends_device_mode') === 'terminal';

    if (isTerm) return;

    // Strip any unauthorized URL query/hash parameters on the main ERP
    if (window.location.search || window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const channel =
      typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel('legends_security_guard_v1')
        : null;

    // If this tab just detected a copy/paste URL breach during initialization, notify the original tab immediately
    const initialAlert = storage.getSecurityAlert();
    if (initialAlert && !currentUserRef.current) {
      channel?.postMessage({
        type: 'FORCE_SECURITY_LOGOUT',
        tabId: runtimeTabIdRef.current,
        reason: initialAlert
      });
    }

    // Announce that a tab was opened/mounted
    channel?.postMessage({
      type: 'TAB_MOUNTED',
      tabId: runtimeTabIdRef.current
    });

    if (channel) {
      channel.onmessage = (event) => {
        const data = event.data;
        if (!data || data.tabId === runtimeTabIdRef.current) return;

        if (data.type === 'TAB_MOUNTED' && currentUserRef.current) {
          // Another tab was opened while this tab has an active session!
          const breachMsg =
            '⚠️ Sesión cerrada por seguridad: Se detectó que el enlace del sistema fue copiado o abierto en otra pestaña. Por protección de la terminal, la sesión ha sido cerrada.';
          const activeUser = currentUserRef.current;
          storage.saveCurrentUser(null);
          storage.setSecurityAlert(breachMsg);
          storage.addSecurityAuditLog({
            type: 'MULTI_TAB_BREACH',
            userName: activeUser.fullName,
            role: activeUser.role,
            details: 'Cierre forzoso: Se abrió una pestaña secundaria mientras la sesión estaba activa.'
          });
          currentUserRef.current = null;
          setCurrentUserState(null);
          setSecurityAlertState(breachMsg);
          setSecurityAuditLogs(storage.getSecurityAuditLogs());
          sounds.playAccessDenied();

          channel.postMessage({
            type: 'FORCE_SECURITY_LOGOUT',
            tabId: runtimeTabIdRef.current,
            reason: breachMsg
          });
        } else if (data.type === 'FORCE_SECURITY_LOGOUT') {
          const reason =
            data.reason ||
            '⚠️ Sesión cerrada por seguridad: Se detectó actividad o apertura del enlace en otra pestaña.';
          storage.saveCurrentUser(null);
          currentUserRef.current = null;
          setCurrentUserState(null);
          setSecurityAlertState(reason);
          setSecurityAuditLogs(storage.getSecurityAuditLogs());
          sounds.playAccessDenied();
        }
      };
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'legends_active_session_lock_v1' && !e.newValue && currentUserRef.current) {
        const alertMsg =
          storage.getSecurityAlert() ||
          '⚠️ Sesión finalizada: La sesión fue cerrada por seguridad desde otra pestaña.';
        sessionStorage.removeItem('legends_tab_session_user_v1');
        sessionStorage.removeItem('legends_tab_session_token_v1');
        window.name = '';
        currentUserRef.current = null;
        setCurrentUserState(null);
        setSecurityAlertState(alertMsg);
        setSecurityAuditLogs(storage.getSecurityAuditLogs());
        sounds.playAccessDenied();
      } else if (e.key === 'legends_security_alert_v1' && e.newValue) {
        setSecurityAlertState(e.newValue);
        setSecurityAuditLogs(storage.getSecurityAuditLogs());
        if (currentUserRef.current) {
          sessionStorage.removeItem('legends_tab_session_user_v1');
          sessionStorage.removeItem('legends_tab_session_token_v1');
          window.name = '';
          currentUserRef.current = null;
          setCurrentUserState(null);
          sounds.playAccessDenied();
        }
      }
    };

    const handleBeforeUnload = () => {
      channel?.close();
    };

    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      channel?.close();
    };
  }, []);

  const [pendingSupervisorAction, setPendingSupervisorAction] = useState<{
    actionLabel: string;
    onAuthorized: () => void;
  } | null>(null);

  // Security Guard: Continuous Session Signature & DevTools (F12) Tamper Verification
  useEffect(() => {
    if (!currentUser) return;

    const integrityInterval = setInterval(() => {
      const validated = storage.validateOrKillTabSession();
      if (!validated && currentUserRef.current) {
        const alertMsg =
          storage.getSecurityAlert() ||
          '🚨 Alerta de Seguridad: Se detectó manipulación de sesión o pérdida de firma criptográfica.';
        currentUserRef.current = null;
        setCurrentUserState(null);
        setSecurityAlertState(alertMsg);
        setSecurityAuditLogs(storage.getSecurityAuditLogs());
        sounds.playAccessDenied();
      }
    }, 2500);

    return () => clearInterval(integrityInterval);
  }, [currentUser]);

  const verifySupervisorPin = useCallback(
    (pinOrPass: string, actionLabel?: string): boolean => {
      const clean = pinOrPass.trim();
      if (!clean) return false;

      const admins = employees.filter((e) => e.role === 'admin' && e.status === 'active');
      const matchedAdmin = admins.find(
        (adm) => verifySecret(clean, adm.password) || verifySecret(clean, adm.pin)
      );

      if (matchedAdmin) {
        storage.addSecurityAuditLog({
          type: 'SUPERVISOR_AUTH',
          userName: matchedAdmin.fullName,
          role: 'admin',
          details: `Autorización de Supervisor aprobada${actionLabel ? `: ${actionLabel}` : '.'}`
        });
        setSecurityAuditLogs(storage.getSecurityAuditLogs());
        sounds.playCheckoutSuccess();
        return true;
      }

      sounds.playAccessDenied();
      return false;
    },
    [employees]
  );

  const requestSupervisorAuth = useCallback((actionLabel: string, onAuthorized: () => void) => {
    // If current user is already a verified admin, still require PIN confirmation for critical destructive actions
    setPendingSupervisorAction({ actionLabel, onAuthorized });
  }, []);

  const cancelSupervisorAuth = useCallback(() => {
    setPendingSupervisorAction(null);
  }, []);

  // Auth methods
  const login = (
    identifier: string,
    passOrPin: string,
    supervisorOverridePin?: string
  ): {
    success: boolean;
    message?: string;
    user?: Employee;
    lockedOut?: boolean;
    lockoutUntil?: number;
    requiresSupervisorOverride?: boolean;
  } => {
    const lockout = storage.getLoginLockout();
    if (lockout.lockoutUntil && Date.now() < lockout.lockoutUntil) {
      const remSec = Math.ceil((lockout.lockoutUntil - Date.now()) / 1000);
      sounds.playAccessDenied();
      return {
        success: false,
        lockedOut: true,
        lockoutUntil: lockout.lockoutUntil,
        message: `Terminal bloqueada temporalmente por seguridad. Intenta nuevamente en ${remSec} segundos.`
      };
    }

    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = passOrPin.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, message: 'Ingresa tu usuario / correo / cédula y tu contraseña o PIN.' };
    }

    const found = employees.find((emp) => {
      const matchEmail = emp.email.toLowerCase() === cleanId;
      const matchDoc = emp.documentId.toLowerCase() === cleanId;
      const matchUsername = emp.username?.toLowerCase() === cleanId;
      return (matchEmail || matchDoc || matchUsername) && emp.status === 'active';
    });

    if (!found) {
      const fail = storage.recordFailedLoginAttempt(cleanId);
      setSecurityAuditLogs(storage.getSecurityAuditLogs());
      sounds.playAccessDenied();
      if (fail.justLocked) {
        return {
          success: false,
          lockedOut: true,
          lockoutUntil: fail.lockoutUntil,
          message: 'Demasiados intentos fallidos (3/3). El acceso ha sido bloqueado por 30 segundos.'
        };
      }
      return {
        success: false,
        message: `Credenciales inválidas o cuenta inactiva. Intento ${fail.attempts} de 3.`
      };
    }

    const isValid =
      verifySecret(cleanPass, found.password) ||
      verifySecret(cleanPass, found.pin);

    if (!isValid) {
      const fail = storage.recordFailedLoginAttempt(found.email);
      setSecurityAuditLogs(storage.getSecurityAuditLogs());
      sounds.playAccessDenied();
      if (fail.justLocked) {
        return {
          success: false,
          lockedOut: true,
          lockoutUntil: fail.lockoutUntil,
          message: 'Demasiados intentos fallidos (3/3). El acceso ha sido bloqueado por 30 segundos.'
        };
      }
      return {
        success: false,
        message: `Contraseña o PIN incorrecto. Intento ${fail.attempts} de 3 antes del bloqueo.`
      };
    }

    // Shift-Based Access Control (Restricción por Horario de Turno)
    const shiftCheck = checkEmployeeShiftAllowed(found);
    if (!shiftCheck.allowed) {
      if (!supervisorOverridePin || !supervisorOverridePin.trim()) {
        storage.addSecurityAuditLog({
          type: 'SHIFT_BLOCKED',
          userName: found.fullName,
          userIdentifier: found.email,
          role: found.role,
          details: `Intento de acceso fuera de turno (${found.shift}). Esperando PIN de Supervisor.`
        });
        setSecurityAuditLogs(storage.getSecurityAuditLogs());
        sounds.playAccessDenied();
        return {
          success: false,
          requiresSupervisorOverride: true,
          message: shiftCheck.message
        };
      }

      const supervisorOk = verifySupervisorPin(
        supervisorOverridePin,
        `Acceso fuera de horario para ${found.fullName} (${found.shift})`
      );
      if (!supervisorOk) {
        return {
          success: false,
          requiresSupervisorOverride: true,
          message: 'PIN o contraseña de Supervisor incorrecto. Se requiere autorización del Administrador.'
        };
      }
    }

    storage.resetLoginAttempts();
    storage.setSecurityAlert(null);
    setSecurityAlertState(null);
    storage.saveCurrentUser(found);
    currentUserRef.current = found;
    setCurrentUserState(found);
    setCurrentRoleState(found.role);
    storage.saveActiveRole(found.role);
    storage.addSecurityAuditLog({
      type: 'LOGIN_SUCCESS',
      userName: found.fullName,
      userIdentifier: found.email,
      role: found.role,
      details: !shiftCheck.allowed
        ? `Acceso autorizado fuera de turno con aval de Supervisor (${found.shift}).`
        : 'Acceso autorizado con credenciales y firma criptográfica verificadas.'
    });
    setSecurityAuditLogs(storage.getSecurityAuditLogs());
    sounds.playCheckoutSuccess();
    return { success: true, user: found };
  };

  const loginQuick = (employeeId: string): boolean => {
    const found = employees.find((e) => e.id === employeeId);
    if (found) {
      storage.resetLoginAttempts();
      storage.setSecurityAlert(null);
      setSecurityAlertState(null);
      storage.saveCurrentUser(found);
      currentUserRef.current = found;
      setCurrentUserState(found);
      setCurrentRoleState(found.role);
      storage.saveActiveRole(found.role);
      sounds.playCheckoutSuccess();
      return true;
    }
    return false;
  };

  const logout = (reason?: string | unknown) => {
    const customReason = typeof reason === 'string' ? reason : undefined;
    if (currentUserRef.current && !customReason) {
      storage.addSecurityAuditLog({
        type: 'MANUAL_LOGOUT',
        userName: currentUserRef.current.fullName,
        role: currentUserRef.current.role,
        details: 'Cierre de sesión manual realizado por el operador.'
      });
    }
    storage.saveCurrentUser(null);
    currentUserRef.current = null;
    setCurrentUserState(null);
    if (customReason) {
      storage.setSecurityAlert(customReason);
      setSecurityAlertState(customReason);
    }
    setSecurityAuditLogs(storage.getSecurityAuditLogs());
  };

  const setCurrentRole = (role: UserRole) => {
    // Bloquear escalación de privilegios: solo un Administrador real puede simular otros roles
    if (currentUserRef.current && currentUserRef.current.role !== 'admin' && role !== currentUserRef.current.role) {
      return;
    }
    setCurrentRoleState(role);
    storage.saveActiveRole(role);
  };

  const updateRolePermissions = (roleId: UserRole, permissions: Partial<RolePermissions>) => {
    // El Administrador siempre conserva acceso total por seguridad y consistencia del sistema
    if (roleId === 'admin') return;

    setRoles(prev => prev.map(r => r.id === roleId ? {
      ...r,
      permissions: { ...r.permissions, ...permissions }
    } : r));
  };

  // Member Management
  const addMember = (clientData: Partial<Client>, initialPaymentMethod: PaymentMethod = 'cash'): Client => {
    const maxIdNum = membersRef.current.reduce((max, m) => {
      const match = m.id.match(/^MEM-(\d+)$/i);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 8);
    const newId = clientData.id || `MEM-${String(maxIdNum + 1).padStart(3, '0')}`;
    const newMember: Client = {
      id: newId,
      fullName: clientData.fullName || 'Nuevo Socio',
      documentId: clientData.documentId || `${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: clientData.email || `${newId.toLowerCase()}@legendsgym.com`,
      phone: clientData.phone || '+52 55 0000 0000',
      avatarUrl: getGymAvatar(clientData.fullName || 'Nuevo Socio', clientData.avatarUrl),
      birthDate: clientData.birthDate || '1995-01-01',
      emergencyContact: clientData.emergencyContact || {
        name: 'Contacto Emergencia',
        phone: '+52 55 1111 2222',
        relationship: 'Familiar'
      },
      medicalNotes: clientData.medicalNotes || 'Sin condiciones médicas registradas.',
      biometricRegistered: clientData.biometricRegistered !== undefined ? Boolean(clientData.biometricRegistered) : true,
      biometricHash: clientData.biometricHash || `BIO_HASH_${newId}`,
      biometricTemplate: clientData.biometricTemplate || `FP_THUMB_RIGHT_${newId}`,
      membership: clientData.membership || {
        planType: 'monthly',
        planName: 'Mensualidad Estándar',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        price: 850,
        status: 'active',
        daysRemaining: 30,
      },
      checkInsCount: 0,
      totalSpentInStore: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const planPrice = newMember.membership.price;

    // Generate initial membership sale if price > 0
    if (planPrice > 0 && newMember.membership.status === 'active') {
      const folio = `FOL-${Date.now().toString().slice(-6)}`;
      const memberSale: Sale = {
        id: `SALE-${Date.now()}`,
        folio,
        timestamp: new Date().toISOString(),
        clientId: newId,
        clientName: newMember.fullName,
        items: [{
          product: {
            id: `PLAN-${newMember.membership.planType}`,
            name: `Inscripción: ${newMember.membership.planName}`,
            brand: 'LEGENDS GYM',
            category: 'gear',
            price: planPrice,
            costPrice: 0,
            stock: 999,
            minStock: 0,
            image: '/logo.png',
            barcode: `PLAN-${newMember.membership.planType.toUpperCase()}`,
            description: `Alta de socio y cuota de acceso - ${newMember.membership.planName}`
          },
          quantity: 1,
          unitPrice: planPrice,
          subtotal: planPrice
        }],
        subtotal: Math.round((planPrice / 1.16) * 100) / 100,
        tax: Math.round((planPrice - (planPrice / 1.16)) * 100) / 100,
        total: planPrice,
        paymentMethod: initialPaymentMethod,
        amountPaid: planPrice,
        changeGiven: 0,
        cashierName: currentUser ? currentUser.fullName : (currentRole === 'admin' ? 'Gerente / Admin' : 'Recepción'),
        cashierRole: currentRole,
        notes: `Inscripción inicial: ${newMember.membership.planName}`,
        saleType: 'membership',
        planName: newMember.membership.planName,
        planType: newMember.membership.planType,
      };

      setSales(prev => [memberSale, ...prev]);
      broadcastLocalSync({ type: 'SALE_ADDED', sale: memberSale });

      setCashSession(prev => {
        const next = {
          ...prev,
          totalMembershipsCash: initialPaymentMethod === 'cash' ? prev.totalMembershipsCash + planPrice : prev.totalMembershipsCash,
          totalMembershipsCard: initialPaymentMethod === 'card' ? prev.totalMembershipsCard + planPrice : prev.totalMembershipsCard,
          totalMembershipsTransfer: initialPaymentMethod === 'transfer' ? (prev.totalMembershipsTransfer || 0) + planPrice : (prev.totalMembershipsTransfer || 0),
          expectedCash: initialPaymentMethod === 'cash' ? prev.expectedCash + planPrice : prev.expectedCash,
        };
        broadcastLocalSync({ type: 'CASH_SESSION_UPDATED', cashSession: next });
        return next;
      });

      newMember.totalSpentInStore += planPrice;
    }

    setMembers(prev => {
      const next = [newMember, ...prev.filter(m => m.id !== newMember.id)];
      membersRef.current = next;
      storage.saveMembers(next);
      return next;
    });
    // Instant sync: Local Broadcast & LAN/Cloud HTTP Servers
    broadcastLocalSync({ type: 'MEMBER_ADDED', member: newMember });
    pushMemberActionToServer('add', { member: newMember }).catch(() => {});

    // Notification
    addNotification({
      title: 'Nuevo Socio Registrado',
      message: `${newMember.fullName} fue dado de alta con ${newMember.membership.planName} ($${planPrice.toLocaleString('es-MX')}).`,
      type: 'success',
      targetTab: 'clients',
      actionLabel: 'Ver socio'
    });

    return newMember;
  };

  const updateMember = (id: string, updates: Partial<Client>) => {
    setMembers(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, ...updates } : m);
      membersRef.current = updated;
      storage.saveMembers(updated);
      const target = updated.find(m => m.id === id);
      if (target) {
        broadcastLocalSync({ type: 'MEMBER_UPDATED', member: target });
        pushMemberActionToServer('update', { member: target }).catch(() => {});
      }
      return updated;
    });
  };

  const deleteMember = (id: string) => {
    const target = members.find(m => m.id === id);
    requestSupervisorAuth(
      `Eliminar socio permanentemente: ${target ? `${target.fullName} (${target.id})` : id}`,
      () => {
        storage.addDeletedMemberId(id);
        setMembers(prev => {
          const next = prev.filter(m => m.id !== id);
          membersRef.current = next;
          storage.saveMembers(next);
          return next;
        });
        broadcastLocalSync({ type: 'MEMBER_DELETED', memberId: id });
        pushMemberActionToServer('delete', { memberId: id }).catch(() => {});
      }
    );
  };

  const replaceMembers = (newMembers: Client[]) => {
    membersRef.current = newMembers;
    setMembers(newMembers);
    storage.saveMembers(newMembers);
    broadcastLocalSync({ type: 'MEMBERS_REPLACED', members: newMembers });
  };

  const syncMembersWithServer = async (customServerUrl?: string): Promise<boolean> => {
    try {
      const res = await fetchMembersFromServer(customServerUrl);
      if (res.success && Array.isArray(res.members) && res.members.length > 0) {
        const merged = mergeMemberLists(membersRef.current, res.members);
        membersRef.current = merged;
        setMembers(merged);
        storage.saveMembers(merged);
        broadcastLocalSync({ type: 'MEMBERS_REPLACED', members: merged, version: res.version });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const renewMembership = (
    id: string, 
    planType: MembershipPlanType, 
    months: number, 
    price: number, 
    paymentMethod: PaymentMethod
  ) => {
    const target = members.find(m => m.id === id);
    if (!target) return;

    const startDate = new Date();
    const endDate = new Date();
    if (planType === 'daily') {
      endDate.setDate(startDate.getDate() + 1);
    } else {
      endDate.setMonth(startDate.getMonth() + months);
    }

    const daysRemaining = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    let planName = 'Mensualidad Regular';
    if (planType === 'daily') planName = 'Pase por Día (Day Pass)';
    if (planType === 'quarterly') planName = 'Plan Trimestral Fuerza';
    if (planType === 'annual' || planType === 'vip') planName = 'Membresía Black VIP Anual';

    const updatedMembership = {
      planType,
      planName,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      price,
      status: 'active' as const,
      daysRemaining,
    };

    updateMember(id, { 
      membership: updatedMembership,
      totalSpentInStore: (target.totalSpentInStore || 0) + price
    });

    // Generate unified sale record for renewal
    const folio = `FOL-${Date.now().toString().slice(-6)}`;
    const renewalSale: Sale = {
      id: `SALE-${Date.now()}`,
      folio,
      timestamp: new Date().toISOString(),
      clientId: id,
      clientName: target.fullName,
      items: [{
        product: {
          id: `PLAN-${planType}`,
          name: `Renovación: ${planName}`,
          brand: 'LEGENDS GYM',
          category: 'gear',
          price,
          costPrice: 0,
          stock: 999,
          minStock: 0,
          image: '/logo.png',
          barcode: `PLAN-${planType.toUpperCase()}`,
          description: `Renovación de cuota deportiva - ${planName}`
        },
        quantity: 1,
        unitPrice: price,
        subtotal: price
      }],
      subtotal: Math.round((price / 1.16) * 100) / 100,
      tax: Math.round((price - (price / 1.16)) * 100) / 100,
      total: price,
      paymentMethod,
      amountPaid: price,
      changeGiven: 0,
      cashierName: currentUser ? currentUser.fullName : (currentRole === 'admin' ? 'Gerente / Admin' : 'Recepción'),
      cashierRole: currentRole,
      notes: `Renovación de membresía ${planName}`,
      saleType: 'membership',
      planName,
      planType
    };

    setSales(prev => [renewalSale, ...prev]);
    broadcastLocalSync({ type: 'SALE_ADDED', sale: renewalSale });

    setCashSession(prev => {
      const next = {
        ...prev,
        totalMembershipsCash: paymentMethod === 'cash' ? prev.totalMembershipsCash + price : prev.totalMembershipsCash,
        totalMembershipsCard: paymentMethod === 'card' ? prev.totalMembershipsCard + price : prev.totalMembershipsCard,
        totalMembershipsTransfer: paymentMethod === 'transfer' ? (prev.totalMembershipsTransfer || 0) + price : (prev.totalMembershipsTransfer || 0),
        expectedCash: paymentMethod === 'cash' ? prev.expectedCash + price : prev.expectedCash,
      };
      broadcastLocalSync({ type: 'CASH_SESSION_UPDATED', cashSession: next });
      return next;
    });

    addNotification({
      title: 'Membresía Renovada',
      message: `${target.fullName} renovó ${planName} ($${price.toLocaleString('es-MX')}) pagado con ${paymentMethod.toUpperCase()}.`,
      type: 'success',
      targetTab: 'incomes',
      actionLabel: 'Ver comprobante'
    });

    sounds.playCheckoutSuccess();
  };

  const enrollFingerprint = (id: string, templateCode: string): boolean => {
    const member = members.find(m => m.id === id);
    if (!member) return false;

    const hash = `BIO_HASH_${member.id}_${Date.now().toString(36).toUpperCase()}`;
    updateMember(id, {
      biometricRegistered: true,
      biometricHash: hash,
      biometricTemplate: templateCode || 'FP_THUMB_RIGHT_ENROLLED'
    });
    return true;
  };

  const getMemberById = (id: string) => members.find(m => m.id === id);

  // Products
  const addProduct = (productData: Omit<Product, 'id'>): Product => {
    const newId = `PROD-${String(products.length + 1).padStart(3, '0')}`;
    const newProduct: Product = { ...productData, id: newId };
    setProducts(prev => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProduct = (id: string) => {
    const target = products.find(p => p.id === id);
    requestSupervisorAuth(
      `Eliminar producto de inventario: ${target ? target.name : id}`,
      () => {
        setProducts(prev => prev.filter(p => p.id !== id));
      }
    );
  };

  const adjustStock = (id: string, amount: number) => {
    setProducts(prev => {
      const updated = prev.map(p => {
        if (p.id === id) {
          const nextStock = Math.max(0, p.stock + amount);
          return { ...p, stock: nextStock };
        }
        return p;
      });
      const targetP = updated.find(p => p.id === id);
      if (targetP) broadcastLocalSync({ type: 'PRODUCT_UPDATED', product: targetP });
      return updated;
    });
  };

  // Cart & POS
  const addToCart = (product: Product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = Math.min(product.stock, existing.quantity + quantity);
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: newQty, subtotal: newQty * item.unitPrice }
            : item
        );
      } else {
        const initialQty = Math.min(product.stock, Math.max(1, quantity));
        return [...prev, {
          product,
          quantity: initialQty,
          unitPrice: product.price,
          subtotal: initialQty * product.price,
        }];
      }
    });
    sounds.playScanBlip();
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const safeQty = Math.min(item.product.stock, quantity);
        return {
          ...item,
          quantity: safeQty,
          subtotal: safeQty * item.unitPrice,
        };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartSubtotal = Math.round((cartTotal / 1.16) * 100) / 100;
  const cartTax = Math.round((cartTotal - cartSubtotal) * 100) / 100;
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const processSale = (
    paymentMethod: PaymentMethod, 
    amountPaid: number, 
    clientId?: string, 
    notes?: string
  ): Sale => {
    const client = clientId ? members.find(m => m.id === clientId) : undefined;
    const clientName = client ? client.fullName : 'Público General';
    const changeGiven = paymentMethod === 'cash' ? Math.max(0, amountPaid - cartTotal) : 0;
    const folio = `FOL-${Date.now().toString().slice(-6)}`;

    const newSale: Sale = {
      id: `SALE-${Date.now()}`,
      folio,
      timestamp: new Date().toISOString(),
      clientId,
      clientName,
      items: [...cart],
      subtotal: cartSubtotal,
      tax: cartTax,
      total: cartTotal,
      paymentMethod,
      amountPaid: paymentMethod === 'cash' ? amountPaid : cartTotal,
      changeGiven,
      cashierName: currentUser ? currentUser.fullName : (currentRole === 'admin' ? 'Gerente / Admin' : 'Cajero Recepción'),
      cashierRole: currentRole,
      notes,
      saleType: 'store',
    };

    cart.forEach(item => {
      adjustStock(item.product.id, -item.quantity);
      const remaining = item.product.stock - item.quantity;
      if (remaining <= item.product.minStock) {
        addNotification({
          title: 'Stock Crítico en Tienda',
          message: `El suplemento "${item.product.name}" quedó en ${remaining} unidades (mínimo de seguridad: ${item.product.minStock}).`,
          type: 'danger',
          targetTab: 'inventory',
          actionLabel: 'Reabastecer'
        });
      }
    });

    if (clientId) {
      setMembers(prev => prev.map(m => 
        m.id === clientId 
          ? { ...m, totalSpentInStore: m.totalSpentInStore + cartTotal }
          : m
      ));
    }

    setSales(prev => [newSale, ...prev]);
    broadcastLocalSync({ type: 'SALE_ADDED', sale: newSale });

    setCashSession(prev => {
      const next = {
        ...prev,
        totalSalesCash: paymentMethod === 'cash' ? prev.totalSalesCash + cartTotal : prev.totalSalesCash,
        totalSalesCard: paymentMethod === 'card' ? prev.totalSalesCard + cartTotal : prev.totalSalesCard,
        totalSalesTransfer: paymentMethod === 'transfer' ? prev.totalSalesTransfer + cartTotal : prev.totalSalesTransfer,
        expectedCash: paymentMethod === 'cash' ? prev.expectedCash + cartTotal : prev.expectedCash,
      };
      broadcastLocalSync({ type: 'CASH_SESSION_UPDATED', cashSession: next });
      return next;
    });

    clearCart();
    sounds.playCheckoutSuccess();
    return newSale;
  };

  // Biometric Turnstile Access
  const verifyBiometricAccess = (biometricQuery: string): { 
    granted: boolean; 
    client?: Client; 
    reason: string; 
    log: AccessLog 
  } => {
    const normalizeText = (val?: string) =>
      (val || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const q = normalizeText(biometricQuery);
    const qCompact = q.replace(/[\s\-_]/g, '');
    const qWords = q.split(/\s+/).filter(Boolean);

    // Ensure we always search the most up-to-date list (combining live ref + localStorage)
    const candidatePool = mergeMemberLists(membersRef.current, storage.getMembers());

    const matched = candidatePool.find(m => {
      if (!q) return false;
      const hashNorm = normalizeText(m.biometricHash);
      const tplNorm = normalizeText(m.biometricTemplate);
      const idNorm = normalizeText(m.id);
      const idCompact = idNorm.replace(/[\s\-_]/g, '');
      const docNorm = normalizeText(m.documentId);
      const emailNorm = normalizeText(m.email);
      const nameNorm = normalizeText(m.fullName);
      const phoneDigits = (m.phone || '').replace(/\D/g, '');
      const queryDigits = q.replace(/\D/g, '');

      if (hashNorm && hashNorm === q) return true;
      if (tplNorm && tplNorm === q) return true;
      if (idNorm === q || idCompact === qCompact) return true;
      if (docNorm && docNorm === q) return true;
      if (emailNorm && emailNorm === q) return true;
      if (queryDigits.length >= 6 && phoneDigits.endsWith(queryDigits)) return true;
      if (nameNorm.includes(q)) return true;
      if (qWords.length > 1 && qWords.every(w => nameNorm.includes(w))) return true;
      return false;
    });

    const now = new Date().toISOString();

    if (!matched) {
      sounds.playAccessDenied();
      const failLog: AccessLog = {
        id: `LOG-${Date.now()}`,
        timestamp: now,
        clientName: 'Huella / Credencial No Identificada',
        status: 'denied',
        reason: `Credencial o huella "${biometricQuery.trim()}" no encontrada en el padrón de socios`,
        method: 'fingerprint',
      };
      setAccessLogs(prev => [failLog, ...prev]);
      broadcastLocalSync({ type: 'ACCESS_LOG_ADDED', log: failLog });
      pushAccessLogToServer(failLog).catch(() => {});
      return { granted: false, reason: failLog.reason, log: failLog };
    }

    if (matched.membership.status === 'expired' || matched.membership.daysRemaining < 0) {
      sounds.playAccessDenied();
      const expiredDays = Math.abs(matched.membership.daysRemaining);
      const failLog: AccessLog = {
        id: `LOG-${Date.now()}`,
        timestamp: now,
        clientId: matched.id,
        clientName: matched.fullName,
        avatarUrl: matched.avatarUrl,
        status: 'denied',
        reason: `Membresía vencida hace ${expiredDays} día(s). Favor de renovar en caja.`,
        planName: matched.membership.planName,
        daysRemaining: matched.membership.daysRemaining,
        method: 'fingerprint',
      };
      setAccessLogs(prev => [failLog, ...prev]);
      broadcastLocalSync({ type: 'ACCESS_LOG_ADDED', log: failLog });
      pushAccessLogToServer(failLog).catch(() => {});
      return { granted: false, client: matched, reason: failLog.reason, log: failLog };
    }

    sounds.playAccessGranted();
    const successLog: AccessLog = {
      id: `LOG-${Date.now()}`,
      timestamp: now,
      clientId: matched.id,
      clientName: matched.fullName,
      avatarUrl: matched.avatarUrl,
      status: 'granted',
      reason: `Acceso Autorizado - ${matched.membership.planName}`,
      planName: matched.membership.planName,
      daysRemaining: matched.membership.daysRemaining,
      method: 'fingerprint',
    };

    updateMember(matched.id, {
      checkInsCount: matched.checkInsCount + 1,
      lastCheckIn: now,
    });

    // Update active branch occupancy in real time
    setBranches(prev => {
      const updated = prev.map(b => b.id === activeBranchId ? {
        ...b,
        currentOccupancy: Math.min(b.maxCapacity, b.currentOccupancy + 1)
      } : b);
      const targetB = updated.find(b => b.id === activeBranchId);
      if (targetB) broadcastLocalSync({ type: 'BRANCH_UPDATED', branch: targetB });
      return updated;
    });

    setAccessLogs(prev => [successLog, ...prev]);
    broadcastLocalSync({ type: 'ACCESS_LOG_ADDED', log: successLog });
    pushAccessLogToServer(successLog).catch(() => {});
    return { granted: true, client: matched, reason: successLog.reason, log: successLog };
  };

  const registerExit = (clientId?: string) => {
    const client = clientId ? members.find(m => m.id === clientId) : undefined;
    const now = new Date().toISOString();

    setBranches(prev => {
      const updated = prev.map(b => b.id === activeBranchId ? {
        ...b,
        currentOccupancy: Math.max(0, b.currentOccupancy - 1)
      } : b);
      const targetB = updated.find(b => b.id === activeBranchId);
      if (targetB) broadcastLocalSync({ type: 'BRANCH_UPDATED', branch: targetB });
      return updated;
    });

    sounds.playScanBlip();

    const exitLog: AccessLog = {
      id: `LOG-${Date.now()}`,
      timestamp: now,
      clientId: client?.id,
      clientName: client ? `${client.fullName} (Salida)` : 'Atleta en Salida',
      avatarUrl: client?.avatarUrl,
      status: 'granted',
      reason: 'Salida de sala registrada',
      method: 'manual',
    };
    setAccessLogs(prev => [exitLog, ...prev]);
    broadcastLocalSync({ type: 'ACCESS_LOG_ADDED', log: exitLog });
  };

  const clearAccessLogs = () => setAccessLogs([]);

  // Cash Management
  const updateCashSession = (session: CashRegisterSession) => {
    setCashSession(session);
    broadcastLocalSync({ type: 'CASH_SESSION_UPDATED', cashSession: session });
  };

  const closeCashSession = (
    countedCash: number, 
    notes?: string, 
    leaveCashInDrawer?: boolean, 
    remanentCash?: number, 
    withdrawnCash?: number
  ) => {
    const diff = countedCash - cashSession.expectedCash;
    const closed: CashRegisterSession = {
      ...cashSession,
      actualCash: countedCash,
      cashDifference: diff,
      closedAt: new Date().toISOString(),
      status: 'closed',
      notes,
      leaveCashInDrawer,
      remanentCash,
      withdrawnCash,
    };
    setCashSession(closed);
    broadcastLocalSync({ type: 'CASH_SESSION_UPDATED', cashSession: closed });
  };

  const openCashSession = (initialCash: number) => {
    const newSession: CashRegisterSession = {
      id: 'CAJA-' + Date.now().toString().slice(-6),
      openedAt: new Date().toISOString(),
      openedBy: currentUser ? currentUser.fullName : (currentRole === 'admin' ? 'Administrador' : 'Recepcionista'),
      initialCash,
      totalSalesCash: 0,
      totalSalesCard: 0,
      totalSalesTransfer: 0,
      totalMembershipsCash: 0,
      totalMembershipsCard: 0,
      totalMembershipsTransfer: 0,
      expectedCash: initialCash,
      status: 'open',
    };
    setCashSession(newSession);
    broadcastLocalSync({ type: 'CASH_SESSION_UPDATED', cashSession: newSession });
  };

  // Empleados (Staff)
  const addEmployee = (data: Omit<Employee, 'id'>): Employee => {
    const newId = `EMP-${String(employees.length + 1).padStart(3, '0')}`;
    const newEmp: Employee = { ...data, id: newId };
    setEmployees(prev => [newEmp, ...prev]);
    return newEmp;
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    if (currentUser?.id === id) {
      const updated = { ...currentUser, ...updates };
      setCurrentUserState(updated);
      storage.saveCurrentUser(updated);
    }
  };

  const deleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    if (currentUser?.id === id) {
      logout();
    }
  };

  // Configuración & Catálogos
  const updateGymSettings = (updates: Partial<GymSettings>) => {
    setGymSettings(prev => ({ ...prev, ...updates }));
  };

  const addCatalogPlan = (plan: Omit<SystemCatalogPlan, 'id'>): SystemCatalogPlan => {
    const newId = `CAT-PLAN-${String(catalogPlans.length + 1).padStart(3, '0')}`;
    const newPlan: SystemCatalogPlan = { ...plan, id: newId };
    setCatalogPlans(prev => [newPlan, ...prev]);
    return newPlan;
  };

  const updateCatalogPlan = (id: string, updates: Partial<SystemCatalogPlan>) => {
    setCatalogPlans(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteCatalogPlan = (id: string) => {
    setCatalogPlans(prev => prev.filter(p => p.id !== id));
  };

  // Multi-Sucursal (Branches)
  const activeBranch = branches.find(b => b.id === activeBranchId) || branches[0];
  const setActiveBranchId = (id: string) => {
    setActiveBranchIdState(id);
    storage.saveActiveBranchId(id);
  };
  const updateBranch = (id: string, updates: Partial<Branch>) => {
    setBranches(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  // Gastos (Expenses)
  const addExpense = (data: Omit<Expense, 'id' | 'folio'>): Expense => {
    const newId = `EXP-${Date.now().toString().slice(-6)}`;
    const newFolio = `GAS-${String(expenses.length + 101).padStart(5, '0')}`;
    const newExpense: Expense = {
      ...data,
      id: newId,
      folio: newFolio,
      branchId: data.branchId || activeBranchId,
    };
    setExpenses(prev => [newExpense, ...prev]);
    broadcastLocalSync({ type: 'EXPENSE_ADDED', expense: newExpense });

    // Si se pagó en efectivo de caja, se descuenta del efectivo esperado
    if (data.paidFromCashRegister && cashSession.status === 'open') {
      setCashSession(prev => {
        const next = {
          ...prev,
          expectedCash: Math.max(0, prev.expectedCash - data.amount),
          notes: (prev.notes ? prev.notes + ' | ' : '') + `Gasto en caja: -$${data.amount} (${data.description.slice(0, 30)})`
        };
        broadcastLocalSync({ type: 'CASH_SESSION_UPDATED', cashSession: next });
        return next;
      });
    }

    addNotification({
      title: 'Egreso Registrado',
      message: `Gasto de $${data.amount.toLocaleString('es-MX')} registrado para "${data.description}".`,
      type: 'warning',
      targetTab: 'expenses',
      actionLabel: 'Ver egresos'
    });

    return newExpense;
  };

  const deleteExpense = (id: string) => {
    const target = expenses.find(e => e.id === id);
    requestSupervisorAuth(
      `Anular / Eliminar egreso: ${target ? `${target.description} ($${target.amount})` : id}`,
      () => {
        if (target && target.paidFromCashRegister && cashSession.status === 'open') {
          setCashSession(prev => {
            const next = {
              ...prev,
              expectedCash: prev.expectedCash + target.amount
            };
            broadcastLocalSync({ type: 'CASH_SESSION_UPDATED', cashSession: next });
            return next;
          });
        }
        setExpenses(prev => prev.filter(e => e.id !== id));
      }
    );
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayExpensesTotal = expenses
    .filter(e => e.date.startsWith(todayStr))
    .reduce((acc, e) => acc + e.amount, 0);

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const monthExpensesTotal = expenses
    .filter(e => e.date.startsWith(currentMonthStr))
    .reduce((acc, e) => acc + e.amount, 0);

  // Notificaciones
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };
  const addNotification = (item: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: SystemNotification = {
      ...item,
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    broadcastLocalSync({ type: 'NOTIFICATION_ADDED', notification: newNotif });
  };
  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Generación inicial inteligente de notificaciones
  useEffect(() => {
    if (notifications.length === 0) {
      const generated: SystemNotification[] = [];
      const expiring = members.filter(m => m.membership.daysRemaining >= 0 && m.membership.daysRemaining <= 3);
      if (expiring.length > 0) {
        generated.push({
          id: 'NOTIF-EXP-01',
          title: 'Membresías por vencer',
          message: `${expiring.length} socio(s) tienen su cuota por vencer en menos de 72 horas: ${expiring.map(m => m.fullName).slice(0, 2).join(', ')}.`,
          timestamp: new Date().toISOString(),
          type: 'warning',
          read: false,
          targetTab: 'clients',
          actionLabel: 'Ver socios'
        });
      }
      const lowStock = products.filter(p => p.stock <= p.minStock);
      if (lowStock.length > 0) {
        generated.push({
          id: 'NOTIF-STOCK-01',
          title: 'Stock Crítico de Suplementos',
          message: `${lowStock.length} producto(s) en tienda por debajo del stock mínimo: ${lowStock.map(p => p.name).slice(0, 2).join(', ')}.`,
          timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
          type: 'danger',
          read: false,
          targetTab: 'inventory',
          actionLabel: 'Revisar inventario'
        });
      }
      generated.push({
        id: 'NOTIF-BRANCH-01',
        title: 'Red de Sedes Conectada',
        message: 'Las 3 sedes de LEGENDS PRO GYM sincronizaron correctamente métricas de aforo y corte de caja.',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        type: 'info',
        read: true,
        targetTab: 'branches',
        actionLabel: 'Ver sedes'
      });
      setNotifications(generated);
    }
  }, []);

  // Sincronización & Offline-First
  const toggleOnlineMode = () => {
    setSyncState(prev => ({
      ...prev,
      isOnline: !prev.isOnline,
      pendingSyncCount: !prev.isOnline ? 0 : 2
    }));
  };

  const forceSync = async () => {
    setSyncState(prev => ({ ...prev, isSyncing: true }));
    try {
      const res = await fetchMembersFromServer();
      if (res.success && res.members.length > 0) {
        setMembers(res.members);
        storage.saveMembers(res.members);
        broadcastLocalSync({ type: 'MEMBERS_REPLACED', members: res.members, version: res.version });
      } else {
        // If server is empty, seed it with our local members
        await pushMembersToServer(members);
      }
    } catch {
      // Offline fallback
    }
    const now = new Date().toISOString();
    storage.saveLastSyncDate(now);
    setSyncState(prev => ({
      ...prev,
      isSyncing: false,
      lastSyncedAt: now,
      pendingSyncCount: 0,
      storageUsageKb: storage.getStorageUsageKb()
    }));
  };

  const exportDatabase = () => storage.exportDatabaseJson();
  const importDatabase = (json: string) => {
    const success = storage.importDatabaseJson(json);
    if (success) {
      window.location.reload();
    }
    return success;
  };
  const resetDatabase = () => {
    requestSupervisorAuth(
      'Formatear y Restaurar Base de Datos de Fábrica',
      () => {
        storage.resetAll();
        window.location.reload();
      }
    );
  };

  // Metrics
  const activeMembersCount = members.filter(m => m.membership.status === 'active' || m.membership.status === 'expiring_soon').length;
  const todayAccess = accessLogs.filter(l => (isTodayDate(l.timestamp) || l.timestamp.startsWith(todayStr)) && l.status === 'granted');
  const todayCheckInsCount = todayAccess.length;
  const lowStockProductsCount = products.filter(p => p.stock <= p.minStock).length;
  
  const todaySales = sales.filter(s => s.timestamp.startsWith(todayStr));
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.total, 0);
  const todaySalesCount = todaySales.length;

  const todayStoreSalesTotal = todaySales
    .filter(s => s.saleType !== 'membership')
    .reduce((acc, s) => acc + s.total, 0);

  const todayMembershipsSalesTotal = todaySales
    .filter(s => s.saleType === 'membership')
    .reduce((acc, s) => acc + s.total, 0);

  return (
    <GymContext.Provider value={{
      currentUser,
      isAuthenticated,
      securityAlert,
      clearSecurityAlert,
      securityAuditLogs,
      login,
      loginQuick,
      logout,
      verifySupervisorPin,
      requestSupervisorAuth,
      pendingSupervisorAction,
      cancelSupervisorAuth,
      currentRole,
      setCurrentRole,
      roles,
      updateRolePermissions,
      branches,
      activeBranchId,
      activeBranch,
      setActiveBranchId,
      updateBranch,
      members,
      addMember,
      updateMember,
      deleteMember,
      renewMembership,
      enrollFingerprint,
      getMemberById,
      replaceMembers,
      syncMembersWithServer,
      products,
      addProduct,
      updateProduct,
      deleteProduct,
      adjustStock,
      cart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      cartTotal,
      cartSubtotal,
      cartTax,
      cartItemsCount,
      processSale,
      sales,
      todaySalesTotal,
      todaySalesCount,
      todayStoreSalesTotal,
      todayMembershipsSalesTotal,
      expenses,
      addExpense,
      deleteExpense,
      todayExpensesTotal,
      monthExpensesTotal,
      notifications,
      unreadNotificationsCount,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      addNotification,
      deleteNotification,
      syncState,
      toggleOnlineMode,
      forceSync,
      storageUsageKb: syncState.storageUsageKb,
      exportDatabase,
      importDatabase,
      resetDatabase,
      accessLogs,
      verifyBiometricAccess,
      registerExit,
      clearAccessLogs,
      cashSession,
      updateCashSession,
      closeCashSession,
      openCashSession,
      employees,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      gymSettings,
      updateGymSettings,
      catalogPlans,
      addCatalogPlan,
      updateCatalogPlan,
      deleteCatalogPlan,
      activeMembersCount,
      todayCheckInsCount,
      lowStockProductsCount,
      isTerminalConnected,
    }}>
      {children}
    </GymContext.Provider>
  );

};

export const useGym = () => {
  const context = useContext(GymContext);
  if (!context) {
    throw new Error('useGym debe ser utilizado dentro de un GymProvider');
  }
  return context;
};
