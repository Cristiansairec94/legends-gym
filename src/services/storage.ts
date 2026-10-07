import { 
  Client, 
  Product, 
  Sale, 
  AccessLog, 
  CashRegisterSession, 
  UserRole,
  Employee,
  RoleDefinition,
  GymSettings,
  SystemCatalogPlan,
  Branch,
  Expense,
  SystemNotification
} from '../types';
import { INITIAL_MEMBERS } from '../data/initialMembers';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { 
  INITIAL_EMPLOYEES, 
  INITIAL_ROLES, 
  INITIAL_SETTINGS, 
  INITIAL_CATALOG_PLANS 
} from '../data/initialEmployees';
import { INITIAL_BRANCHES } from '../data/initialBranches';
import { INITIAL_EXPENSES } from '../data/initialExpenses';

const KEYS = {
  MEMBERS: 'legends_members_v1',
  PRODUCTS: 'legends_products_v1',
  SALES: 'legends_sales_v1',
  ACCESS_LOGS: 'legends_access_logs_v1',
  CASH_SESSION: 'legends_cash_session_v1',
  ACTIVE_ROLE: 'legends_active_role_v1',
  EMPLOYEES: 'legends_employees_v1',
  ROLES: 'legends_roles_v1',
  SETTINGS: 'legends_settings_v1',
  CATALOG_PLANS: 'legends_catalog_plans_v1',
  BRANCHES: 'legends_branches_v1',
  ACTIVE_BRANCH_ID: 'legends_active_branch_id_v1',
  EXPENSES: 'legends_expenses_v1',
  NOTIFICATIONS: 'legends_notifications_v1',
  LAST_SYNC: 'legends_last_sync_v1'
};


