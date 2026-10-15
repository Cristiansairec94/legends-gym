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
  SystemNotification,
  SecurityAuditEvent
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
import { getGymAvatar, serializeGymAvatar } from '../utils/genderAvatar';
import { hashSecret, signSessionPayload, verifySessionSignature } from '../utils/securityCrypto';

const KEYS = {
  MEMBERS: 'legends_members_v1',
  DELETED_MEMBER_IDS: 'legends_deleted_member_ids_v1',
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
  LAST_SYNC: 'legends_last_sync_v1',
  CURRENT_USER: 'legends_current_user_v1',
  TAB_SESSION_USER: 'legends_tab_session_user_v1',
  TAB_SESSION_TOKEN: 'legends_tab_session_token_v1',
  ACTIVE_SESSION_LOCK: 'legends_active_session_lock_v1',
  SECURITY_ALERT: 'legends_security_alert_v1',
  SECURITY_AUDIT: 'legends_security_audit_v1',
  LOGIN_LOCKOUT: 'legends_login_lockout_v1'
};


export const storage = {
  getDeletedMemberIds(): string[] {
    try {
      const raw = localStorage.getItem(KEYS.DELETED_MEMBER_IDS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  addDeletedMemberId(id: string): void {
    try {
      const current = this.getDeletedMemberIds();
      if (!current.includes(id)) {
        localStorage.setItem(KEYS.DELETED_MEMBER_IDS, JSON.stringify([...current, id]));
      }
    } catch {}
  },

  getMembers(): Client[] {
    try {
      const deletedIds = this.getDeletedMemberIds();
      const data = localStorage.getItem(KEYS.MEMBERS);
      const savedList: Client[] = data ? JSON.parse(data) : [];
      const mergedMap = new Map<string, Client>();

      // Ensure baseline INITIAL_MEMBERS (including Juan Solis MEM-008) are present unless explicitly deleted
      for (const initM of INITIAL_MEMBERS) {
        if (!deletedIds.includes(initM.id)) {
          mergedMap.set(initM.id, initM);
        }
      }

      // Overlay saved members (preserving any custom members or edits)
      for (const savedM of savedList) {
        if (savedM && savedM.id && !deletedIds.includes(savedM.id)) {
          mergedMap.set(savedM.id, { ...(mergedMap.get(savedM.id) || {}), ...savedM });
        }
      }

      const list = Array.from(mergedMap.values());
      return list.map(m => ({
        ...m,
        biometricRegistered: m.biometricRegistered !== undefined ? m.biometricRegistered : true,
        biometricHash: m.biometricHash || `BIO_HASH_${m.id}`,
        biometricTemplate: m.biometricTemplate || `FP_THUMB_RIGHT_${m.id}`,
        avatarUrl: getGymAvatar(m.fullName, m.avatarUrl)
      }));
    } catch {
      return INITIAL_MEMBERS.map(m => ({
        ...m,
        avatarUrl: getGymAvatar(m.fullName, m.avatarUrl)
      }));
    }
  },

  saveMembers(members: Client[]): void {
    try {
      const compact = members.map(m => ({
        ...m,
        avatarUrl: serializeGymAvatar(m.avatarUrl)
      }));
      localStorage.setItem(KEYS.MEMBERS, JSON.stringify(compact));
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
      if (data) {
        const parsed: CashRegisterSession = JSON.parse(data);
        return {
          ...parsed,
          totalMembershipsTransfer: parsed.totalMembershipsTransfer || 0
        };
      }

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
        totalMembershipsTransfer: 0,
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
        totalMembershipsTransfer: 0,
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

  // Current User / Single-Tab Secure Session
  validateOrKillTabSession(): Employee | null {
    try {
      if (typeof window === 'undefined') return null;
      const searchParams = new URLSearchParams(window.location.search);
      if (
        searchParams.get('mode') === 'terminal' ||
        searchParams.get('terminal') === 'true' ||
        window.location.hash.includes('terminal') ||
        localStorage.getItem('legends_device_mode') === 'terminal'
      ) {
        return null;
      }

      const rawLock = localStorage.getItem(KEYS.ACTIVE_SESSION_LOCK);
      const legacyUser = localStorage.getItem(KEYS.CURRENT_USER);
      const tabToken = sessionStorage.getItem(KEYS.TAB_SESSION_TOKEN);
      const tabUserRaw = sessionStorage.getItem(KEYS.TAB_SESSION_USER);
      const winName = window.name || '';

      // If legacy localStorage session exists without a valid tab lock, kill it immediately
      if (legacyUser && !rawLock) {
        localStorage.removeItem(KEYS.CURRENT_USER);
      }

      if (rawLock) {
        const lock = JSON.parse(rawLock);
        const isSameTab =
          Boolean(tabToken) &&
          Boolean(tabUserRaw) &&
          tabToken === lock.token &&
          winName === lock.token;

        if (!isSameTab) {
          // Security Violation: URL was copied & pasted into a new tab or duplicated!
          const breachMsg =
            '⚠️ Sesión cerrada por seguridad: Se detectó el intento de copiar y abrir el enlace en otra pestaña o ventana. Por protección del sistema, debes iniciar sesión nuevamente.';
          localStorage.removeItem(KEYS.ACTIVE_SESSION_LOCK);
          localStorage.removeItem(KEYS.CURRENT_USER);
          sessionStorage.removeItem(KEYS.TAB_SESSION_USER);
          sessionStorage.removeItem(KEYS.TAB_SESSION_TOKEN);
          window.name = '';
          this.setSecurityAlert(breachMsg);
          this.addSecurityAuditLog({
            type: 'MULTI_TAB_BREACH',
            userName: lock.userName || 'Usuario Activo',
            role: lock.role,
            details: 'Cierre forzoso: Intento de abrir enlace copiado en nueva pestaña/ventana.'
          });
          return null;
        }

        const tabUser: Employee = JSON.parse(tabUserRaw!);
        const isSignatureValid = verifySessionSignature(
          tabUser.id,
          tabUser.role,
          tabUser.email,
          lock.token,
          lock.signature
        );

        if (!isSignatureValid || tabUser.role !== lock.role || tabUser.id !== lock.userId) {
          const tamperMsg =
            '🚨 Alerta Crítica: Se detectó manipulación de sesión o intento de alteración de permisos en el navegador (DevTools). La sesión ha sido revocada.';
          localStorage.removeItem(KEYS.ACTIVE_SESSION_LOCK);
          localStorage.removeItem(KEYS.CURRENT_USER);
          sessionStorage.removeItem(KEYS.TAB_SESSION_USER);
          sessionStorage.removeItem(KEYS.TAB_SESSION_TOKEN);
          window.name = '';
          this.setSecurityAlert(tamperMsg);
          this.addSecurityAuditLog({
            type: 'SESSION_TAMPER',
            userName: lock.userName || tabUser.fullName,
            role: lock.role,
            details: 'Firma criptográfica inválida: Intento de alterar sesión o rol desde consola F12.'
          });
          return null;
        }

        return tabUser;
      }

      // Clean any orphan tab storage if global lock was cleared
      if (tabToken || tabUserRaw) {
        sessionStorage.removeItem(KEYS.TAB_SESSION_USER);
        sessionStorage.removeItem(KEYS.TAB_SESSION_TOKEN);
        window.name = '';
      }
      return null;
    } catch {
      return null;
    }
  },

  getCurrentUser(): Employee | null {
    return this.validateOrKillTabSession();
  },

  saveCurrentUser(user: Employee | null): void {
    try {
      if (typeof window === 'undefined') return;
      if (user) {
        let token = sessionStorage.getItem(KEYS.TAB_SESSION_TOKEN);
        if (!token || window.name !== token) {
          token = `SESS_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        }
        const signature = signSessionPayload(user.id, user.role, user.email, token);
        const sanitizedSessionUser: Employee = {
          ...user,
          password: user.password ? hashSecret(user.password) : undefined,
          pin: user.pin ? hashSecret(user.pin) : undefined
        };
        sessionStorage.setItem(KEYS.TAB_SESSION_USER, JSON.stringify(sanitizedSessionUser));
        sessionStorage.setItem(KEYS.TAB_SESSION_TOKEN, token);
        window.name = token;
        localStorage.setItem(
          KEYS.ACTIVE_SESSION_LOCK,
          JSON.stringify({
            token,
            signature,
            userId: user.id,
            userName: user.fullName,
            role: user.role,
            issuedAt: Date.now()
          })
        );
        localStorage.removeItem(KEYS.CURRENT_USER);
      } else {
        sessionStorage.removeItem(KEYS.TAB_SESSION_USER);
        sessionStorage.removeItem(KEYS.TAB_SESSION_TOKEN);
        window.name = '';
        localStorage.removeItem(KEYS.ACTIVE_SESSION_LOCK);
        localStorage.removeItem(KEYS.CURRENT_USER);
      }
    } catch (e) {
      console.error('Error saving current user:', e);
    }
  },

  getSecurityAlert(): string | null {
    try {
      return localStorage.getItem(KEYS.SECURITY_ALERT);
    } catch {
      return null;
    }
  },

  setSecurityAlert(message: string | null): void {
    try {
      if (message) {
        localStorage.setItem(KEYS.SECURITY_ALERT, message);
      } else {
        localStorage.removeItem(KEYS.SECURITY_ALERT);
      }
    } catch {
      // ignore
    }
  },

  getSecurityAuditLogs(): SecurityAuditEvent[] {
    try {
      const raw = localStorage.getItem(KEYS.SECURITY_AUDIT);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  addSecurityAuditLog(event: Omit<SecurityAuditEvent, 'id' | 'timestamp'>): void {
    try {
      const current = this.getSecurityAuditLogs();
      const newEvent: SecurityAuditEvent = {
        ...event,
        id: `SEC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString()
      };
      const updated = [newEvent, ...current].slice(0, 25);
      localStorage.setItem(KEYS.SECURITY_AUDIT, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  getLoginLockout(): { attempts: number; lockoutUntil: number } {
    try {
      const raw = localStorage.getItem(KEYS.LOGIN_LOCKOUT);
      if (!raw) return { attempts: 0, lockoutUntil: 0 };
      const parsed = JSON.parse(raw);
      if (parsed.lockoutUntil && Date.now() >= parsed.lockoutUntil) {
        localStorage.removeItem(KEYS.LOGIN_LOCKOUT);
        return { attempts: 0, lockoutUntil: 0 };
      }
      return {
        attempts: parsed.attempts || 0,
        lockoutUntil: parsed.lockoutUntil || 0
      };
    } catch {
      return { attempts: 0, lockoutUntil: 0 };
    }
  },

  recordFailedLoginAttempt(identifier?: string): { attempts: number; lockoutUntil: number; justLocked: boolean } {
    const current = this.getLoginLockout();
    const nextAttempts = current.attempts + 1;
    const MAX_ATTEMPTS = 3;
    const LOCKOUT_MS = 30 * 1000; // 30 seconds lockout
    let lockoutUntil = current.lockoutUntil;
    let justLocked = false;

    if (nextAttempts >= MAX_ATTEMPTS) {
      lockoutUntil = Date.now() + LOCKOUT_MS;
      justLocked = true;
      this.addSecurityAuditLog({
        type: 'BRUTE_FORCE_LOCK',
        userIdentifier: identifier || 'Desconocido',
        details: `Terminal bloqueada por 30s tras ${nextAttempts} intentos fallidos consecutivos.`
      });
    } else {
      this.addSecurityAuditLog({
        type: 'LOGIN_FAILED',
        userIdentifier: identifier || 'Desconocido',
        details: `Intento fallido de inicio de sesión (${nextAttempts}/${MAX_ATTEMPTS}).`
      });
    }

    const nextState = { attempts: nextAttempts, lockoutUntil };
    try {
      localStorage.setItem(KEYS.LOGIN_LOCKOUT, JSON.stringify(nextState));
    } catch {
      // ignore
    }
    return { ...nextState, justLocked };
  },

  resetLoginAttempts(): void {
    try {
      localStorage.removeItem(KEYS.LOGIN_LOCKOUT);
    } catch {
      // ignore
    }
  },

  // Employees (with cryptographic hashing for stored passwords & PINs)
  getEmployees(): Employee[] {
    try {
      const data = localStorage.getItem(KEYS.EMPLOYEES);
      if (!data) {
        return INITIAL_EMPLOYEES.map((emp) => ({
          ...emp,
          password: hashSecret(emp.password || '1234'),
          pin: hashSecret(emp.pin || '1234')
        }));
      }
      const parsed: Employee[] = JSON.parse(data);
      return parsed.map((emp) => {
        const initial = INITIAL_EMPLOYEES.find(
          (ie) => ie.id === emp.id || ie.email.toLowerCase() === emp.email.toLowerCase()
        );
        return {
          ...emp,
          password: hashSecret(emp.password || initial?.password || '1234'),
          pin: hashSecret(emp.pin || initial?.pin || '1234'),
          username: emp.username || initial?.username || emp.email.split('@')[0],
        };
      });
    } catch {
      return INITIAL_EMPLOYEES;
    }
  },

  saveEmployees(employees: Employee[]): void {
    try {
      const hashedEmployees = employees.map((emp) => ({
        ...emp,
        password: emp.password ? hashSecret(emp.password) : undefined,
        pin: emp.pin ? hashSecret(emp.pin) : undefined
      }));
      localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(hashedEmployees));
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

