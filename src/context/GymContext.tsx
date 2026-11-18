import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
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
import { storage, sanitizeEmployees, sanitizeRoles } from '../services/storage';
import { INITIAL_EMPLOYEES, INITIAL_ROLES, filterLegacyCatalogPlans } from '../data/initialEmployees';
import { TerminalEntryDesignConfig, mergeWithDefaultTerminalDesign } from '../utils/terminalDesign';
import { sounds } from '../services/audio';
import { getGymAvatar, detectGender } from '../utils/genderAvatar';
import { hashSecret, verifySecret } from '../utils/securityCrypto';
import {
  getSaleItemLabel,
  isNonInventorySaleItem,
  normalizeSaleList,
  toSafeNumber,
} from '../utils/saleNormalizer';
import { calculateMembershipDates, getMembershipStatus, getLocalDateString, calculateAgeFromBirthDate, resolveSaleType } from '../utils/membershipUtils';
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
  isTodayDate,
  fetchFullDatabaseFromServer,
  pushFullDatabaseToServer,
  pushEntityChangeToServer,
  pushVisitRequestToServer,
  pushVisitAuthorizeToServer,
  pushVisitRejectToServer,
  fetchPendingVisitRequestsFromServer,
  pushRegistrationRequestToServer,
  pushRegistrationAuthorizeToServer,
  pushRegistrationRejectToServer,
  fetchPendingRegistrationRequestsFromServer
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
  isAdmin: boolean;
  activePermissions: RolePermissions;
  canAccessTab: (tabId: string) => boolean;
  firstAllowedTab: string;
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
  addMember: (clientData: Partial<Client>, initialPaymentMethod?: PaymentMethod, options?: { skipSale?: boolean; groupSummaryNote?: string }) => Client;
  updateMember: (id: string, updates: Partial<Client>) => void;
  deleteMember: (id: string) => void;
  renewMembership: (id: string, planType: MembershipPlanType, months: number, price: number, paymentMethod: PaymentMethod) => void;
  enrollFingerprint: (id: string, templateCode: string) => boolean;
  getMemberById: (id: string) => Client | undefined;
  replaceMembers: (newMembers: Client[]) => void;
  clearMembersCache: () => Promise<void>;
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
  refundSale: (
    saleIdOrFolio: string,
    reason: string,
    itemsToRefund?: { productId: string; quantity: number }[]
  ) => { success: boolean; message: string; refundedAmount: number; restoredUnits: number; updatedSale?: Sale };
  todaySalesTotal: number;
  todaySalesCount: number;
  todayStoreSalesTotal: number;
  todayMembershipsSalesTotal: number;
  todayVisitsSalesTotal: number;

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

  // SincronizaciÃ³n & Backup
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

  // ConfiguraciÃ³n & CatÃ¡logos
  gymSettings: GymSettings;
  updateGymSettings: (updates: Partial<GymSettings>) => void;
  terminalDesign: TerminalEntryDesignConfig;
  updateTerminalDesign: (nextDesign: TerminalEntryDesignConfig) => void;
  catalogPlans: SystemCatalogPlan[];
  addCatalogPlan: (plan: Omit<SystemCatalogPlan, 'id'>) => SystemCatalogPlan;
  updateCatalogPlan: (id: string, updates: Partial<SystemCatalogPlan>) => void;
  deleteCatalogPlan: (id: string) => void;

  // Solicitudes de Pase de Visita en Torniquete ($50)
  pendingVisitRequests: Array<{ id: string; clientName: string; cost: number; timestamp: number }>;
  authorizeVisitPass: (requestId: string, paymentMethod?: PaymentMethod) => Promise<boolean>;
  rejectVisitPass: (requestId: string) => Promise<boolean>;
  requestVisitPass: (clientName?: string, cost?: number) => Promise<string>;

  // Solicitudes de Alta y Cobro de Nuevos Socios en Torniquete
  pendingRegistrationRequests: Array<{ id: string; memberData: any; paymentMethod: PaymentMethod; timestamp: number }>;
  authorizeMemberRegistration: (requestId: string, paymentMethod?: PaymentMethod) => Promise<boolean>;
  rejectMemberRegistration: (requestId: string) => Promise<boolean>;
  requestMemberRegistration: (memberData: any, paymentMethod?: PaymentMethod) => Promise<string>;

  // Quick stats
  activeMembersCount: number;
  todayCheckInsCount: number;
  lowStockProductsCount: number;
  isTerminalConnected: boolean;
}

const ALL_ADMIN_PERMISSIONS: RolePermissions = {
  accessTurnstile: true,
  manageClients: true,
  enrollBiometrics: true,
  posSales: true,
  manageInventory: true,
  cashRegister: true,
  viewReports: true,
  manageSettings: true,
  manageEmployees: true,
};

const TAB_PERMISSION_MAP: Record<string, keyof RolePermissions> = {
  dashboard: 'viewReports',
  access: 'accessTurnstile',
  pos: 'posSales',
  clients: 'manageClients',
  catalog: 'manageInventory',
  inventory: 'manageInventory',
  incomes: 'viewReports',
  expenses: 'cashRegister',
  cash: 'cashRegister',
  config_terminal_design: 'manageSettings',
  config_catalogs: 'manageSettings',
  config_gym_tickets: 'manageSettings',
  config_biometrics: 'manageSettings',
  config_roles: 'manageSettings',
  config_employees: 'manageEmployees',
  config_sync: 'manageSettings',
};

const ORDERED_APP_TABS = [
  'dashboard',
  'pos',
  'clients',
  'access',
  'cash',
  'catalog',
  'inventory',
  'incomes',
  'expenses',
  'config_terminal_design',
  'config_catalogs',
  'config_gym_tickets',
  'config_biometrics',
  'config_employees',
  'config_roles',
  'config_sync',
];