export const storage = {
  getMembers(): Client[] {
    try {
      const data = localStorage.getItem(KEYS.MEMBERS);
      return data ? JSON.parse(data) : INITIAL_MEMBERS;
    } catch {
      return INITIAL_MEMBERS;
    }
  },

  saveMembers(members: Client[]): void {
    try {
      localStorage.setItem(KEYS.MEMBERS, JSON.stringify(members));
    } catch (e) {
      console.error('Error saving members:', e);
    }
  },

  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(KEYS.PRODUCTS);
      return data ? JSON.parse(data) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  },

  saveProducts(products: Product[]): void {
    try {
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Error saving products:', e);
    }
  },

  getSales(): Sale[] {
    try {
      const data = localStorage.getItem(KEYS.SALES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSales(sales: Sale[]): void {
    try {
      localStorage.setItem(KEYS.SALES, JSON.stringify(sales));
    } catch (e) {
      console.error('Error saving sales:', e);
    }
  },

  getAccessLogs(): AccessLog[] {
    try {
      const data = localStorage.getItem(KEYS.ACCESS_LOGS);
      if (data) return JSON.parse(data);

      return [
        {
          id: 'LOG-001',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          clientId: 'MEM-001',
          clientName: 'Carlos Mendoza',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          status: 'granted',
          reason: 'Acceso Autorizado - Membresía Black VIP',
          planName: 'Membresía Black VIP Anual',
          daysRemaining: 95,
          method: 'fingerprint',
        },
        {
          id: 'LOG-002',
          timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
          clientId: 'MEM-002',
          clientName: 'Valeria Ríos Gómez',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
          status: 'granted',
          reason: 'Acceso Autorizado - Mensualidad',
          planName: 'Mensualidad Estándar',
          daysRemaining: 18,
          method: 'fingerprint',
        },
        {
          id: 'LOG-003',
          timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          clientId: 'MEM-004',
          clientName: 'Sofía Domínguez',
          avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
          status: 'denied',
          reason: 'Acceso Denegado: Cuota vencida hace 5 días',
          planName: 'Mensualidad Estándar',
          daysRemaining: -5,
          method: 'fingerprint',
        },
      ];
    } catch {
      return [];
    }
  },

  saveAccessLogs(logs: AccessLog[]): void {
    try {
      localStorage.setItem(KEYS.ACCESS_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error('Error saving access logs:', e);
    }
  },

  getCashSession(): CashRegisterSession {
    try {
      const data = localStorage.getItem(KEYS.CASH_SESSION);
      if (data) return JSON.parse(data);

      return {
        id: 'CAJA-' + new Date().toISOString().slice(0, 10),
        openedAt: new Date(new Date().setHours(6, 0, 0, 0)).toISOString(),
        openedBy: 'Recepción Central',
        initialCash: 1500,
        totalSalesCash: 850,
        totalSalesCard: 1450,
        totalSalesTransfer: 680,
        totalMembershipsCash: 1700,
        totalMembershipsCard: 9500,
        expectedCash: 4050,
        status: 'open',
      };
    } catch {
      return {
        id: 'CAJA-DEFAULT',
        openedAt: new Date().toISOString(),
        openedBy: 'Recepción',
        initialCash: 1000,
        totalSalesCash: 0,
        totalSalesCard: 0,
        totalSalesTransfer: 0,
        totalMembershipsCash: 0,
        totalMembershipsCard: 0,
        expectedCash: 1000,
        status: 'open',
      };
    }
  },

  saveCashSession(session: CashRegisterSession): void {
    try {
      localStorage.setItem(KEYS.CASH_SESSION, JSON.stringify(session));
    } catch (e) {
      console.error('Error saving cash session:', e);
    }
  },

  getActiveRole(): UserRole {
    try {
      const r = localStorage.getItem(KEYS.ACTIVE_ROLE) as UserRole;
      return (r === 'admin' || r === 'receptionist' || r === 'trainer') ? r : 'admin';
    } catch {
      return 'admin';
    }
  },

  saveActiveRole(role: UserRole): void {
    try {
      localStorage.setItem(KEYS.ACTIVE_ROLE, role);
    } catch (e) {
      console.error('Error saving role:', e);
    }
  },

  // Employees
  getEmployees(): Employee[] {
    try {
      const data = localStorage.getItem(KEYS.EMPLOYEES);
      return data ? JSON.parse(data) : INITIAL_EMPLOYEES;
    } catch {
      return INITIAL_EMPLOYEES;
    }
  },

  saveEmployees(employees: Employee[]): void {
    try {
      localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));
    } catch (e) {
      console.error('Error saving employees:', e);
    }
  },

  // Roles
  getRoles(): RoleDefinition[] {
    try {
      const data = localStorage.getItem(KEYS.ROLES);
      return data ? JSON.parse(data) : INITIAL_ROLES;
    } catch {
      return INITIAL_ROLES;
    }
  },

  saveRoles(roles: RoleDefinition[]): void {
    try {
      localStorage.setItem(KEYS.ROLES, JSON.stringify(roles));
    } catch (e) {
      console.error('Error saving roles:', e);
    }
  },

  // Settings
  getSettings(): GymSettings {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      return data ? JSON.parse(data) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  },

  saveSettings(settings: GymSettings): void {
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  },

  // Catalog Plans
  getCatalogPlans(): SystemCatalogPlan[] {
    try {
      const data = localStorage.getItem(KEYS.CATALOG_PLANS);
      return data ? JSON.parse(data) : INITIAL_CATALOG_PLANS;
    } catch {
      return INITIAL_CATALOG_PLANS;
    }
  },

  saveCatalogPlans(plans: SystemCatalogPlan[]): void {
    try {
      localStorage.setItem(KEYS.CATALOG_PLANS, JSON.stringify(plans));
    } catch (e) {
      console.error('Error saving catalog plans:', e);
    }
  },

  // Multi-Sucursal (Branches)
  getBranches(): Branch[] {
    try {
      const data = localStorage.getItem(KEYS.BRANCHES);
      return data ? JSON.parse(data) : INITIAL_BRANCHES;
    } catch {
      return INITIAL_BRANCHES;
    }
  },

  saveBranches(branches: Branch[]): void {
    try {
      localStorage.setItem(KEYS.BRANCHES, JSON.stringify(branches));
    } catch (e) {
      console.error('Error saving branches:', e);
    }
  },

  getActiveBranchId(): string {
    try {
      return localStorage.getItem(KEYS.ACTIVE_BRANCH_ID) || 'branch-matriz';
    } catch {
      return 'branch-matriz';
    }
  },

  saveActiveBranchId(branchId: string): void {
    try {
      localStorage.setItem(KEYS.ACTIVE_BRANCH_ID, branchId);
    } catch (e) {
      console.error('Error saving active branch id:', e);
    }
  },

  // Gastos (Expenses)
  getExpenses(): Expense[] {
    try {
      const data = localStorage.getItem(KEYS.EXPENSES);
      return data ? JSON.parse(data) : INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  },

  saveExpenses(expenses: Expense[]): void {
    try {
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
    } catch (e) {
      console.error('Error saving expenses:', e);
    }
  },

  // Notificaciones
  getNotifications(): SystemNotification[] {
    try {
      const data = localStorage.getItem(KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveNotifications(notifications: SystemNotification[]): void {
    try {
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch (e) {
      console.error('Error saving notifications:', e);
    }
  },

  // Sincronización & Backup
  getLastSyncDate(): string {
    try {
      return localStorage.getItem(KEYS.LAST_SYNC) || new Date().toISOString();
    } catch {
      return new Date().toISOString();
    }
  },

  saveLastSyncDate(dateStr: string): void {
    try {
      localStorage.setItem(KEYS.LAST_SYNC, dateStr);
    } catch (e) {
      console.error('Error saving last sync date:', e);
    }
  },

  getStorageUsageKb(): number {
    try {
      let totalLength = 0;
      for (const key of Object.values(KEYS)) {
        const item = localStorage.getItem(key);
        if (item) totalLength += item.length * 2; // UTF-16 bytes approx
      }
      return Math.round(totalLength / 1024);
    } catch {
      return 124;
    }
  },

  exportDatabaseJson(): string {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      gymName: 'LEGENDS PRO GYM',
      members: this.getMembers(),
      products: this.getProducts(),
      sales: this.getSales(),
      accessLogs: this.getAccessLogs(),
      cashSession: this.getCashSession(),
      employees: this.getEmployees(),
      roles: this.getRoles(),
      settings: this.getSettings(),
      catalogPlans: this.getCatalogPlans(),
      branches: this.getBranches(),
      expenses: this.getExpenses()
    };
    return JSON.stringify(backup, null, 2);
  },

  importDatabaseJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.members) this.saveMembers(data.members);
      if (data.products) this.saveProducts(data.products);
      if (data.sales) this.saveSales(data.sales);
      if (data.accessLogs) this.saveAccessLogs(data.accessLogs);
      if (data.cashSession) this.saveCashSession(data.cashSession);
      if (data.employees) this.saveEmployees(data.employees);
      if (data.roles) this.saveRoles(data.roles);
      if (data.settings) this.saveSettings(data.settings);
      if (data.catalogPlans) this.saveCatalogPlans(data.catalogPlans);
      if (data.branches) this.saveBranches(data.branches);
      if (data.expenses) this.saveExpenses(data.expenses);
      return true;
    } catch (e) {
      console.error('Failed to import database:', e);
      return false;
    }
  },

  resetAll(): void {
    Object.values(KEYS).forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (err) {
        console.error('Failed to remove key', k, err);
      }
    });
  }
};

