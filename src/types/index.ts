export type UserRole = 'admin' | 'receptionist' | 'trainer';

export type MembershipPlanType = 'daily' | 'monthly' | 'quarterly' | 'annual' | 'vip';

export type MembershipStatus = 'active' | 'expiring_soon' | 'expired' | 'frozen';

export type PaymentMethod = 'cash' | 'card' | 'transfer';

export interface MembershipDetails {
  planType: MembershipPlanType;
  planName: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  price: number;
  status: MembershipStatus;
  daysRemaining: number;
}

export interface Client {
  id: string;
  fullName: string;
  documentId: string; // DNI / Cédula / CURP
  email: string;
  phone: string;
  avatarUrl: string;
  birthDate?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalNotes: string;
  assignedTrainerId?: string;
  biometricRegistered: boolean;
  biometricHash?: string;
  biometricTemplate?: string;
  membership: MembershipDetails;
  checkInsCount: number;
  lastCheckIn?: string;
  totalSpentInStore: number;
  createdAt: string;
}

export type ProductCategory = 
  | 'protein' 
  | 'creatine' 
  | 'preworkout' 
  | 'aminoacids' 
  | 'beverage' 
  | 'snack' 
  | 'gear';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  image: string;
  barcode: string;
  description: string;
  flavor?: string;
  servingSize?: string;
  sku?: string;
  taxRate?: 'IVA 16%' | 'Tasa 0%' | 'IEPS 8%' | 'Exento';
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  folio: string;
  timestamp: string;
  clientId?: string;
  clientName: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeGiven: number;
  cashierName: string;
  cashierRole: UserRole;
  notes?: string;
}

export interface AccessLog {
  id: string;
  timestamp: string;
  clientId?: string;
  clientName: string;
  avatarUrl?: string;
  status: 'granted' | 'denied';
  reason: string;
  planName?: string;
  daysRemaining?: number;
  method: 'fingerprint' | 'manual' | 'qr';
}

export interface CashRegisterSession {
  id: string;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  initialCash: number;
  totalSalesCash: number;
  totalSalesCard: number;
  totalSalesTransfer: number;
  totalMembershipsCash: number;
  totalMembershipsCard: number;
  expectedCash: number;
  actualCash?: number;
  cashDifference?: number;
  status: 'open' | 'closed';
  notes?: string;
}

// Configuración & Empleados
export interface Employee {
  id: string;
  fullName: string;
  documentId: string;
  email: string;
  phone: string;
  avatarUrl: string;
  role: UserRole;
  jobTitle: string;
  shift: 'Matutino (06:00 - 14:00)' | 'Vespertino (14:00 - 22:00)' | 'Turno Completo' | 'Fines de Semana';
  status: 'active' | 'inactive';
  hireDate: string;
  salaryMonthly: number;
}

export interface RolePermissions {
  accessTurnstile: boolean;
  manageClients: boolean;
  enrollBiometrics: boolean;
  posSales: boolean;
  manageInventory: boolean;
  cashRegister: boolean;
  viewReports: boolean;
  manageSettings: boolean;
  manageEmployees: boolean;
}

export interface RoleDefinition {
  id: UserRole;
  name: string;
  badgeText: string;
  description: string;
  color: string;
  permissions: RolePermissions;
}

export interface GymSettings {
  gymName: string;
  legalName: string;
  rfc: string;
  phone: string;
  address: string;
  email: string;
  turnstileTimeoutSeconds: number;
  allowGracePeriodDays: number;
  currencySymbol: string;
}

export interface SystemCatalogPlan {
  id: string;
  name: string;
  type: MembershipPlanType;
  durationDays: number;
  price: number;
  benefits: string[];
  active: boolean;
}

// Multi-Sucursal (Branches)
export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  managerName: string;
  turnstileCount: number;
  activeTurnstiles: number;
  maxCapacity: number;
  currentOccupancy: number;
  activeMembersCount: number;
  todaySalesTotal: number;
  status: 'active' | 'maintenance' | 'closed';
  openTime: string;
  closeTime: string;
  isMainBranch?: boolean;
}

// Gastos & Egresos (Expenses)
export type ExpenseCategory = 
  | 'rent'
  | 'utilities' // Luz, agua, aire acondicionado
  | 'equipment' // Mantenimiento de pesas, poleas, caminadoras
  | 'supplements_stock' // Compra de suplementos a proveedores
  | 'payroll' // Nómina de coaches, recepcionistas, limpieza
  | 'marketing' // Publicidad y redes sociales
  | 'cleaning' // Insumos y sanitización
  | 'other';

export interface Expense {
  id: string;
  folio: string;
  date: string; // ISO date
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paidFromCashRegister: boolean;
  registeredBy: string;
  receiptNumber?: string;
  branchId: string;
  notes?: string;
}

// Notificaciones del Sistema
export type NotificationType = 'warning' | 'info' | 'success' | 'danger';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: NotificationType;
  read: boolean;
  targetTab?: string;
  actionLabel?: string;
}

// Sincronización y Respaldo (Offline-first)
export interface SyncState {
  isOnline: boolean;
  lastSyncedAt: string;
  pendingSyncCount: number;
  isSyncing: boolean;
  storageUsageKb: number;
}