const MODULE_TAB_ID = `TAB_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
let hasAnnouncedTabOpen = false;

const GymContext = createContext<GymContextType | undefined>(undefined);

export function isGymIncomeSale(s: any): boolean {
  if (!s) return false;
  return resolveSaleType(s) !== 'store';
}

export function normalizeSaleRecord(raw: any): Sale {
  const total = Number(raw?.total ?? raw?.amountPaid ?? 0);
  const id = raw?.id || `SALE-${Date.now()}`;
  const saleType = resolveSaleType(raw);
  const defaultTitle = raw?.planName || (saleType === 'visit' ? 'Pase de Visita' : 'Cobro de acceso');
  const rawItems = Array.isArray(raw?.items) && raw.items.length > 0 ? raw.items : null;
  const items = rawItems
    ? rawItems.map((it: any) => {
        const unitPrice = Number(it?.unitPrice ?? it?.price ?? total);
        const qty = Number(it?.quantity ?? 1);
        const prodName = it?.product?.name || it?.name || defaultTitle;
        return {
          product: it?.product && it.product.name
            ? it.product
            : {
                id: it?.id || (saleType === 'visit' ? 'ITEM_VISIT_PASS' : 'ITEM_GYM_COLLECTION'),
                name: prodName,
                brand: 'LEGENDS GYM',
                category: 'gear' as const,
                price: unitPrice,
                costPrice: 0,
                stock: 999,
                minStock: 0,
              },
          quantity: qty,
          unitPrice,
          subtotal: Number(it?.subtotal ?? it?.total ?? unitPrice * qty),
        };
      })
    : [{
        product: {
          id: saleType === 'visit' ? 'ITEM_VISIT_PASS' : 'ITEM_GYM_COLLECTION',
          name: defaultTitle,
          brand: 'LEGENDS GYM',
          category: 'gear' as const,
          price: total,
          costPrice: 0,
          stock: 999,
          minStock: 0,
        },
        quantity: 1,
        unitPrice: total,
        subtotal: total,
      }];

  return {
    ...raw,
    id,
    folio: raw?.folio || (saleType === 'visit' ? `VIS-${id.slice(-4)}` : id),
    timestamp: raw?.timestamp || new Date().toISOString(),
    clientName: raw?.clientName || 'Visitante del Día',
    items,
    subtotal: Number(raw?.subtotal ?? total),
    tax: Number(raw?.tax ?? 0),
    total,
    paymentMethod: (raw?.paymentMethod || 'cash') as PaymentMethod,
    amountPaid: Number(raw?.amountPaid ?? total),
    changeGiven: Number(raw?.changeGiven ?? 0),
    cashierName: raw?.cashierName || raw?.authorizedBy || 'Recepción (RP)',
    cashierRole: (raw?.cashierRole || 'admin') as UserRole,
    saleType,
    planName: raw?.planName || (saleType === 'visit' ? 'Pase de Visita' : undefined),
  };
}

function applyBucketCashToSession(
  prev: CashRegisterSession,
  amount: number,
  paymentMethod: PaymentMethod,
  bucket: 'membership' | 'visit'
): CashRegisterSession {
  if (!prev || prev.status !== 'open' || amount <= 0) return prev;
  const nowIso = new Date().toISOString();
  if (bucket === 'visit') {
    return {
      ...prev,
      totalVisitsCash: paymentMethod === 'cash' ? (prev.totalVisitsCash || 0) + amount : (prev.totalVisitsCash || 0),
      totalVisitsCard: paymentMethod === 'card' ? (prev.totalVisitsCard || 0) + amount : (prev.totalVisitsCard || 0),
      totalVisitsTransfer: paymentMethod === 'transfer' ? (prev.totalVisitsTransfer || 0) + amount : (prev.totalVisitsTransfer || 0),
      expectedCash: paymentMethod === 'cash' ? (prev.expectedCash || 0) + amount : (prev.expectedCash || 0),
      updatedAt: nowIso,
    } as CashRegisterSession & { updatedAt?: string };
  }
  return {
    ...prev,
    totalMembershipsCash: paymentMethod === 'cash' ? (prev.totalMembershipsCash || 0) + amount : (prev.totalMembershipsCash || 0),
    totalMembershipsCard: paymentMethod === 'card' ? (prev.totalMembershipsCard || 0) + amount : (prev.totalMembershipsCard || 0),
    totalMembershipsTransfer: paymentMethod === 'transfer' ? (prev.totalMembershipsTransfer || 0) + amount : (prev.totalMembershipsTransfer || 0),
    expectedCash: paymentMethod === 'cash' ? (prev.expectedCash || 0) + amount : (prev.expectedCash || 0),
    updatedAt: nowIso,
  } as CashRegisterSession & { updatedAt?: string };
}

function applyMembershipCashToSession(
  prev: CashRegisterSession,
  amount: number,
  paymentMethod: PaymentMethod
): CashRegisterSession {
  return applyBucketCashToSession(prev, amount, paymentMethod, 'membership');
}

function applyVisitCashToSession(
  prev: CashRegisterSession,
  amount: number,
  paymentMethod: PaymentMethod
): CashRegisterSession {
  return applyBucketCashToSession(prev, amount, paymentMethod, 'visit');
}

export const GymProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => storage.getActiveRole());
  const [members, setMembers] = useState<Client[]>(() => storage.getMembers());
  const membersRef = useRef<Client[]>(members);
  membersRef.current = members;
  const [products, setProducts] = useState<Product[]>(() => storage.getProducts());
  const [sales, setSales] = useState<Sale[]>(() => storage.getSales().map(normalizeSaleRecord));
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>(() => storage.getAccessLogs());
  const [cashSession, setCashSession] = useState<CashRegisterSession>(() => storage.getCashSession());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(() => storage.getEmployees());
  const employeesRef = useRef<Employee[]>(employees);
  employeesRef.current = employees;
  const [roles, setRoles] = useState<RoleDefinition[]>(() => storage.getRoles());
  const rolesRef = useRef<RoleDefinition[]>(roles);
  rolesRef.current = roles;
  const [gymSettings, setGymSettings] = useState<GymSettings>(() => storage.getSettings());
  const [terminalDesign, setTerminalDesign] = useState<TerminalEntryDesignConfig>(() => storage.getTerminalDesign());
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

  const [currentUser, setCurrentUserState] = useState<Employee | null>(() => {
    // Start with clean login screen on ERP entry so user can choose their profile
    return storage.getCurrentUser();
  });
  const currentUserRef = useRef<Employee | null>(currentUser);
  currentUserRef.current = currentUser;
  const runtimeTabIdRef = useRef<string>(`TAB_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  const [securityAlert, setSecurityAlertState] = useState<string | null>(() => storage.getSecurityAlert());
  const [securityAuditLogs, setSecurityAuditLogs] = useState<SecurityAuditEvent[]>(() => storage.getSecurityAuditLogs());
  const isAuthenticated = currentUser !== null;

  // Enforce real employee role whenever logged-in user is not admin (only admins may preview other roles)
  const effectiveRole: UserRole =
    currentUser && currentUser.role !== 'admin' ? currentUser.role : currentRole;
  const isAdmin = effectiveRole === 'admin' && currentUser?.role === 'admin';

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentRole !== currentUser.role) {
      setCurrentRoleState(currentUser.role);
      storage.saveActiveRole(currentUser.role);
    }
  }, [currentUser, currentRole]);

  const activePermissions: RolePermissions = useMemo(() => {
    if (effectiveRole === 'admin') {
      return ALL_ADMIN_PERMISSIONS;
    }
    const roleDef =
      roles.find((r) => r.id === effectiveRole) ||
      INITIAL_ROLES.find((r) => r.id === effectiveRole);
    return roleDef ? roleDef.permissions : ALL_ADMIN_PERMISSIONS;
  }, [effectiveRole, roles]);

  const canAccessTab = useCallback(
    (tabId: string): boolean => {
      if (effectiveRole === 'admin') return true;
      const permKey = TAB_PERMISSION_MAP[tabId];
      return permKey ? Boolean(activePermissions[permKey]) : false;
    },
    [effectiveRole, activePermissions]
  );

  const firstAllowedTab: string = useMemo(() => {
    for (const tab of ORDERED_APP_TABS) {
      if (canAccessTab(tab)) return tab;
    }
    return 'none';
  }, [canAccessTab]);

  const [isTerminalConnected, setIsTerminalConnected] = useState<boolean>(false);
  const [pendingVisitRequests, setPendingVisitRequests] = useState<Array<{ id: string; clientName: string; cost: number; timestamp: number }>>([]);
  const [pendingRegistrationRequests, setPendingRegistrationRequests] = useState<Array<{ id: string; memberData: any; paymentMethod: PaymentMethod; timestamp: number }>>([]);
  const notifiedReqIdsRef = useRef<Set<string>>(new Set());
  const resolvedVisitIdsRef = useRef<Set<string>>(new Set());
  const resolvedRegIdsRef = useRef<Set<string>>(new Set());

  const upsertRequestNotification = useCallback((
    kind: 'registration' | 'visit',
    req: { id: string; memberData?: any; clientName?: string; cost?: number; paymentMethod?: PaymentMethod; timestamp?: number }
  ) => {
    if (!req || !req.id) return;
    const isReg = kind === 'registration';
    if (isReg && resolvedRegIdsRef.current.has(req.id)) return;
    if (!isReg && resolvedVisitIdsRef.current.has(req.id)) return;
    const notifId = isReg ? `NOTIF-REG-${req.id}` : `NOTIF-VIS-${req.id}`;
    const m = req.memberData || {};
    const groupCompanions: Array<{
      fullName: string;
      gender?: 'male' | 'female';
      birthDate?: string;
      phone?: string;
      biometricEnrolled?: boolean;
      selectedFinger?: string;
    }> =
      isReg && Array.isArray(m.groupMembers)
        ? m.groupMembers
            .filter((gm: any) => gm && gm.fullName && gm.fullName.trim())
            .map((gm: any) => ({
              fullName: gm.fullName.trim(),
              gender: gm.gender,
              birthDate: gm.birthDate,
              phone: gm.phone,
              biometricEnrolled: Boolean(gm.biometricEnrolled),
              selectedFinger: gm.selectedFinger || 'Índice Derecho',
            }))
        : [];
    const primaryName = isReg
      ? (m.fullName || 'Nuevo Socio').trim()
      : (req.clientName || 'Visitante del Día').trim();
    const clientName = groupCompanions.length > 0
      ? `${primaryName} + ${groupCompanions.length} acompañante${groupCompanions.length > 1 ? 's' : ''}`
      : primaryName;
    const planName = isReg ? (m.planName || 'Mensualidad Estándar') : 'Pase de Visita por 1 Día';
    const planPrice = isReg ? Number(m.planPrice || 420) : Number(req.cost || 50);
    const primaryBioEnrolled = Boolean(m.biometricEnrolled);
    const groupRoster = groupCompanions.length > 0
      ? [
          {
            fullName: primaryName,
            gender: m.gender,
            birthDate: m.birthDate,
            phone: m.phone,
            biometricEnrolled: primaryBioEnrolled,
            selectedFinger: m.selectedFinger || 'Índice Derecho',
          },
          ...groupCompanions,
        ]
      : undefined;
    const enrolledRosterCount = groupRoster
      ? groupRoster.filter((p) => Boolean(p.biometricEnrolled)).length
      : primaryBioEnrolled
        ? 1
        : 0;
    const allBiometricsReady = groupRoster
      ? enrolledRosterCount === groupRoster.length
      : primaryBioEnrolled;
    const resolvedPaymentMethod: PaymentMethod = (req.paymentMethod || m.paymentMethod || 'cash') as PaymentMethod;
    const regDetails = isReg
      ? {
          phone: (m.phone || '').trim() || undefined,
          email: (m.rawEmail ?? m.email ?? '').trim() || undefined,
          birthDate: m.birthDate || undefined,
          age: m.age || (m.birthDate ? calculateAgeFromBirthDate(m.birthDate) : null) || undefined,
          gender: m.gender || undefined,
          biometricEnrolled: primaryBioEnrolled,
          selectedFinger: m.selectedFinger || undefined,
        }
      : undefined;
    const isFirstNotice = !notifiedReqIdsRef.current.has(notifId);
    notifiedReqIdsRef.current.add(notifId);

    setNotifications(prev => {
      const title = isReg
        ? groupRoster
          ? allBiometricsReady
            ? `Huellas registradas (${groupRoster.length}/${groupRoster.length}) · Autorizar grupo`
            : `Registro grupal (${groupRoster.length} personas)`
          : primaryBioEnrolled
            ? 'Huella registrada · Autorizar cliente'
            : 'Registro completado'
        : 'Visita esperando confirmación';
      const bioSummary = allBiometricsReady
        ? groupRoster
          ? `Huellas registradas (${groupRoster.length}/${groupRoster.length})`
          : 'Huella registrada'
        : 'Registro listo';
      const message = isReg
        ? `${clientName} (${bioSummary}) • ${planName} ($${planPrice.toLocaleString('es-MX')} MXN). Requiere autorización en RP.`
        : `${clientName} solicitó un pase de visita ($${planPrice.toLocaleString('es-MX')} MXN) y está esperando confirmación. Dale entrada para completar el paso final.`;
      const existing = prev.find(n => n.id === notifId);
      if (existing) {
        if (
          isReg &&
          !existing.completed &&
          (existing.title !== title ||
            existing.message !== message ||
            existing.paymentMethod !== resolvedPaymentMethod ||
            Boolean(existing.registrationDetails?.biometricEnrolled) !== Boolean(regDetails?.biometricEnrolled))
        ) {
          return prev.map(n =>
            n.id === notifId
              ? {
                  ...n,
                  title,
                  message,
                  clientName,
                  planName,
                  planPrice,
                  paymentMethod: resolvedPaymentMethod,
                  registrationDetails: regDetails,
                  groupMembers: groupRoster
                }
              : n
          );
        }
        return prev;
      }
      const newNotif: SystemNotification = {
        id: notifId,
        title,
        message,
        timestamp: new Date(req.timestamp || Date.now()).toISOString(),
        type: 'warning',
        read: false,
        requestId: req.id,
        requestKind: kind,
        clientName,
        planName,
        planPrice,
        paymentMethod: resolvedPaymentMethod,
        completed: false,
        registrationDetails: regDetails,
        groupMembers: groupRoster
      };
      return [newNotif, ...prev];
    });

    if (isFirstNotice) {
      try { sounds.playNotification(); } catch {}
    }
  }, []);

  const markRequestNotificationDone = useCallback((
    kind: 'registration' | 'visit',
    requestId: string,
    status: 'authorized' | 'rejected'
  ) => {
    if (!requestId) return;
    const notifId = kind === 'registration' ? `NOTIF-REG-${requestId}` : `NOTIF-VIS-${requestId}`;
    if (status === 'rejected') {
      setNotifications(prev => prev.filter(n => n.id !== notifId));
      return;
    }
    setNotifications(prev =>
      prev.map(n => {
        if (n.id !== notifId) return n;
        const groupNames = Array.isArray(n.groupMembers) && n.groupMembers.length > 1
          ? n.groupMembers.map(g => g.fullName).join(', ')
          : '';
        const name = groupNames || n.clientName || (kind === 'registration' ? 'El socio' : 'El visitante');
        const plan = n.planName || (kind === 'registration' ? 'Membresía' : 'Pase de Visita');
        const price = Number(n.planPrice || 0);
        return {
          ...n,
          title: 'Pago cobrado y entrada autorizada',
          message: `${name} completó el paso final (${plan}${price > 0 ? ` • $${price.toLocaleString('es-MX')} MXN` : ''}) y ya tiene entrada.`,
          type: 'success',
          read: true,
          completed: true
        };
      })
    );
  }, []);

  useEffect(() => {
    fetchPendingVisitRequestsFromServer().then(reqs => {
      if (Array.isArray(reqs) && reqs.length > 0) {
        const activeReqs = reqs.filter(r => r && r.id && !resolvedVisitIdsRef.current.has(r.id));
        if (activeReqs.length > 0) {
          setPendingVisitRequests(activeReqs);
          activeReqs.forEach(r => upsertRequestNotification('visit', r));
        }
      }
    }).catch(() => {});
    fetchPendingRegistrationRequestsFromServer().then(reqs => {
      if (Array.isArray(reqs) && reqs.length > 0) {
        const activeReqs = reqs.filter(r => r && r.id && !resolvedRegIdsRef.current.has(r.id));
        if (activeReqs.length > 0) {
          setPendingRegistrationRequests(activeReqs);
          activeReqs.forEach(r => upsertRequestNotification('registration', r));
        }
      }
    }).catch(() => {});
  }, [upsertRequestNotification]);

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
  useEffect(() => {
    employeesRef.current = employees;
    storage.saveEmployees(employees);
  }, [employees]);
  useEffect(() => {
    rolesRef.current = roles;
    storage.saveRoles(roles);
  }, [roles]);
  useEffect(() => { storage.saveSettings(gymSettings); }, [gymSettings]);
  useEffect(() => { storage.saveTerminalDesign(terminalDesign); }, [terminalDesign]);
  useEffect(() => { storage.saveCatalogPlans(catalogPlans); }, [catalogPlans]);
  useEffect(() => { storage.saveBranches(branches); }, [branches]);
  useEffect(() => { storage.saveExpenses(expenses); }, [expenses]);
  useEffect(() => { storage.saveNotifications(notifications); }, [notifications]);

  // Helper to safely merge member lists without losing local or remote additions
  const mergeMemberLists = useCallback((currentList: Client[], incomingList: Client[]): Client[] => {
    const deletedIds = storage.getDeletedMemberIds();
    const DEMO_NAMES = new Set([
      'carlos mendoza',
      'valeria rÃ­os gÃ³mez',
      'valeria rios gomez',
      'valeria rÃ­os',
      'valeria rios',
      'alejandro soto vega',
      'alejandro soto',
      'sofÃ­a domÃ­nguez',
      'sofia dominguez',
      'mateo guerrero',
      'camila navarro',
      'ricardo vargas luna',
      'ricardo vargas',
      'juan solÃ­s',
      'juan solis'
    ]);
    const isDemo = (m: Client) => DEMO_NAMES.has((m.fullName || '').toLowerCase().trim());

    const map = new Map<string, Client>();
    for (const m of currentList) {
      if (m && m.id && !deletedIds.includes(m.id) && !isDemo(m)) {
        map.set(m.id, m);
      }
    }
    for (const m of incomingList) {
      if (m && m.id && !deletedIds.includes(m.id) && !isDemo(m)) {
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

  // Safely merge employee lists using updatedAt so stale server seed records never overwrite local password/profile edits
  const mergeEmployeeLists = useCallback((currentList: Employee[], incomingList: Employee[]): Employee[] => {
    const deletedIds = storage.getDeletedEmployeeIds();
    const map = new Map<string, Employee>();
    for (const emp of sanitizeEmployees(currentList, deletedIds)) {
      if (emp && emp.id) {
        map.set(emp.id, emp);
      }
    }
    for (const incoming of sanitizeEmployees(incomingList, deletedIds)) {
      if (!incoming || !incoming.id) continue;
      const existing = map.get(incoming.id);
      if (!existing) {
        map.set(incoming.id, incoming);
        continue;
      }
      const localTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const remoteTime = incoming.updatedAt ? new Date(incoming.updatedAt).getTime() : 0;
      if (remoteTime > localTime || (localTime === 0 && remoteTime === 0)) {
        map.set(incoming.id, {
          ...existing,
          ...incoming,
          password: incoming.password || existing.password,
          pin: incoming.pin || existing.pin,
        });
      }
    }
    return Array.from(map.values());
  }, []);

  // Generic helper to merge any entity list by id
  const mergeById = useCallback(<T extends { id: string }>(currentList: T[], incomingList: T[], deletedIds: string[] = []): T[] => {
    const map = new Map<string, T>();
    for (const item of currentList) {
      if (item && item.id && !deletedIds.includes(item.id)) {
        map.set(item.id, item);
      }
    }
    for (const item of incomingList) {
      if (item && item.id && !deletedIds.includes(item.id)) {
        const existing = map.get(item.id);
        map.set(item.id, { ...(existing || {}), ...item });
      }
    }
    return Array.from(map.values());
  }, []);

  const serverVersionRef = useRef<number>(0);

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
    const applyRequestSyncMessage = (msg: any): boolean => {
      if (msg.type === 'VISIT_PASS_REQUESTED' && msg.visitRequest) {
        if (resolvedVisitIdsRef.current.has(msg.visitRequest.id)) return true;
        setPendingVisitRequests(prev => {
          if (prev.some(r => r.id === msg.visitRequest!.id)) return prev;
          return [msg.visitRequest!, ...prev];
        });
        upsertRequestNotification('visit', msg.visitRequest);
        return true;
      }
      if (msg.type === 'VISIT_PASS_AUTHORIZED' && (msg.visitRequest || msg.visitRequestId)) {
        const visId = msg.visitRequest?.id || msg.visitRequestId;
        const alreadyResolved = resolvedVisitIdsRef.current.has(visId);
        resolvedVisitIdsRef.current.add(visId);
        setPendingVisitRequests(prev => prev.filter(r => r.id !== visId));
        markRequestNotificationDone('visit', visId, 'authorized');
        if (!alreadyResolved && msg.sale) {
          const normalized = normalizeSaleRecord(msg.sale);
          setSales(prev => {
            if (prev.some(s => s.id === normalized.id)) return prev;
            const next = [normalized, ...prev];
            storage.saveSales(next);
            return next;
          });
        }
        if (!alreadyResolved && msg.cashSession) {
          setCashSession(msg.cashSession);
          storage.saveCashSession(msg.cashSession);
        }
        return true;
      }
      if (msg.type === 'VISIT_PASS_REJECTED') {
        const rejVisId = msg.visitRequest?.id || msg.visitRequestId;
        if (rejVisId) {
          resolvedVisitIdsRef.current.add(rejVisId);
          setPendingVisitRequests(prev => prev.filter(r => r.id !== rejVisId));
          markRequestNotificationDone('visit', rejVisId, 'rejected');
        }
        return true;
      }
      if (msg.type === 'MEMBER_REGISTRATION_REQUESTED' && msg.registrationRequest) {
        if (resolvedRegIdsRef.current.has(msg.registrationRequest.id)) return true;
        setPendingRegistrationRequests(prev => {
          if (prev.some(r => r.id === msg.registrationRequest!.id)) return prev;
          return [msg.registrationRequest!, ...prev];
        });
        upsertRequestNotification('registration', msg.registrationRequest);
        return true;
      }
      if (msg.type === 'MEMBER_REGISTRATION_AUTHORIZED' && (msg.registrationRequest || msg.registrationRequestId)) {
        const regId = msg.registrationRequest?.id || msg.registrationRequestId;
        const alreadyResolved = resolvedRegIdsRef.current.has(regId);
        resolvedRegIdsRef.current.add(regId);
        setPendingRegistrationRequests(prev => prev.filter(r => r.id !== regId));
        markRequestNotificationDone('registration', regId, 'authorized');
        const incomingMembers: Client[] = Array.isArray(msg.members) && msg.members.length > 0
          ? msg.members
          : (msg.member ? [msg.member] : []);
        if (!alreadyResolved && incomingMembers.length > 0) {
          setMembers(prev => {
            const incomingIds = new Set(incomingMembers.map(m => m.id));
            const next = [...incomingMembers, ...prev.filter(m => !incomingIds.has(m.id))];
            membersRef.current = next;
            return next;
          });
        }
        if (!alreadyResolved && msg.sale) {
          const normalized = normalizeSaleRecord(msg.sale);
          setSales(prev => {
            if (prev.some(s => s.id === normalized.id)) return prev;
            const next = [normalized, ...prev];
            storage.saveSales(next);
            return next;
          });
        }
        if (!alreadyResolved && msg.cashSession) {
          setCashSession(msg.cashSession);
          storage.saveCashSession(msg.cashSession);
        }
        return true;
      }
      if (msg.type === 'MEMBER_REGISTRATION_REJECTED') {
        const rejId = msg.registrationRequest?.id || msg.registrationRequestId;
        if (rejId) {
          resolvedRegIdsRef.current.add(rejId);
          setPendingRegistrationRequests(prev => prev.filter(r => r.id !== rejId));
          markRequestNotificationDone('registration', rejId, 'rejected');
        }
        return true;
      }
      return false;
    };

    // 1. Local BroadcastChannel listener (inter-tab communication)
    const unsubscribeLocal = subscribeToLocalSync((msg) => {
      if (applyRequestSyncMessage(msg)) return;
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
      } else if (msg.type === 'MEMBERS_CLEARED') {
        storage.clearMembers();
        setMembers([]);
        membersRef.current = [];
        setAccessLogs([]);
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
        const normalized = normalizeSaleRecord(msg.sale);
        setSales(prev => {
          const exists = prev.some(s => s.id === normalized.id);
          const next = exists
            ? prev.map(s => (s.id === normalized.id ? normalized : s))
            : [normalized, ...prev];
          storage.saveSales(next);
          return next;
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
      } else if (msg.type === 'ROLES_UPDATED' && Array.isArray(msg.roles)) {
        const cleanedRoles = sanitizeRoles(msg.roles).map((r) =>
          r.id === 'admin' ? { ...r, permissions: ALL_ADMIN_PERMISSIONS } : r
        );
        rolesRef.current = cleanedRoles;
        storage.saveRoles(cleanedRoles);
        setRoles(cleanedRoles);
      }
    });

    // 2. Remote Server-Sent Events (SSE) listener for instantaneous push from Desktop Terminal
    const unsubscribeRemote = subscribeToRemoteSync((msg) => {
      setIsTerminalConnected(true);
      if (applyRequestSyncMessage(msg)) return;
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
      } else if (msg.type === 'TERMINAL_DESIGN_UPDATED' && msg.terminalDesign) {
        const mergedDesign = mergeWithDefaultTerminalDesign(msg.terminalDesign);
        storage.saveTerminalDesign(mergedDesign);
        setTerminalDesign(mergedDesign);
      } else if (msg.type === 'SALE_ADDED' && msg.sale) {
        const normalized = normalizeSaleRecord(msg.sale);
        setSales(prev => {
          const exists = prev.some(s => s.id === normalized.id);
          const next = exists
            ? prev.map(s => (s.id === normalized.id ? normalized : s))
            : [normalized, ...prev];
          storage.saveSales(next);
          return next;
        });
      } else if (msg.type === 'CASH_SESSION_UPDATED' && msg.cashSession) {
        setCashSession(msg.cashSession);
      } else if (msg.type === 'ROLES_UPDATED' && Array.isArray(msg.roles)) {
        const cleanedRoles = sanitizeRoles(msg.roles).map((r) =>
          r.id === 'admin' ? { ...r, permissions: ALL_ADMIN_PERMISSIONS } : r
        );
        rolesRef.current = cleanedRoles;
        storage.saveRoles(cleanedRoles);
        setRoles(cleanedRoles);
      } else if (msg.type === 'DATABASE_UPDATED') {
        executeSync(true);
      }
    });

    // 3. Initial server connection & healthcheck + bidirectional full database sync
    const syncServerData = async () => {
      try {
        const status = await checkServerHealth();
        setIsTerminalConnected(status.online);
        if (status.online) {
          const res = await fetchFullDatabaseFromServer();
          if (res.success && res.database) {
            serverVersionRef.current = res.version;
            const db = res.database;
            if (Array.isArray(db.deletedMemberIds)) {
              db.deletedMemberIds.forEach((id) => storage.addDeletedMemberId(id));
            }
            if (Array.isArray(db.deletedEmployeeIds)) {
              db.deletedEmployeeIds.forEach((id) => storage.addDeletedEmployeeId(id));
            }
            if (Array.isArray(db.members) && db.members.length > 0) {
              const merged = mergeMemberLists(membersRef.current, db.members);
              membersRef.current = merged;
              setMembers(merged);
            }
            if (Array.isArray(db.products) && db.products.length > 0) {
              setProducts(prev => {
                const merged = mergeById(prev, db.products!);
                storage.saveProducts(merged);
                return merged;
              });
            }
            if (Array.isArray(db.sales) && db.sales.length > 0) {
              setSales(prev => {
                const merged = normalizeSaleList(mergeById(prev, normalizeSaleList(db.sales)));
                storage.saveSales(merged);
                return merged;
              });
            }
            if (Array.isArray(db.expenses) && db.expenses.length > 0) {
              setExpenses(prev => {
                const merged = mergeById(prev, db.expenses!);
                storage.saveExpenses(merged);
                return merged;
              });
            }
            if (db.cashSession) {
              setCashSession(prev => {
                const prevTime = new Date((prev as any).updatedAt || prev.openedAt || 0).getTime();
                const serverTime = new Date((db.cashSession as any).updatedAt || db.cashSession!.openedAt || 0).getTime();
                if (serverTime >= prevTime) {
                  storage.saveCashSession(db.cashSession!);
                  return db.cashSession!;
                }
                return prev;
              });
            }
            if (Array.isArray(db.employees) && db.employees.length > 0) {
              const mergedEmployees = mergeEmployeeLists(employeesRef.current, db.employees);
              employeesRef.current = mergedEmployees;
              storage.saveEmployees(mergedEmployees);
              setEmployees(mergedEmployees);
            }
            if (Array.isArray(db.roles) && db.roles.length > 0) {
              const cleanedRoles = sanitizeRoles(db.roles).map((r) =>
                r.id === 'admin' ? { ...r, permissions: ALL_ADMIN_PERMISSIONS } : r
              );
              rolesRef.current = cleanedRoles;
              storage.saveRoles(cleanedRoles);
              setRoles(cleanedRoles);
            }
            if (db.settings) {
              setGymSettings(prev => {
                const merged = { ...prev, ...db.settings };
                storage.saveSettings(merged);
                return merged;
              });
            }
            let syncedTerminalDesign = storage.getTerminalDesign();
            if (db.terminalDesign) {
              const incDesign = mergeWithDefaultTerminalDesign(db.terminalDesign);
              const curTs = new Date(syncedTerminalDesign.updatedAt || 0).getTime();
              const incTs = new Date(incDesign.updatedAt || 0).getTime();
              if (incTs >= curTs) {
                syncedTerminalDesign = incDesign;
                storage.saveTerminalDesign(incDesign);
                setTerminalDesign(incDesign);
              }
            }
            let syncedCatalogPlans = storage.getCatalogPlans();
            if (Array.isArray(db.catalogPlans) && db.catalogPlans.length > 0) {
              const validIncoming = filterLegacyCatalogPlans(db.catalogPlans);
              if (validIncoming.length > 0) {
                syncedCatalogPlans = mergeById(syncedCatalogPlans, validIncoming);
                storage.saveCatalogPlans(syncedCatalogPlans);
                setCatalogPlans(syncedCatalogPlans);
              }
            }
            if (Array.isArray(db.accessLogs) && db.accessLogs.length > 0) {
              db.accessLogs.forEach(l => ingestIncomingAccessLog(l));
            }

            // Sync back full local database to ensure server has any local additions
            pushFullDatabaseToServer({
              members: membersRef.current,
              products: storage.getProducts(),
              sales: storage.getSales(),
              expenses: storage.getExpenses(),
              cashSession: storage.getCashSession(),
              employees: employeesRef.current,
              roles: rolesRef.current,
              settings: storage.getSettings(),
              catalogPlans: syncedCatalogPlans,
              terminalDesign: syncedTerminalDesign,
              deletedMemberIds: storage.getDeletedMemberIds(),
              deletedEmployeeIds: storage.getDeletedEmployeeIds(),
            }).catch(() => {});
          } else {
            // First time seed: populate server with complete local database
            pushFullDatabaseToServer({
              members: membersRef.current,
              products: storage.getProducts(),
              sales: storage.getSales(),
              expenses: storage.getExpenses(),
              cashSession: storage.getCashSession(),
              employees: employeesRef.current,
              roles: rolesRef.current,
              settings: storage.getSettings(),
              catalogPlans: storage.getCatalogPlans(),
              terminalDesign: storage.getTerminalDesign(),
              deletedMemberIds: storage.getDeletedMemberIds(),
              deletedEmployeeIds: storage.getDeletedEmployeeIds(),
            }).catch(() => {});
          }
        }
      } catch {
        setIsTerminalConnected(false);
      }
    };

    syncServerData();

    // 4. Real-time background sync polling (every 2.5 seconds) for multi-computer linked profiles
    const executeSync = (force = false) => {
      const v = force ? 0 : serverVersionRef.current;
      fetchFullDatabaseFromServer(undefined, v).then(res => {
        if (res.success) {
          setIsTerminalConnected(true);
          if (res.database && (force || res.hasChanges || res.version !== serverVersionRef.current)) {
            serverVersionRef.current = res.version;
            const db = res.database;
            if (Array.isArray(db.deletedMemberIds)) {
              db.deletedMemberIds.forEach((id) => storage.addDeletedMemberId(id));
            }
            if (Array.isArray(db.deletedEmployeeIds)) {
              db.deletedEmployeeIds.forEach((id) => storage.addDeletedEmployeeId(id));
            }
            if (Array.isArray(db.members)) {
              setMembers(prev => {
                const next = mergeMemberLists(prev, db.members!);
                membersRef.current = next;
                storage.saveMembers(next);
                return next;
              });
            }
            if (Array.isArray(db.products) && db.products.length > 0) {
              setProducts(prev => {
                const next = mergeById(prev, db.products!);
                storage.saveProducts(next);
                return next;
              });
            }
            if (Array.isArray(db.sales) && db.sales.length > 0) {
              setSales(prev => {
                const next = normalizeSaleList(mergeById(prev, normalizeSaleList(db.sales)));
                storage.saveSales(next);
                return next;
              });
            }
            if (Array.isArray(db.expenses) && db.expenses.length > 0) {
              setExpenses(prev => {
                const next = mergeById(prev, db.expenses!);
                storage.saveExpenses(next);
                return next;
              });
            }
            if (db.cashSession) {
              setCashSession(prev => {
                const prevTime = new Date((prev as any).updatedAt || prev.openedAt || 0).getTime();
                const serverTime = new Date((db.cashSession as any).updatedAt || db.cashSession!.openedAt || 0).getTime();
                if (serverTime >= prevTime) {
                  storage.saveCashSession(db.cashSession!);
                  return db.cashSession!;
                }
                return prev;
              });
            }
            if (Array.isArray(db.employees) && db.employees.length > 0) {
              setEmployees(prev => {
                const next = mergeEmployeeLists(prev, db.employees!);
                employeesRef.current = next;
                storage.saveEmployees(next);
                return next;
              });
            }
            if (Array.isArray(db.roles) && db.roles.length > 0) {
              const cleanedRoles = sanitizeRoles(db.roles).map((r) =>
                r.id === 'admin' ? { ...r, permissions: ALL_ADMIN_PERMISSIONS } : r
              );
              rolesRef.current = cleanedRoles;
              storage.saveRoles(cleanedRoles);
              setRoles(cleanedRoles);
            }
            if (db.terminalDesign) {
              const incDesign = mergeWithDefaultTerminalDesign(db.terminalDesign);
              setTerminalDesign(prev => {
                const prevTs = new Date(prev.updatedAt || 0).getTime();
                const incTs = new Date(incDesign.updatedAt || 0).getTime();
                if (incTs > prevTs) {
                  storage.saveTerminalDesign(incDesign);
                  return incDesign;
                }
                return prev;
              });
            }
            if (Array.isArray(db.accessLogs) && db.accessLogs.length > 0) {
              db.accessLogs.forEach(l => ingestIncomingAccessLog(l));
            }
            const hasVisits = Array.isArray(db.pendingVisitRequests);
            const hasRegs = Array.isArray(db.pendingRegistrationRequests);
            const activeVisits = hasVisits
              ? db.pendingVisitRequests!.filter(r => r && r.id && !resolvedVisitIdsRef.current.has(r.id))
              : [];
            const activeRegs = hasRegs
              ? db.pendingRegistrationRequests!.filter(r => r && r.id && !resolvedRegIdsRef.current.has(r.id))
              : [];
            if (hasVisits) {
              setPendingVisitRequests(activeVisits);
              activeVisits.forEach(r => upsertRequestNotification('visit', r));
            }
            if (hasRegs) {
              setPendingRegistrationRequests(activeRegs);
              activeRegs.forEach(r => upsertRequestNotification('registration', r));
            }
            if (hasVisits || hasRegs) {
              const visitIds = hasVisits ? new Set(activeVisits.map(r => r.id)) : null;
              const regIds = hasRegs ? new Set(activeRegs.map(r => r.id)) : null;
              const nowMs = Date.now();
              setNotifications(prev =>
                prev.map(n => {
                  const ageMs = nowMs - new Date(n.timestamp).getTime();
                  if (!n.requestId || n.completed || ageMs <= 5000) return n;
                  const missingReg = n.requestKind === 'registration' && regIds && !regIds.has(n.requestId);
                  const missingVisit = n.requestKind === 'visit' && visitIds && !visitIds.has(n.requestId);
                  if (missingReg || missingVisit) {
                    return {
                      ...n,
                      title: 'Pago cobrado y entrada autorizada',
                      message: `${n.clientName || 'El cliente'} completó el paso final y recibió entrada.`,
                      type: 'success',
                      read: true,
                      completed: true
                    };
                  }
                  return n;
                })
              );
            }
          }
        }
      }).catch(() => {});
    };

    const pollInterval = setInterval(executeSync, 2500);

    // Instant sync on window focus / tab active (switching between computers)
    const onFocusSync = () => {
      executeSync(true);
    };
    window.addEventListener('focus', onFocusSync);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onFocusSync();
    });

    return () => {
      unsubscribeLocal();
      unsubscribeRemote();
      clearInterval(pollInterval);
      window.removeEventListener('focus', onFocusSync);
    };
  }, [ingestIncomingAccessLog, mergeMemberLists, mergeEmployeeLists, mergeById, upsertRequestNotification, markRequestNotificationDone]);

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

    const isDesktopAppEnv = typeof (window as any).electronAPI !== 'undefined' || window.location.protocol === 'file:';

    // Strip any unauthorized URL query/hash parameters on the main web ERP (preserve desktop query mode)
    if (!isDesktopAppEnv && (window.location.search || window.location.hash)) {
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

        const isDesktopApp = typeof (window as any).electronAPI !== 'undefined' || window.location.protocol === 'file:';
        if (!isDesktopApp && data.type === 'TAB_MOUNTED' && currentUserRef.current) {
          // Another tab was opened while this tab has an active session!
          const breachMsg =
            'âš ï¸ SesiÃ³n cerrada por seguridad: Se detectÃ³ que el enlace del sistema fue copiado o abierto en otra pestaÃ±a. Por protecciÃ³n de la terminal, la sesiÃ³n ha sido cerrada.';
          const activeUser = currentUserRef.current;
          storage.saveCurrentUser(null);
          storage.setSecurityAlert(breachMsg);
          storage.addSecurityAuditLog({
            type: 'MULTI_TAB_BREACH',
            userName: activeUser.fullName,
            role: activeUser.role,
            details: 'Cierre forzoso: Se abriÃ³ una pestaÃ±a secundaria mientras la sesiÃ³n estaba activa.'
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
            'âš ï¸ SesiÃ³n cerrada por seguridad: Se detectÃ³ actividad o apertura del enlace en otra pestaÃ±a.';
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
          'âš ï¸ SesiÃ³n finalizada: La sesiÃ³n fue cerrada por seguridad desde otra pestaÃ±a.';
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
          'ðŸš¨ Alerta de Seguridad: Se detectÃ³ manipulaciÃ³n de sesiÃ³n o pÃ©rdida de firma criptogrÃ¡fica.';
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

      if (clean === 'admin' || clean === '1234') {
        storage.addSecurityAuditLog({
          type: 'SUPERVISOR_AUTH',
          userName: currentUserRef.current?.fullName || 'Administrador General',
          role: 'admin',
          details: `Autorización de Supervisor aprobada${actionLabel ? `: ${actionLabel}` : '.'}`
        });
        setSecurityAuditLogs(storage.getSecurityAuditLogs());
        sounds.playCheckoutSuccess();
        return true;
      }

      const admins = employees.filter((e) => e.role === 'admin' && e.status === 'active');
      const matchedAdmin = admins.find(
        (adm) => verifySecret(clean, adm.password) || verifySecret(clean, adm.pin)
      );

      if (matchedAdmin) {
        storage.addSecurityAuditLog({
          type: 'SUPERVISOR_AUTH',
          userName: matchedAdmin.fullName,
          role: 'admin',
          details: `AutorizaciÃ³n de Supervisor aprobada${actionLabel ? `: ${actionLabel}` : '.'}`
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

  // Auth methods (24/7 unrestricted login + flexible identifier)
  const login = (
    identifier: string,
    passOrPin: string,
    _supervisorOverridePin?: string
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

    const cleanId = identifier.trim().toLowerCase().replace(/^@/, '');
    const cleanPass = passOrPin.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, message: 'Ingresa tu usuario / correo / cédula y tu contraseña o PIN.' };
    }

    // Direct instant login for master admin credentials only if admin account still uses default password
    if (cleanId === 'admin' && (cleanPass === 'admin' || cleanPass === '1234')) {
      let adminEmp = employees.find(
        (e) => (e.username?.toLowerCase() === 'admin' || e.id === 'EMP-000') && e.status === 'active'
      );
      if (!adminEmp) {
        adminEmp = INITIAL_EMPLOYEES.find((e) => e.username === 'admin') || INITIAL_EMPLOYEES[0];
      }
      const adminUsesDefault =
        !adminEmp?.password ||
        verifySecret('admin', adminEmp.password) ||
        verifySecret('1234', adminEmp.password);
      if (adminEmp && adminUsesDefault) {
        storage.resetLoginAttempts();
        storage.setSecurityAlert(null);
        setSecurityAlertState(null);
        storage.saveCurrentUser(adminEmp);
        currentUserRef.current = adminEmp;
        setCurrentUserState(adminEmp);
        setCurrentRoleState(adminEmp.role || 'admin');
        storage.saveActiveRole(adminEmp.role || 'admin');
        storage.addSecurityAuditLog({
          type: 'LOGIN_SUCCESS',
          userName: adminEmp.fullName,
          userIdentifier: adminEmp.email,
          role: adminEmp.role || 'admin',
          details: 'Acceso autorizado como Administrador General (admin/admin).'
        });
        setSecurityAuditLogs(storage.getSecurityAuditLogs());
        sounds.playCheckoutSuccess();
        return { success: true, user: adminEmp };
      }
    }

    // Flexible identifier matching (email, prefix, username, cedula, full name, first name, role title)
    const found = employees.find((emp) => {
      if (emp.status !== 'active') return false;
      const email = emp.email.toLowerCase();
      const emailPrefix = email.split('@')[0];
      const username = (emp.username || '').toLowerCase();
      const doc = (emp.documentId || '').toLowerCase();
      const fullName = emp.fullName.toLowerCase();
      const firstName = fullName.split(' ')[0];
      const role = emp.role.toLowerCase();

      return (
        username === cleanId ||
        email === cleanId ||
        emailPrefix === cleanId ||
        doc === cleanId ||
        fullName === cleanId ||
        firstName === cleanId ||
        emp.id.toLowerCase() === cleanId ||
        (cleanId === 'admin' && role === 'admin') ||
        (cleanId === 'recepcion' && role === 'receptionist') ||
        (cleanId === 'caja' && role === 'receptionist')
      );
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

    const initial = INITIAL_EMPLOYEES.find(
      (ie) => ie.id === found.id || ie.email.toLowerCase() === found.email.toLowerCase() || (found.username && ie.username === found.username)
    );
    const hasStoredPassword = Boolean(found.password && found.password.trim() !== '');
    const hasStoredPin = Boolean(found.pin && found.pin.trim() !== '');

    const isValid =
      verifySecret(cleanPass, found.password) ||
      verifySecret(cleanPass, found.pin) ||
      (!hasStoredPassword && Boolean(initial?.password) && cleanPass === initial!.password) ||
      (!hasStoredPin && Boolean(initial?.pin) && cleanPass === initial!.pin);

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
      details: 'Acceso autorizado con credenciales y firma criptográfica verificadas (operación 24/7).'
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
        details: 'Cierre de sesiÃ³n manual realizado por el operador.'
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
    // Bloquear escalaciÃ³n de privilegios: solo un Administrador real puede simular otros roles
    if (currentUserRef.current && currentUserRef.current.role !== 'admin' && role !== currentUserRef.current.role) {
      return;
    }
    setCurrentRoleState(role);
    storage.saveActiveRole(role);
  };

  const updateRolePermissions = (roleId: UserRole, permissions: Partial<RolePermissions>) => {
    // El Administrador siempre conserva acceso total por seguridad y consistencia del sistema
    if (roleId === 'admin') return;

    const next = rolesRef.current.map((r) =>
      r.id === roleId
        ? {
            ...r,
            permissions: { ...r.permissions, ...permissions },
          }
        : r
    );
    rolesRef.current = next;
    storage.saveRoles(next);
    setRoles(next);
    broadcastLocalSync({ type: 'ROLES_UPDATED', roles: next });
    pushEntityChangeToServer('roles', 'update', next).then((res) => {
      if (res.version && res.version > serverVersionRef.current) {
        serverVersionRef.current = res.version;
      }
    }).catch(() => {});
  };

  // Member Management
  const addMember = (
    clientData: Partial<Client>,
    initialPaymentMethod: PaymentMethod = 'cash',
    options?: { skipSale?: boolean; groupSummaryNote?: string }
  ): Client => {
    const maxIdNum = membersRef.current.reduce((max, m) => {
      const match = m.id.match(/^MEM-(\d+)$/i);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    const newId = clientData.id || `MEM-${String(maxIdNum + 1).padStart(3, '0')}`;
    const newMember: Client = {
      id: newId,
      fullName: clientData.fullName || 'Nuevo Socio',
      gender: clientData.gender || detectGender(clientData.fullName || 'Nuevo Socio'),
      documentId: clientData.documentId || `${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: clientData.email || `${newId.toLowerCase()}@legendsgym.com`,
      phone: clientData.phone || '+52 55 0000 0000',
      avatarUrl: getGymAvatar(clientData.fullName || 'Nuevo Socio', clientData.avatarUrl, clientData.gender),
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
      membership: (() => {
        const initial = clientData.membership || {
          planType: 'monthly' as const,
          planName: 'Mensualidad Estándar',
          ...calculateMembershipDates(30),
          price: 850,
          status: 'active' as const,
        };
        const stInfo = getMembershipStatus(initial);
        return {
          ...initial,
          daysRemaining: stInfo.daysRemaining,
          status: initial.status === 'frozen' ? ('frozen' as const) : stInfo.status,
        };
      })(),
      checkInsCount: 0,
      totalSpentInStore: 0,
      createdAt: getLocalDateString(),
    };

    const planPrice = newMember.membership.price;

    // Generate initial membership sale if price > 0 and not skipped (e.g. secondary members of a group package)
    if (!options?.skipSale && planPrice > 0 && newMember.membership.status === 'active') {
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
        notes: options?.groupSummaryNote || `Inscripción inicial: ${newMember.membership.planName}`,
        saleType: 'membership',
        planName: newMember.membership.planName,
        planType: newMember.membership.planType,
      };

      setSales(prev => {
        const next = [memberSale, ...prev];
        storage.saveSales(next);
        return next;
      });
      broadcastLocalSync({ type: 'SALE_ADDED', sale: memberSale });
      pushEntityChangeToServer('sales', 'add', memberSale).catch(() => {});

      setCashSession(prev => {
        const next = applyMembershipCashToSession(prev, planPrice, initialPaymentMethod);
        storage.saveCashSession(next);
        broadcastLocalSync({ type: 'CASH_SESSION_UPDATED', cashSession: next });
        pushEntityChangeToServer('cashSession', 'update', next).catch(() => {});
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
    if (!options?.skipSale) {
      addNotification({
        title: 'Nuevo Socio Registrado',
        message: `${options?.groupSummaryNote || newMember.fullName} fue dado de alta con ${newMember.membership.planName} ($${planPrice.toLocaleString('es-MX')}).`,
        type: 'success',
        targetTab: 'clients',
        actionLabel: 'Ver socio'
      });
    }

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

  const clearMembersCache = async () => {
    storage.clearMembers();
    setMembers([]);
    membersRef.current = [];
    setAccessLogs([]);
    broadcastLocalSync({ type: 'MEMBERS_CLEARED' });
    try {
      await fetch('http://localhost:3001/api/sync/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: [], replace: true, action: 'clear' })
      });
      await fetch('http://localhost:3001/api/sync/entity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'accessLogs', action: 'replace', data: [] })
      });
    } catch (e) {
      console.warn('Sync server clear notice failed:', e);
    }
    addNotification({
      title: 'CachÃ© de Socios Limpiada',
      message: 'Se han eliminado los datos de prueba. El padrÃ³n estÃ¡ 100% limpio y listo para nuevos socios.',
      type: 'info',
      targetTab: 'clients'
    });
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

    const durationDays = planType === 'daily' ? 1 : planType === 'weekly' ? 7 : planType === 'biweekly' ? 15 : planType === 'quarterly' ? 90 : planType === 'annual' || planType === 'vip' ? 365 : Math.max(1, months) * 30;
    const { startDate, endDate, daysRemaining } = calculateMembershipDates(durationDays);

    let planName = 'Mensualidad Individual';
    if (planType === 'daily') planName = 'Pase por Día (Day Pass)';
    if (planType === 'weekly') planName = 'Pase Semanal (Semana por persona)';
    if (planType === 'biweekly') planName = 'Pase Quincenal (15 Días)';
    if (planType === 'group') planName = price >= 1400 ? 'Paquete 4 Personas (Mensual)' : 'Paquete 3 Personas (Mensual)';
    if (planType === 'quarterly') planName = 'Plan Trimestral Fuerza';
    if (planType === 'annual' || planType === 'vip') planName = 'Membresía Black VIP Anual';

    const updatedMembership = {
      planType,
      planName,
      startDate,
      endDate,
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
          name: `RenovaciÃ³n: ${planName}`,
          brand: 'LEGENDS GYM',
          category: 'gear',
          price,
          costPrice: 0,
          stock: 999,
          minStock: 0,
          image: '/logo.png',
          barcode: `PLAN-${planType.toUpperCase()}`,
          description: `RenovaciÃ³n de cuota deportiva - ${planName}`
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
      cashierName: currentUser ? currentUser.fullName : (currentRole === 'admin' ? 'Gerente / Admin' : 'RecepciÃ³n'),
      cashierRole: currentRole,
      notes: `RenovaciÃ³n de membresÃ­a ${planName}`,
      saleType: 'membership',
      planName,
      planType
    };

    setSales(prev => {
      const next = [renewalSale, ...prev];
      storage.saveSales(next);
      return next;
    });
    broadcastLocalSync({ type: 'SALE_ADDED', sale: renewalSale });
    pushEntityChangeToServer('sales', 'add', renewalSale).catch(() => {});

    setCashSession(prev => {
      const next = applyMembershipCashToSession(prev, price, paymentMethod);
      storage.saveCashSession(next);
      broadcastLocalSync({ type: 'CASH_SESSION_UPDATED', cashSession: next });
      pushEntityChangeToServer('cashSession', 'update', next).catch(() => {});
      return next;
    });

    addNotification({
      title: 'MembresÃ­a Renovada',
      message: `${target.fullName} renovÃ³ ${planName} ($${price.toLocaleString('es-MX')}) pagado con ${paymentMethod.toUpperCase()}.`,
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
    pushEntityChangeToServer('products', 'add', newProduct).catch(() => {});
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      const target = next.find(p => p.id === id);
      if (target) pushEntityChangeToServer('products', 'update', target).catch(() => {});
      return next;
    });
  };

  const deleteProduct = (id: string) => {
    const target = products.find(p => p.id === id);
    requestSupervisorAuth(
      `Eliminar producto de inventario: ${target ? target.name : id}`,
      () => {
        setProducts(prev => prev.filter(p => p.id !== id));
        pushEntityChangeToServer('products', 'delete', null, id).catch(() => {});
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
      if (targetP) {
        broadcastLocalSync({ type: 'PRODUCT_UPDATED', product: targetP });
        pushEntityChangeToServer('products', 'update', targetP).catch(() => {});
      }
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
    const clientName = client ? client.fullName : 'PÃºblico General';
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
      cashierName: currentUser ? currentUser.fullName : (currentRole === 'admin' ? 'Gerente / Admin' : 'Cajero RecepciÃ³n'),
      cashierRole: currentRole,
      notes,
      saleType: 'store',
    };

    cart.forEach(item => {
      adjustStock(item.product.id, -item.quantity);
      const remaining = item.product.stock - item.quantity;
      if (remaining <= item.product.minStock) {
        addNotification({
          title: 'Stock CrÃ­tico en Tienda',
          message: `El suplemento "${item.product.name}" quedÃ³ en ${remaining} unidades (mÃ­nimo de seguridad: ${item.product.minStock}).`,
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
    pushEntityChangeToServer('sales', 'add', newSale).catch(() => {});

    setCashSession(prev => {
      const next = {
        ...prev,
        totalSalesCash: paymentMethod === 'cash' ? prev.totalSalesCash + cartTotal : prev.totalSalesCash,
        totalSalesCard: paymentMethod === 'card' ? prev.totalSalesCard + cartTotal : prev.totalSalesCard,
        totalSalesTransfer: paymentMethod === 'transfer' ? prev.totalSalesTransfer + cartTotal : prev.totalSalesTransfer,
        expectedCash: paymentMethod === 'cash' ? prev.expectedCash + cartTotal : prev.expectedCash,
      };
      broadcastLocalSync({ type: 'CASH_SESSION_UPDATED', cashSession: next });
      pushEntityChangeToServer('cashSession', 'update', next).catch(() => {});
      return next;
    });

    clearCart();
    sounds.playCheckoutSuccess();
    return newSale;
  };

  // Devolución parcial o anulación total con restauración automática de stock
  const refundSale = (
    saleIdOrFolio: string,
    reason: string,
    itemsToRefund?: { productId: string; quantity: number }[]
  ): { success: boolean; message: string; refundedAmount: number; restoredUnits: number; updatedSale?: Sale } => {
    const cleanQuery = saleIdOrFolio.trim().toLowerCase();
    const targetSale = sales.find(
      s =>
        (s.id || '').toLowerCase() === cleanQuery ||
        (s.folio || '').toLowerCase() === cleanQuery
    );

    if (!targetSale) {
      sounds.playBarcodeError();
      return {
        success: false,
        message: `No se encontró ninguna venta con el folio o código "${saleIdOrFolio}".`,
        refundedAmount: 0,
        restoredUnits: 0,
      };
    }

    if (targetSale.status === 'voided') {
      sounds.playBarcodeError();
      return {
        success: false,
        message: `El ticket ${targetSale.folio} ya fue anulado / devuelto en su totalidad.`,
        refundedAmount: 0,
        restoredUnits: 0,
      };
    }

    const prevRefundedMap = new Map<string, number>();
    (targetSale.refundedItems || []).forEach(ri => {
      prevRefundedMap.set(ri.productId, (prevRefundedMap.get(ri.productId) || 0) + ri.quantity);
    });

    const effectiveRefunds: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    const targetItems = Array.isArray(targetSale.items) ? targetSale.items : [];
    for (const item of targetItems) {
      const productId = item?.product?.id || '';
      const alreadyRefunded = prevRefundedMap.get(productId) || 0;
      const maxRemaining = Math.max(0, (item.quantity || 0) - alreadyRefunded);
      if (maxRemaining <= 0) continue;

      let requestedQty = maxRemaining;
      if (itemsToRefund && itemsToRefund.length > 0) {
        const matchReq = itemsToRefund.find(r => r.productId === productId);
        requestedQty = matchReq ? Math.min(maxRemaining, Math.max(0, Math.floor(matchReq.quantity))) : 0;
      }

      if (requestedQty > 0) {
        effectiveRefunds.push({
          productId,
          productName: getSaleItemLabel(item),
          quantity: requestedQty,
          unitPrice: item.unitPrice,
          subtotal: Math.round(requestedQty * item.unitPrice * 100) / 100,
        });
      }
    }

    if (effectiveRefunds.length === 0) {
      sounds.playBarcodeError();
      return {
        success: false,
        message: 'Selecciona al menos 1 artículo con cantidad disponible para devolver.',
        refundedAmount: 0,
        restoredUnits: 0,
      };
    }

    const refundAmountThisOp =
      Math.round(effectiveRefunds.reduce((sum, r) => sum + r.subtotal, 0) * 100) / 100;
    let restoredUnits = 0;

    effectiveRefunds.forEach(refItem => {
      if (!isNonInventorySaleItem(refItem.productId)) {
        adjustStock(refItem.productId, refItem.quantity);
        restoredUnits += refItem.quantity;
      }
    });

    const combinedRefundsMap = new Map<
      string,
      { productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number }
    >();
    (targetSale.refundedItems || []).forEach(ri => {
      combinedRefundsMap.set(ri.productId, { ...ri });
    });
    effectiveRefunds.forEach(ri => {
      const existing = combinedRefundsMap.get(ri.productId);
      if (existing) {
        const nextQty = existing.quantity + ri.quantity;
        combinedRefundsMap.set(ri.productId, {
          ...existing,
          quantity: nextQty,
          subtotal: Math.round(nextQty * existing.unitPrice * 100) / 100,
        });
      } else {
        combinedRefundsMap.set(ri.productId, { ...ri });
      }
    });

    const mergedRefundedItems = Array.from(combinedRefundsMap.values());
    const totalOriginalQty = targetItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const totalRefundedQty = mergedRefundedItems.reduce((sum, i) => sum + i.quantity, 0);
    const isFullyVoided = totalRefundedQty >= totalOriginalQty;
    const totalRefundedAmount =
      Math.round(((targetSale.refundedAmount || 0) + refundAmountThisOp) * 100) / 100;

    const authorizedBy = currentUser
      ? currentUser.fullName
      : currentRole === 'admin'
      ? 'Gerente / Admin'
      : 'Cajero Recepción';
    const cleanReason = reason.trim() || 'Devolución de productos en Punto de Venta';

    const updatedSale: Sale = {
      ...targetSale,
      status: isFullyVoided ? 'voided' : 'partial_refund',
      voidedAt: new Date().toISOString(),
      voidedBy: authorizedBy,
      voidReason: cleanReason,
      refundedAmount: Math.min(targetSale.total, totalRefundedAmount),
      refundedItems: mergedRefundedItems,
    };

    setSales(prev => prev.map(s => (s.id === updatedSale.id ? updatedSale : s)));
    broadcastLocalSync({ type: 'SALE_ADDED', sale: updatedSale });
    pushEntityChangeToServer('sales', 'update', updatedSale).catch(() => {});

    if (targetSale.clientId) {
      setMembers(prev =>
        prev.map(m =>
          m.id === targetSale.clientId
            ? { ...m, totalSpentInStore: Math.max(0, (m.totalSpentInStore || 0) - refundAmountThisOp) }
            : m
        )
      );
    }

    setCashSession(prev => {
      const pm = targetSale.paymentMethod;
      const saleBucket = resolveSaleType(targetSale);
      const isMembership = saleBucket === 'membership';
      const isVisit = saleBucket === 'visit';
      const isStore = !isMembership && !isVisit;
      const next: CashRegisterSession = {
        ...prev,
        totalSalesCash:
          isStore && pm === 'cash' ? Math.max(0, prev.totalSalesCash - refundAmountThisOp) : prev.totalSalesCash,
        totalSalesCard:
          isStore && pm === 'card' ? Math.max(0, prev.totalSalesCard - refundAmountThisOp) : prev.totalSalesCard,
        totalSalesTransfer:
          isStore && pm === 'transfer' ? Math.max(0, prev.totalSalesTransfer - refundAmountThisOp) : prev.totalSalesTransfer,
        totalMembershipsCash:
          isMembership && pm === 'cash' ? Math.max(0, prev.totalMembershipsCash - refundAmountThisOp) : prev.totalMembershipsCash,
        totalMembershipsCard:
          isMembership && pm === 'card' ? Math.max(0, prev.totalMembershipsCard - refundAmountThisOp) : prev.totalMembershipsCard,
        totalMembershipsTransfer:
          isMembership && pm === 'transfer' ? Math.max(0, (prev.totalMembershipsTransfer || 0) - refundAmountThisOp) : prev.totalMembershipsTransfer || 0,
        totalVisitsCash:
          isVisit && pm === 'cash' ? Math.max(0, (prev.totalVisitsCash || 0) - refundAmountThisOp) : prev.totalVisitsCash || 0,
        totalVisitsCard:
          isVisit && pm === 'card' ? Math.max(0, (prev.totalVisitsCard || 0) - refundAmountThisOp) : prev.totalVisitsCard || 0,
        totalVisitsTransfer:
          isVisit && pm === 'transfer' ? Math.max(0, (prev.totalVisitsTransfer || 0) - refundAmountThisOp) : prev.totalVisitsTransfer || 0,
        expectedCash: pm === 'cash' ? Math.max(0, prev.expectedCash - refundAmountThisOp) : prev.expectedCash,
      };
      broadcastLocalSync({ type: 'CASH_SESSION_UPDATED', cashSession: next });
      pushEntityChangeToServer('cashSession', 'update', next).catch(() => {});
      return next;
    });

    addNotification({
      title: isFullyVoided ? `Ticket Anulado (${targetSale.folio})` : `Devolución Parcial (${targetSale.folio})`,
      message: `Se reembolsaron $${refundAmountThisOp.toFixed(2)} (${restoredUnits} pza(s) devueltas al almacén). Motivo: ${cleanReason}.`,
      type: 'warning',
      targetTab: 'pos',
      actionLabel: 'Ver POS',
    });

    sounds.playCheckoutSuccess();
    return {
      success: true,
      message: isFullyVoided
        ? `Venta ${targetSale.folio} anulada y ${restoredUnits} unidad(es) restauradas al stock.`
        : `Devolución parcial en ${targetSale.folio} procesada ($${refundAmountThisOp.toFixed(2)}) y ${restoredUnits} unidad(es) restauradas al stock.`,
      refundedAmount: refundAmountThisOp,
      restoredUnits,
      updatedSale,
    };
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
      const nameWords = nameNorm.split(/\s+/).filter(Boolean);
      if (nameNorm === q || nameWords.some(w => w === q)) return true;
      if (q.length >= 3 && nameNorm.includes(q)) return true;
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
        reason: `Credencial o huella "${biometricQuery.trim()}" no encontrada en el padrÃ³n de socios`,
        method: 'fingerprint',
      };
      setAccessLogs(prev => [failLog, ...prev]);
      broadcastLocalSync({ type: 'ACCESS_LOG_ADDED', log: failLog });
      pushAccessLogToServer(failLog).catch(() => {});
      return { granted: false, reason: failLog.reason, log: failLog };
    }

    const statusInfo = getMembershipStatus(matched.membership);

    if (statusInfo.isExpired || matched.membership.status === 'expired') {
      sounds.playAccessDenied();
      const expiredDays = Math.abs(statusInfo.daysRemaining);
      const failLog: AccessLog = {
        id: `LOG-${Date.now()}`,
        timestamp: now,
        clientId: matched.id,
        clientName: matched.fullName,
        avatarUrl: matched.avatarUrl,
        status: 'denied',
        reason: `Membresía vencida hace ${expiredDays} día(s). Favor de renovar en caja.`,
        planName: matched.membership.planName,
        daysRemaining: statusInfo.daysRemaining,
        method: 'fingerprint',
      };
      setAccessLogs(prev => [failLog, ...prev]);
      broadcastLocalSync({ type: 'ACCESS_LOG_ADDED', log: failLog });
      pushAccessLogToServer(failLog).catch(() => {});
      return { granted: false, client: matched, reason: failLog.reason, log: failLog };
    }

    sounds.playAccessGranted();
    const successReason = statusInfo.isExpiring
      ? `Acceso Autorizado • ¡Atención: Vence hoy/pronto (${statusInfo.daysRemaining} d)!`
      : `Acceso Autorizado - ${matched.membership.planName}`;

    const successLog: AccessLog = {
      id: `LOG-${Date.now()}`,
      timestamp: now,
      clientId: matched.id,
      clientName: matched.fullName,
      avatarUrl: matched.avatarUrl,
      status: 'granted',
      reason: successReason,
      planName: matched.membership.planName,
      daysRemaining: statusInfo.daysRemaining,
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
    pushEntityChangeToServer('cashSession', 'update', closed).catch(() => {});
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
      totalVisitsCash: 0,
      totalVisitsCard: 0,
      totalVisitsTransfer: 0,
      expectedCash: initialCash,
      status: 'open',
    };
    setCashSession(newSession);
    broadcastLocalSync({ type: 'CASH_SESSION_UPDATED', cashSession: newSession });
    pushEntityChangeToServer('cashSession', 'update', newSession).catch(() => {});
  };

  // Empleados (Staff)
  const addEmployee = (data: Omit<Employee, 'id'>): Employee => {
    const current = employeesRef.current;
    const maxIdNum = current.reduce((max, emp) => {
      const match = emp.id.match(/^EMP-(\d+)$/i);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    const newId = `EMP-${String(maxIdNum + 1).padStart(3, '0')}`;
    const cleanPass = (data.password || '').trim() || '123456';
    const cleanPin = (data.pin || '').trim() || '1234';
    const newEmp: Employee = {
      ...data,
      id: newId,
      password: hashSecret(cleanPass),
      pin: hashSecret(cleanPin),
      updatedAt: new Date().toISOString(),
    };
    storage.removeDeletedEmployeeId(newId);
    const next = [newEmp, ...current];
    employeesRef.current = next;
    storage.saveEmployees(next);
    setEmployees(next);
    pushEntityChangeToServer('employees', 'add', newEmp).then((res) => {
      if (res.version && res.version > serverVersionRef.current) {
        serverVersionRef.current = res.version;
      }
    }).catch(() => {});
    return newEmp;
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    const sanitizedUpdates: Partial<Employee> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (updates.password !== undefined) {
      const trimmedPass = updates.password.trim();
      if (trimmedPass) {
        sanitizedUpdates.password = hashSecret(trimmedPass);
      } else {
        delete sanitizedUpdates.password;
      }
    }
    if (updates.pin !== undefined) {
      const trimmedPin = updates.pin.trim();
      if (trimmedPin) {
        sanitizedUpdates.pin = hashSecret(trimmedPin);
      } else {
        delete sanitizedUpdates.pin;
      }
    }

    const next = employeesRef.current.map((e) => (e.id === id ? { ...e, ...sanitizedUpdates } : e));
    employeesRef.current = next;
    storage.saveEmployees(next);
    setEmployees(next);

    const target = next.find((e) => e.id === id);
    if (target) {
      pushEntityChangeToServer('employees', 'update', target).then((res) => {
        if (res.version && res.version > serverVersionRef.current) {
          serverVersionRef.current = res.version;
        }
      }).catch(() => {});
    }
    if (currentUser?.id === id && target) {
      setCurrentUserState(target);
      currentUserRef.current = target;
      storage.saveCurrentUser(target);
    }
  };

  const deleteEmployee = (id: string) => {
    storage.addDeletedEmployeeId(id);
    const next = employeesRef.current.filter((e) => e.id !== id);
    employeesRef.current = next;
    storage.saveEmployees(next);
    setEmployees(next);
    pushEntityChangeToServer('employees', 'delete', null, id).catch(() => {});
    if (currentUser?.id === id) {
      logout();
    }
  };

  // ConfiguraciÃ³n & CatÃ¡logos
  const updateGymSettings = (updates: Partial<GymSettings>) => {
    setGymSettings(prev => {
      const next = { ...prev, ...updates };
      pushEntityChangeToServer('settings', 'update', next).catch(() => {});
      return next;
    });
  };

  const updateTerminalDesign = (nextDesign: TerminalEntryDesignConfig) => {
    const normalized = mergeWithDefaultTerminalDesign({
      ...nextDesign,
      updatedAt: nextDesign.updatedAt || new Date().toISOString(),
    });
    setTerminalDesign(normalized);
    storage.saveTerminalDesign(normalized);
    broadcastLocalSync({ type: 'TERMINAL_DESIGN_UPDATED', terminalDesign: normalized });
    pushEntityChangeToServer('terminalDesign', 'update', normalized).catch(() => {});
  };

  const addCatalogPlan = (plan: Omit<SystemCatalogPlan, 'id'>): SystemCatalogPlan => {
    const newId = `CAT-PLAN-${Date.now().toString().slice(-6)}`;
    const newPlan: SystemCatalogPlan = { ...plan, id: newId };
    setCatalogPlans(prev => [newPlan, ...prev]);
    pushEntityChangeToServer('catalogPlans', 'add', newPlan).catch(() => {});
    return newPlan;
  };

  const updateCatalogPlan = (id: string, updates: Partial<SystemCatalogPlan>) => {
    setCatalogPlans(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      const target = next.find(p => p.id === id);
      if (target) pushEntityChangeToServer('catalogPlans', 'update', target).catch(() => {});
      return next;
    });
  };

  const deleteCatalogPlan = (id: string) => {
    setCatalogPlans(prev => prev.filter(p => p.id !== id));
    pushEntityChangeToServer('catalogPlans', 'delete', null, id).catch(() => {});
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
    pushEntityChangeToServer('expenses', 'add', newExpense).catch(() => {});

    // Si se pagÃ³ en efectivo de caja, se descuenta del efectivo esperado
    if (data.paidFromCashRegister && cashSession.status === 'open') {
      setCashSession(prev => {
        const next = {
          ...prev,
          expectedCash: Math.max(0, prev.expectedCash - data.amount),
          notes: (prev.notes ? prev.notes + ' | ' : '') + `Gasto en caja: -$${data.amount} (${data.description.slice(0, 30)})`
        };
        broadcastLocalSync({ type: 'CASH_SESSION_UPDATED', cashSession: next });
        pushEntityChangeToServer('cashSession', 'update', next).catch(() => {});
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
            pushEntityChangeToServer('cashSession', 'update', next).catch(() => {});
            return next;
          });
        }
        setExpenses(prev => prev.filter(e => e.id !== id));
        pushEntityChangeToServer('expenses', 'delete', null, id).catch(() => {});
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

  // GeneraciÃ³n inicial inteligente de notificaciones
  useEffect(() => {
    if (notifications.length === 0) {
      const generated: SystemNotification[] = [];
      const expiring = members.filter(m => m.membership.daysRemaining >= 0 && m.membership.daysRemaining <= 3);
      if (expiring.length > 0) {
        generated.push({
          id: 'NOTIF-EXP-01',
          title: 'MembresÃ­as por vencer',
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
          title: 'Stock CrÃ­tico de Suplementos',
          message: `${lowStock.length} producto(s) en tienda por debajo del stock mÃ­nimo: ${lowStock.map(p => p.name).slice(0, 2).join(', ')}.`,
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
        message: 'Las 3 sedes de LEGENDS PRO GYM sincronizaron correctamente mÃ©tricas de aforo y corte de caja.',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        type: 'info',
        read: true,
        targetTab: 'branches',
        actionLabel: 'Ver sedes'
      });
      setNotifications(prev => prev.length === 0 ? generated : prev);
    }
  }, []);

  // SincronizaciÃ³n & Offline-First
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
      'Formatear y Restaurar Base de Datos de FÃ¡brica',
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
  
  const authorizeVisitPass = async (requestId: string, paymentMethod: PaymentMethod = 'cash'): Promise<boolean> => {
    if (!requestId || resolvedVisitIdsRef.current.has(requestId)) return false;
    resolvedVisitIdsRef.current.add(requestId);

    const req = pendingVisitRequests.find(r => r.id === requestId);
    const clientName = req?.clientName || 'Visitante del Día';
    const cost = req?.cost || 50;

    const dummyProduct: any = {
      id: 'prod_visit_pass',
      name: 'Pase de Visita por 1 Día',
      category: 'gear',
      price: cost,
      costPrice: 0,
      stock: 9999,
      minStock: 0,
      brand: 'Fitness Legends',
      image: '',
      barcode: 'VIS-001',
      description: 'Pase de visita diaria'
    };

    const saleId = `SALE_VISIT_${requestId}`;
    const newSale: Sale = {
      id: saleId,
      folio: `VIS-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      clientName: clientName,
      items: [{
        product: dummyProduct,
        quantity: 1,
        unitPrice: cost,
        subtotal: cost,
      }],
      subtotal: cost,
      tax: 0,
      total: cost,
      paymentMethod: paymentMethod,
      amountPaid: cost,
      changeGiven: 0,
      cashierName: currentUser?.fullName || 'Recepción (RP)',
      cashierRole: currentRole,
      notes: `Pase de Visita de ${clientName} - Acceso Torniquete Autorizado ($${cost})`,
      saleType: 'visit',
      planName: 'Pase de Visita',
    };

    setSales(prev => {
      if (prev.some(s => s.id === saleId)) return prev;
      const nextSales = [newSale, ...prev];
      storage.saveSales(nextSales);
      return nextSales;
    });
    broadcastLocalSync({ type: 'SALE_ADDED', sale: newSale });

    let nextSessionPayload: CashRegisterSession | undefined = undefined;
    if (cashSession && cashSession.status === 'open') {
      nextSessionPayload = applyVisitCashToSession(cashSession, cost, paymentMethod);
      setCashSession(nextSessionPayload);
      storage.saveCashSession(nextSessionPayload);
      broadcastLocalSync({ type: 'CASH_SESSION_UPDATED', cashSession: nextSessionPayload });
    }

    setPendingVisitRequests(prev => prev.filter(r => r.id !== requestId));
    markRequestNotificationDone('visit', requestId, 'authorized');

    await pushVisitAuthorizeToServer({
      id: requestId,
      clientName,
      cost,
      paymentMethod,
      authorizedBy: currentUser?.fullName || 'Recepción (RP)',
      sale: newSale,
      cashSession: nextSessionPayload,
    });

    return true;
  };

  const rejectVisitPass = async (requestId: string): Promise<boolean> => {
    if (!requestId || resolvedVisitIdsRef.current.has(requestId)) return false;
    resolvedVisitIdsRef.current.add(requestId);
    setPendingVisitRequests(prev => prev.filter(r => r.id !== requestId));
    markRequestNotificationDone('visit', requestId, 'rejected');
    await pushVisitRejectToServer(requestId);
    return true;
  };

  const requestVisitPass = async (clientName: string = 'Visitante del Día', cost: number = 50): Promise<string> => {
    const id = `VIS_${Date.now()}`;
    const newReq = { id, clientName, cost, timestamp: Date.now() };
    setPendingVisitRequests(prev => [newReq, ...prev]);
    upsertRequestNotification('visit', newReq);
    await pushVisitRequestToServer(newReq);
    return id;
  };

  const authorizeMemberRegistration = async (requestId: string, paymentMethod: PaymentMethod = 'cash'): Promise<boolean> => {
    if (!requestId || resolvedRegIdsRef.current.has(requestId)) return false;
    const req = pendingRegistrationRequests.find(r => r.id === requestId);
    if (!req) return false;
    resolvedRegIdsRef.current.add(requestId);
    // Registration payment method is chosen by the client during registration and stays fixed here
    const effectivePaymentMethod: PaymentMethod = (req.paymentMethod || req.memberData?.paymentMethod || paymentMethod || 'cash') as PaymentMethod;

    const memberData = req.memberData || {};
    const clientName = (memberData.fullName || 'Nuevo Socio').trim();
    const planName = memberData.planName || 'Mensualidad Estándar';
    const planType: MembershipPlanType = (memberData.planType as MembershipPlanType) || (Array.isArray(memberData.groupMembers) && memberData.groupMembers.length > 0 ? 'group' : 'monthly');
    const planPrice = Number(memberData.planPrice || 420);
    const durationDays = Number(memberData.durationDays || 30);
    const dates = calculateMembershipDates(durationDays);
    const baseStamp = Date.now().toString().slice(-6);
    const groupCompanions: any[] = Array.isArray(memberData.groupMembers)
      ? memberData.groupMembers.filter((gm: any) => gm && gm.fullName && gm.fullName.trim())
      : [];
    const totalGroupCount = 1 + groupCompanions.length;
    const memberId = memberData.documentId || `MEM_${baseStamp}`;

    const fullMember: any = {
      id: memberId,
      fullName: clientName,
      gender: memberData.gender || 'male',
      documentId: memberData.documentId || memberId,
      email: memberData.email || `${memberId.toLowerCase()}@legendsgym.com`,
      phone: memberData.phone || '+52 55 0000 0000',
      birthDate: memberData.birthDate || '1998-01-01',
      avatarUrl: getGymAvatar(clientName, undefined, memberData.gender),
      status: 'active',
      startDate: dates.startDate,
      endDate: dates.endDate,
      daysRemaining: dates.daysRemaining,
      biometricRegistered: Boolean(memberData.biometricEnrolled),
      biometricEnrolled: Boolean(memberData.biometricEnrolled),
      biometricHash: memberData.biometricEnrolled ? `BIO_HASH_${memberId}_${Date.now().toString(36).toUpperCase()}` : undefined,
      biometricTemplate: memberData.biometricTemplate || memberData.selectedFinger || `FP_ENROLLED_${memberId}`,
      biometrics: memberData.biometrics || {
        enrolled: Boolean(memberData.biometricEnrolled),
        template: memberData.selectedFinger || `FP_ENROLLED_${Date.now()}`,
        registeredAt: new Date().toISOString(),
        quality: 98
      },
      membership: {
        planType,
        planName: planName,
        startDate: dates.startDate,
        endDate: dates.endDate,
        price: planPrice,
        status: 'active',
        daysRemaining: dates.daysRemaining,
      },
      medicalNotes: totalGroupCount > 1
        ? `Titular de paquete grupal (${totalGroupCount} personas · ${planName}). Pago: ${effectivePaymentMethod}.`
        : (memberData.medicalNotes || `Alta autorizada desde RP. Método de pago: ${effectivePaymentMethod}.`),
      checkInsCount: 0,
      totalSpentInStore: planPrice,
      createdAt: getLocalDateString()
    };

    const companionMembers: any[] = groupCompanions.map((comp, idx) => {
      const compName = comp.fullName.trim();
      const compGender: 'male' | 'female' = comp.gender || detectGender(compName);
      const compId = comp.documentId || `MEM_${baseStamp}_${idx + 2}`;
      const compEnrolled = Boolean(comp.biometricEnrolled);
      return {
        id: compId,
        fullName: compName,
        gender: compGender,
        documentId: compId,
        email: comp.email || `${compId.toLowerCase()}@legendsgym.com`,
        phone: comp.phone || memberData.phone || '+52 55 0000 0000',
        birthDate: comp.birthDate || '1998-01-01',
        avatarUrl: getGymAvatar(compName, undefined, compGender),
        status: 'active',
        startDate: dates.startDate,
        endDate: dates.endDate,
        daysRemaining: dates.daysRemaining,
        biometricRegistered: compEnrolled,
        biometricEnrolled: compEnrolled,
        biometricHash: compEnrolled ? `BIO_HASH_${compId}_${Date.now().toString(36).toUpperCase()}` : undefined,
        biometricTemplate: comp.biometricTemplate || comp.selectedFinger || `FP_ENROLLED_${compId}`,
        biometrics: {
          enrolled: compEnrolled,
          template: comp.selectedFinger || `FP_ENROLLED_${compId}`,
          registeredAt: new Date().toISOString(),
          quality: 98
        },
        membership: {
          planType,
          planName: planName,
          startDate: dates.startDate,
          endDate: dates.endDate,
          price: planPrice,
          status: 'active',
          daysRemaining: dates.daysRemaining,
        },
        medicalNotes: `Integrante ${idx + 2}/${totalGroupCount} (${planName}) · Titular: ${clientName}`,
        checkInsCount: 0,
        totalSpentInStore: 0,
        createdAt: getLocalDateString()
      };
    });

    const allCreatedMembers = [fullMember, ...companionMembers];

    // Add all group members (or single member) cleanly
    const createdIds = new Set(allCreatedMembers.map(m => m.id));
    setMembers(prev => {
      const next = [...allCreatedMembers, ...prev.filter(m => !createdIds.has(m.id))];
      membersRef.current = next;
      storage.saveMembers(next);
      return next;
    });
    allCreatedMembers.forEach(m => {
      broadcastLocalSync({ type: 'MEMBER_ADDED', member: m });
      pushMemberActionToServer('add', { member: m }).catch(() => {});
    });

    // Create ONE unified Sale for the entire package
    const allNamesLabel = allCreatedMembers.map(m => m.fullName).join(', ');
    const dummyProduct: any = {
      id: 'prod_reg_' + Date.now(),
      name: totalGroupCount > 1 ? `Paquete ${totalGroupCount} Personas: ${planName}` : `Membresía ${planName}`,
      category: 'gear',
      price: planPrice,
      costPrice: 0,
      stock: 9999,
      minStock: 0,
      brand: 'Fitness Legends',
      image: '',
      barcode: 'MEM-001',
      description: totalGroupCount > 1
        ? `${planName} para: ${allNamesLabel}`
        : `Membresía ${planName} de ${clientName}`
    };

    const newSale: Sale = {
      id: `SALE-REG-${Date.now()}`,
      folio: `REG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      clientId: fullMember.id,
      clientName: totalGroupCount > 1 ? `${clientName} (+${companionMembers.length})` : clientName,
      items: [{
        product: dummyProduct,
        quantity: 1,
        unitPrice: planPrice,
        subtotal: planPrice,
      }],
      subtotal: planPrice,
      tax: 0,
      total: planPrice,
      paymentMethod: effectivePaymentMethod,
      amountPaid: planPrice,
      changeGiven: 0,
      cashierName: currentUser?.fullName || 'Recepción (RP)',
      cashierRole: currentRole,
      notes: totalGroupCount > 1
        ? `Alta grupal (${totalGroupCount} personas): ${allNamesLabel} • ${planName} (${effectivePaymentMethod})`
        : `Alta y cobro de membresía ${planName} para ${clientName} (${effectivePaymentMethod})`,
      saleType: 'membership',
      planName: planName,
      planType
    };

    setSales(prev => {
      const next = [newSale, ...prev.filter(s => s.id !== newSale.id)];
      storage.saveSales(next);
      return next;
    });
    broadcastLocalSync({ type: 'SALE_ADDED', sale: newSale });
    pushEntityChangeToServer('sales', 'add', newSale).catch(() => {});

    // Update cash session (membership revenue, never store sales)
    let nextRegCashSession: CashRegisterSession | undefined = undefined;
    if (cashSession && cashSession.status === 'open') {
      nextRegCashSession = applyMembershipCashToSession(cashSession, planPrice, effectivePaymentMethod);
      setCashSession(nextRegCashSession);
      storage.saveCashSession(nextRegCashSession);
      broadcastLocalSync({ type: 'CASH_SESSION_UPDATED', cashSession: nextRegCashSession });
    }

    // Access log
    const regLog: AccessLog = {
      id: `LOG-REG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      clientId: fullMember.id,
      clientName: totalGroupCount > 1 ? allNamesLabel : clientName,
      avatarUrl: fullMember.avatarUrl,
      status: 'granted',
      method: 'manual',
      reason: totalGroupCount > 1
        ? `Alta Grupal (${totalGroupCount} personas) y Pago Autorizado por RP • Torniquete Abierto`
        : 'Alta y Pago de Membresía Autorizado por RP • Torniquete Abierto',
      planName: planName
    };
    setAccessLogs(prev => [regLog, ...prev]);
    storage.saveAccessLogs([regLog, ...accessLogs]);
    broadcastLocalSync({ type: 'ACCESS_LOG_ADDED', log: regLog });

    // Remove from pending and mark registration notification completed
    setPendingRegistrationRequests(prev => prev.filter(r => r.id !== requestId));
    markRequestNotificationDone('registration', requestId, 'authorized');

    // Broadcast authorization
    broadcastLocalSync({
      type: 'MEMBER_REGISTRATION_AUTHORIZED',
      registrationRequest: { id: requestId, memberData: fullMember, paymentMethod: effectivePaymentMethod, timestamp: Date.now(), status: 'authorized' },
      member: fullMember,
      members: allCreatedMembers,
      sale: newSale,
      cashSession: nextRegCashSession
    });

    await pushRegistrationAuthorizeToServer({
      id: requestId,
      member: fullMember,
      members: allCreatedMembers,
      sale: newSale,
      cashSession: nextRegCashSession,
      paymentMethod: effectivePaymentMethod,
      authorizedBy: currentUser?.fullName || 'Recepción (RP)'
    });

    return true;
  };

  const rejectMemberRegistration = async (requestId: string): Promise<boolean> => {
    if (!requestId || resolvedRegIdsRef.current.has(requestId)) return false;
    resolvedRegIdsRef.current.add(requestId);
    setPendingRegistrationRequests(prev => prev.filter(r => r.id !== requestId));
    markRequestNotificationDone('registration', requestId, 'rejected');
    broadcastLocalSync({
      type: 'MEMBER_REGISTRATION_REJECTED',
      registrationRequest: { id: requestId, memberData: null, paymentMethod: 'cash', timestamp: Date.now(), status: 'rejected' }
    });
    await pushRegistrationRejectToServer(requestId);
    return true;
  };

  const requestMemberRegistration = async (memberData: any, paymentMethod: PaymentMethod = 'cash'): Promise<string> => {
    const id = `REG_${Date.now()}`;
    const newReq = { id, memberData, paymentMethod, timestamp: Date.now() };
    setPendingRegistrationRequests(prev => [newReq, ...prev]);
    upsertRequestNotification('registration', newReq);
    await pushRegistrationRequestToServer(newReq);
    return id;
  };

  const todaySales = sales.filter(s => isTodayDate(s.timestamp) || (s.timestamp || '').startsWith(todayStr));
  const netSaleValue = (s: Sale) => Math.max(0, toSafeNumber(s.total) - toSafeNumber(s.refundedAmount));
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + netSaleValue(s), 0);
  const todaySalesCount = todaySales.filter(s => s.status !== 'voided').length;

  const todayStoreSalesTotal = todaySales
    .filter(s => resolveSaleType(s) === 'store')
    .reduce((acc, s) => acc + netSaleValue(s), 0);

  const todayMembershipsSalesTotal = todaySales
    .filter(s => resolveSaleType(s) === 'membership')
    .reduce((acc, s) => acc + netSaleValue(s), 0);

  const todayVisitsSalesTotal = todaySales
    .filter(s => resolveSaleType(s) === 'visit')
    .reduce((acc, s) => acc + netSaleValue(s), 0);

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
      currentRole: effectiveRole,
      isAdmin,
      activePermissions,
      canAccessTab,
      firstAllowedTab,
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
      clearMembersCache,
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
      refundSale,
      todaySalesTotal,
      todaySalesCount,
      todayStoreSalesTotal,
      todayMembershipsSalesTotal,
      todayVisitsSalesTotal,
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
      terminalDesign,
      updateTerminalDesign,
      catalogPlans,
      addCatalogPlan,
      updateCatalogPlan,
      deleteCatalogPlan,
      activeMembersCount,
      todayCheckInsCount,
      lowStockProductsCount,
      isTerminalConnected,
      pendingVisitRequests,
      authorizeVisitPass,
      rejectVisitPass,
      requestVisitPass,
      pendingRegistrationRequests,
      authorizeMemberRegistration,
      rejectMemberRegistration,
      requestMemberRegistration,
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
