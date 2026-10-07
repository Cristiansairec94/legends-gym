import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  SyncState
} from '../types';
import { storage } from '../services/storage';
import { sounds } from '../services/audio';

interface GymContextType {
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
  addMember: (clientData: Partial<Client>) => Client;
  updateMember: (id: string, updates: Partial<Client>) => void;
  deleteMember: (id: string) => void;
  renewMembership: (id: string, planType: MembershipPlanType, months: number, price: number, paymentMethod: PaymentMethod) => void;
  enrollFingerprint: (id: string, templateCode: string) => boolean;
  getMemberById: (id: string) => Client | undefined;

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
  clearAccessLogs: () => void;

  // Cash Session
  cashSession: CashRegisterSession;
  updateCashSession: (session: CashRegisterSession) => void;
  closeCashSession: (countedCash: number, notes?: string) => void;
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
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export const GymProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => storage.getActiveRole());
  const [members, setMembers] = useState<Client[]>(() => storage.getMembers());
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

  // Sync to storage
  useEffect(() => { storage.saveMembers(members); }, [members]);
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


  const setCurrentRole = (role: UserRole) => {
    setCurrentRoleState(role);
    storage.saveActiveRole(role);
  };

  const updateRolePermissions = (roleId: UserRole, permissions: Partial<RolePermissions>) => {
    setRoles(prev => prev.map(r => r.id === roleId ? {
      ...r,
      permissions: { ...r.permissions, ...permissions }
    } : r));
  };

  // Member Management
  const addMember = (clientData: Partial<Client>): Client => {
    const newId = `MEM-${String(members.length + 1).padStart(3, '0')}`;
    const newMember: Client = {
      id: newId,
      fullName: clientData.fullName || 'Nuevo Socio',
      documentId: clientData.documentId || `${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: clientData.email || `${newId.toLowerCase()}@legendsgym.com`,
      phone: clientData.phone || '+52 55 0000 0000',
      avatarUrl: clientData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      birthDate: clientData.birthDate || '1995-01-01',
      emergencyContact: clientData.emergencyContact || {
        name: 'Contacto Emergencia',
        phone: '+52 55 1111 2222',
        relationship: 'Familiar'
      },
      medicalNotes: clientData.medicalNotes || 'Sin condiciones médicas registradas.',
      biometricRegistered: Boolean(clientData.biometricRegistered),
      biometricHash: clientData.biometricHash || undefined,
      biometricTemplate: clientData.biometricTemplate || undefined,
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

    setMembers(prev => [newMember, ...prev]);
    return newMember;
  };

  const updateMember = (id: string, updates: Partial<Client>) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const deleteMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
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

    updateMember(id, { membership: updatedMembership });

    setCashSession(prev => ({
      ...prev,
      totalMembershipsCash: paymentMethod === 'cash' ? prev.totalMembershipsCash + price : prev.totalMembershipsCash,
      totalMembershipsCard: paymentMethod === 'card' ? prev.totalMembershipsCard + price : prev.totalMembershipsCard,
      expectedCash: paymentMethod === 'cash' ? prev.expectedCash + price : prev.expectedCash,
    }));

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
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const adjustStock = (id: string, amount: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const nextStock = Math.max(0, p.stock + amount);
        return { ...p, stock: nextStock };
      }
      return p;
    }));
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
      cashierName: currentRole === 'admin' ? 'Gerente / Admin' : 'Cajero Recepción',
      cashierRole: currentRole,
      notes,
    };

    cart.forEach(item => {
      adjustStock(item.product.id, -item.quantity);
    });

    if (clientId) {
      setMembers(prev => prev.map(m => 
        m.id === clientId 
          ? { ...m, totalSpentInStore: m.totalSpentInStore + cartTotal }
          : m
      ));
    }

    setSales(prev => [newSale, ...prev]);

    setCashSession(prev => ({
      ...prev,
      totalSalesCash: paymentMethod === 'cash' ? prev.totalSalesCash + cartTotal : prev.totalSalesCash,
      totalSalesCard: paymentMethod === 'card' ? prev.totalSalesCard + cartTotal : prev.totalSalesCard,
      totalSalesTransfer: paymentMethod === 'transfer' ? prev.totalSalesTransfer + cartTotal : prev.totalSalesTransfer,
      expectedCash: paymentMethod === 'cash' ? prev.expectedCash + cartTotal : prev.expectedCash,
    }));

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
    const q = biometricQuery.toLowerCase().trim();
    const matched = members.find(m => 
      (m.biometricHash && m.biometricHash.toLowerCase() === q) ||
      (m.biometricTemplate && m.biometricTemplate.toLowerCase() === q) ||
      m.id.toLowerCase() === q ||
      m.documentId.toLowerCase() === q ||
      m.fullName.toLowerCase().includes(q)
    );

    const now = new Date().toISOString();

    if (!matched) {
      sounds.playAccessDenied();
      const failLog: AccessLog = {
        id: `LOG-${Date.now()}`,
        timestamp: now,
        clientName: 'Huella No Identificada',
        status: 'denied',
        reason: 'Huella biométrica no registrada en el sistema',
        method: 'fingerprint',
      };
      setAccessLogs(prev => [failLog, ...prev]);
      return { granted: false, reason: failLog.reason, log: failLog };
    }

    if (!matched.biometricRegistered) {
      sounds.playAccessDenied();
      const failLog: AccessLog = {
        id: `LOG-${Date.now()}`,
        timestamp: now,
        clientId: matched.id,
        clientName: matched.fullName,
        avatarUrl: matched.avatarUrl,
        status: 'denied',
        reason: 'El socio no tiene enrolamiento biométrico completado',
        planName: matched.membership.planName,
        daysRemaining: matched.membership.daysRemaining,
        method: 'fingerprint',
      };
      setAccessLogs(prev => [failLog, ...prev]);
      return { granted: false, client: matched, reason: failLog.reason, log: failLog };
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

    setAccessLogs(prev => [successLog, ...prev]);
    return { granted: true, client: matched, reason: successLog.reason, log: successLog };
  };

  const clearAccessLogs = () => setAccessLogs([]);

  // Cash Management
  const updateCashSession = (session: CashRegisterSession) => {
    setCashSession(session);
  };

  const closeCashSession = (countedCash: number, notes?: string) => {
    const diff = countedCash - cashSession.expectedCash;
    const closed: CashRegisterSession = {
      ...cashSession,
      actualCash: countedCash,
      cashDifference: diff,
      closedAt: new Date().toISOString(),
      status: 'closed',
      notes,
    };
    setCashSession(closed);
  };

  const openCashSession = (initialCash: number) => {
    const newSession: CashRegisterSession = {
      id: 'CAJA-' + Date.now().toString().slice(-6),
      openedAt: new Date().toISOString(),
      openedBy: currentRole === 'admin' ? 'Administrador' : 'Recepcionista',
      initialCash,
      totalSalesCash: 0,
      totalSalesCard: 0,
      totalSalesTransfer: 0,
      totalMembershipsCash: 0,
      totalMembershipsCard: 0,
      expectedCash: initialCash,
      status: 'open',
    };
    setCashSession(newSession);
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
  };

  const deleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
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

    // Si se pagó en efectivo de caja, se descuenta del efectivo esperado
    if (data.paidFromCashRegister && cashSession.status === 'open') {
      setCashSession(prev => ({
        ...prev,
        expectedCash: Math.max(0, prev.expectedCash - data.amount),
        notes: (prev.notes ? prev.notes + ' | ' : '') + `Gasto en caja: -$${data.amount} (${data.description.slice(0, 30)})`
      }));
    }

    return newExpense;
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
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
    await new Promise(r => setTimeout(r, 1000));
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
    storage.resetAll();
    window.location.reload();
  };

  // Metrics
  const activeMembersCount = members.filter(m => m.membership.status === 'active' || m.membership.status === 'expiring_soon').length;
  const todayAccess = accessLogs.filter(l => l.timestamp.startsWith(todayStr) && l.status === 'granted');
  const todayCheckInsCount = todayAccess.length;
  const lowStockProductsCount = products.filter(p => p.stock <= p.minStock).length;
  
  const todaySales = sales.filter(s => s.timestamp.startsWith(todayStr));
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.total, 0);
  const todaySalesCount = todaySales.length;

  return (
    <GymContext.Provider value={{
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
