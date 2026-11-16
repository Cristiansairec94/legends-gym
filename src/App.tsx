import React, { useState } from 'react';
import { GymProvider, useGym } from './context/GymContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { TurnstileTerminal } from './components/access/TurnstileTerminal';
import { PosTerminal } from './components/pos/PosTerminal';
import { ClientList } from './components/clients/ClientList';
import { InventoryManager } from './components/pos/InventoryManager';
import { CashRegisterView } from './components/dashboard/CashRegisterView';
import { Dashboard } from './components/dashboard/Dashboard';
import { CartDrawer } from './components/pos/CartDrawer';
import { EmployeesManager } from './components/config/EmployeesManager';
import { RolesManager } from './components/config/RolesManager';
import { SystemCatalogs } from './components/config/SystemCatalogs';
import { ProductsCatalog } from './components/products/ProductsCatalog';
import { ExpensesManager } from './components/finance/ExpensesManager';
import { IncomeHistoryView } from './components/finance/IncomeHistoryView';
import { NotificationsDrawer } from './components/layout/NotificationsDrawer';
import { DataSyncModal } from './components/config/DataSyncModal';
import { LoginScreen } from './components/auth/LoginScreen';
import { SupervisorPinModal } from './components/auth/SupervisorPinModal';
import { IndependentTerminalApp } from './components/access/IndependentTerminalApp';
import { Lock } from 'lucide-react';

export const isTerminalMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get('mode') === 'main' || searchParams.get('mode') === 'pos' || searchParams.get('tab') === 'pos') return false;
  if (searchParams.get('mode') === 'terminal' || searchParams.get('terminal') === 'true') return true;
  if (window.location.pathname.toLowerCase().includes('terminal')) return true;
  if (window.location.hash.includes('terminal')) return true;
  if (localStorage.getItem('legends_device_mode') === 'main' || localStorage.getItem('legends_device_mode') === 'pos') return false;
  if (localStorage.getItem('legends_device_mode') === 'terminal') return true;
  if ((window as any).electronAPI?.appMode === 'terminal') return true;
  return false;
};

const getInitialTab = (): string => {
  if (typeof window === 'undefined') return 'dashboard';
  const searchParams = new URLSearchParams(window.location.search);
  const target = searchParams.get('tab') || searchParams.get('mode');
  if (target === 'pos') return 'pos';
  if (target === 'access') return 'access';
  if (target === 'clients') return 'clients';
  if (target === 'catalog') return 'catalog';
  if (target === 'cash') return 'cash';
  if (target === 'incomes') return 'incomes';
  if (target === 'expenses') return 'expenses';
  if (target === 'inventory') return 'inventory';
  return 'dashboard';
};

const MainLayout: React.FC = () => {
  const { isAdmin, activePermissions, canAccessTab, firstAllowedTab } = useGym();
  const [activeTab, setActiveTab] = useState<string>(() => getInitialTab()); 
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const effectiveTab = canAccessTab(activeTab) ? activeTab : firstAllowedTab;
  const hasTabAccess = effectiveTab !== 'none' && canAccessTab(effectiveTab);

  const handleSafeSetActiveTab = (tab: string) => {
    if (canAccessTab(tab)) {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-gym-bg text-gym-text flex flex-col font-sans select-none sm:select-auto">
      
      {/* Top Navbar matching Panadería Brito */}
      <Navbar 
        activeTab={effectiveTab} 
        setActiveTab={handleSafeSetActiveTab} 
        onOpenCart={activePermissions.posSales ? () => setIsCartOpen(true) : undefined}
        onOpenNotifications={isAdmin ? () => setIsNotificationsOpen(true) : undefined}
        onOpenSync={activePermissions.manageSettings ? () => setIsSyncModalOpen(true) : undefined}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar activeTab={effectiveTab} setActiveTab={handleSafeSetActiveTab} />

        {/* Dynamic Main Workspace View */}
        <main className={`flex-1 ${
          hasTabAccess && (effectiveTab === 'pos' || effectiveTab === 'inventory' || effectiveTab === 'cash')
            ? 'p-2 sm:p-2.5 overflow-hidden flex flex-col min-h-0 h-[calc(100vh-61px)]' 
            : hasTabAccess && (effectiveTab === 'incomes' || effectiveTab === 'expenses')
            ? 'overflow-y-auto p-3 sm:p-4 lg:p-5'
            : 'overflow-y-auto p-4 sm:p-6 lg:p-8'
        } bg-gradient-to-b from-gym-bg to-[#07080c]`}>
          <div className={
            hasTabAccess && (effectiveTab === 'pos' || effectiveTab === 'inventory' || effectiveTab === 'cash')
              ? 'w-full h-full min-h-0 flex flex-col max-w-[1800px] mx-auto'
              : hasTabAccess && (effectiveTab === 'incomes' || effectiveTab === 'expenses')
              ? 'max-w-[1800px] mx-auto'
              : 'max-w-7xl mx-auto'
          }>
            {!hasTabAccess ? (
              <div className="p-8 sm:p-12 bg-gym-card rounded-2xl border border-amber-500/30 text-center max-w-lg mx-auto my-12 shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mx-auto mb-4 text-amber-400">
                  <Lock className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-black text-white uppercase tracking-wide">
                  Acceso Restringido al Módulo
                </h2>
                <p className="text-xs text-gym-muted mt-2 leading-relaxed">
                  Tu rol actual no cuenta con los permisos necesarios para visualizar este apartado. Solicita al Administrador General habilitar el permiso correspondiente en Roles & Permisos.
                </p>
              </div>
            ) : (
              <>
                {effectiveTab === 'dashboard' && <Dashboard setActiveTab={handleSafeSetActiveTab} />}
                {effectiveTab === 'access' && <TurnstileTerminal />}
                {effectiveTab === 'pos' && (
                  <PosTerminal 
                    isCartOpen={isCartOpen && activePermissions.posSales} 
                    setIsCartOpen={setIsCartOpen} 
                    onNavigateToCash={canAccessTab('cash') ? () => handleSafeSetActiveTab('cash') : undefined}
                  />
                )}
                {effectiveTab === 'clients' && <ClientList />}
                {effectiveTab === 'catalog' && <ProductsCatalog />}
                {effectiveTab === 'inventory' && <InventoryManager />}
                {effectiveTab === 'incomes' && <IncomeHistoryView />}
                {effectiveTab === 'expenses' && <ExpensesManager />}
                {effectiveTab === 'cash' && <CashRegisterView />}
                
                {/* Configuración Módulos */}
                {effectiveTab === 'config_catalogs' && <SystemCatalogs />}
                {effectiveTab === 'config_roles' && <RolesManager />}
                {effectiveTab === 'config_employees' && <EmployeesManager />}
                {effectiveTab === 'config_sync' && (
                  <div className="space-y-4">
                    <div className="p-6 bg-gym-card rounded-2xl border border-gym-border">
                      <h2 className="text-xl font-black text-white">Sincronización & Base de Datos</h2>
                      <p className="text-xs text-gym-muted mt-1">Configuración del motor de datos offline y respaldos en la nube.</p>
                      <button 
                        onClick={() => setIsSyncModalOpen(true)}
                        className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl"
                      >
                        Abrir Centro de Sincronización y Backup
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Global Quick Cart Drawer */}
      {activePermissions.posSales && (
        <CartDrawer 
          isOpen={isCartOpen && activePermissions.posSales} 
          onClose={() => setIsCartOpen(false)} 
          onSaleCompleted={() => setIsCartOpen(false)} 
        />
      )}

      {/* Global Notifications Drawer (Solo Administrador) */}
      {isAdmin && (
        <NotificationsDrawer 
          isOpen={isNotificationsOpen && isAdmin}
          onClose={() => setIsNotificationsOpen(false)}
          onNavigateTab={(tab) => handleSafeSetActiveTab(tab)}
        />
      )}

      {/* Global Cloud Sync & Database Backup Modal */}
      {activePermissions.manageSettings && (
        <DataSyncModal
          isOpen={isSyncModalOpen && activePermissions.manageSettings}
          onClose={() => setIsSyncModalOpen(false)}
        />
      )}

      {/* Global Supervisor PIN Authorization Modal for Critical Operations */}
      <SupervisorPinModal />

    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useGym();
  const [terminalMode] = useState<boolean>(() => isTerminalMode());

  // Independent Turnstile terminal mode for separate computer
  if (terminalMode) {
    return <IndependentTerminalApp />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <MainLayout />;
};

export default function App() {
  return (
    <GymProvider>
      <AppContent />
    </GymProvider>
  );
}
