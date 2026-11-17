import { Users, Zap } from 'lucide-react';
﻿import React, { useState } from 'react';
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
import { TerminalDesignStudio } from './components/config/TerminalDesignStudio';
import { ProductsCatalog } from './components/products/ProductsCatalog';
import { ExpensesManager } from './components/finance/ExpensesManager';
import { IncomeHistoryView } from './components/finance/IncomeHistoryView';
import { NotificationsDrawer } from './components/layout/NotificationsDrawer';
import { DataSyncModal } from './components/config/DataSyncModal';
import { LoginScreen } from './components/auth/LoginScreen';
import { SupervisorPinModal } from './components/auth/SupervisorPinModal';
import { IndependentTerminalApp } from './components/access/IndependentTerminalApp';
import { VisitAuthorizationBanner } from './components/access/VisitAuthorizationBanner';
import { BorderlessFullscreenControl } from './components/layout/BorderlessFullscreenControl';
import gymDumbbellBg from './assets/gym-dumbbell-background.jpg';

export const isClientsMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get('mode') === 'clients' || searchParams.get('tab') === 'clients') return true;
  return false;
};

export const isTerminalMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const searchParams = new URLSearchParams(window.location.search);
  const queryMode = searchParams.get('mode');
  if (queryMode === 'main' || queryMode === 'pos' || searchParams.get('tab') === 'pos') return false;
  if (queryMode === 'terminal' || searchParams.get('terminal') === 'true') return true;
  const electronAppMode = (window as any).electronAPI?.appMode;
  if (electronAppMode === 'main') return false;
  if (electronAppMode === 'terminal') return true;
  const fileName = window.location.pathname.split('/').pop()?.toLowerCase() || '';
  if (fileName.includes('terminal')) return true;
  if (window.location.hash.includes('terminal')) return true;
  if (localStorage.getItem('legends_device_mode') === 'main' || localStorage.getItem('legends_device_mode') === 'pos') return false;
  if (localStorage.getItem('legends_device_mode') === 'terminal') return true;
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
  const { currentRole } = useGym();
  const [activeTab, setActiveTab] = useState<string>(() => getInitialTab()); 
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Role permissions fallback
  React.useEffect(() => {
    if (currentRole === 'trainer' && (
      activeTab === 'pos' || 
      activeTab === 'cash' || 
      activeTab === 'inventory' || 
      activeTab === 'catalog' || 
      activeTab === 'expenses' ||
      activeTab === 'incomes' ||
      activeTab.startsWith('config_')
    )) {
      setActiveTab('access');
    }
  }, [currentRole, activeTab]);

  return (
    <div className="min-h-screen bg-[#07080b] text-gym-text flex flex-col font-sans select-none sm:select-auto relative overflow-hidden">
      {/* Background Layer: Gym Dumbbells Texture & Ambient Lighting (OpciÃ³n 1) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          src={gymDumbbellBg}
          alt="Gym Dumbbell Background"
          className="w-full h-full object-cover filter brightness-[0.38] contrast-[1.12] saturate-[0.85]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,rgba(245,158,11,0.08)_0%,rgba(0,0,0,0.65)_70%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/70" />
      </div>
      
      {/* Top Navbar matching Panadería Brito */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenCart={() => setIsCartOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(prev => !prev)}
        onOpenSync={() => setIsSyncModalOpen(true)}
      />

      {/* Floating Real-Time Visit Pass / Registration Waiting Notice */}
      <VisitAuthorizationBanner
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        isHidden={isNotificationsOpen}
      />

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dynamic Main Workspace View */}
        <main className={`flex-1 ${
          activeTab === 'pos' 
            ? 'p-2 sm:p-2.5 overflow-hidden flex flex-col h-[calc(100vh-61px)]' 
            : 'overflow-y-auto p-4 sm:p-6 lg:p-8'
        } bg-black/25 backdrop-blur-[0.5px]`}>
          <div className={activeTab === 'pos' ? 'w-full h-full flex flex-col max-w-[1800px] mx-auto' : 'max-w-7xl mx-auto'}>
            {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
            {activeTab === 'access' && <TurnstileTerminal />}
            {activeTab === 'pos' && (
              <PosTerminal 
                isCartOpen={isCartOpen} 
                setIsCartOpen={setIsCartOpen} 
                onNavigateToCash={() => setActiveTab('cash')}
              />
            )}
            {activeTab === 'clients' && <ClientList />}
            {activeTab === 'catalog' && <ProductsCatalog />}
            {activeTab === 'inventory' && <InventoryManager />}
            {activeTab === 'incomes' && <IncomeHistoryView />}
            {activeTab === 'expenses' && <ExpensesManager />}
            {activeTab === 'cash' && <CashRegisterView />}
            
            {/* Configuración Módulos */}
            {activeTab === 'config_catalogs' && <SystemCatalogs section="plans" />}
            {activeTab === 'config_gym_tickets' && <SystemCatalogs section="gym" />}
            {activeTab === 'config_biometrics' && <SystemCatalogs section="turnstile" />}
            {activeTab === 'config_terminal_design' && <TerminalDesignStudio />}
            {activeTab === 'config_roles' && <RolesManager />}
            {activeTab === 'config_employees' && <EmployeesManager />}
            {activeTab === 'config_sync' && (
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
          </div>
        </main>
      </div>

      {/* Global Quick Cart Drawer */}
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        onSaleCompleted={() => setIsCartOpen(false)} 
      />

      {/* Global Notifications Drawer */}
      <NotificationsDrawer 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Global Cloud Sync & Database Backup Modal */}
      <DataSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      {/* Global Supervisor PIN Authorization Modal for Critical Operations */}
      <SupervisorPinModal />

    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useGym();
  const [terminalMode] = useState<boolean>(() => isTerminalMode());
  const [terminalView, setTerminalView] = useState<'terminal' | 'clients'>('terminal');

  // Independent Turnstile terminal mode for separate computer
  if (terminalMode) {
    return <IndependentTerminalApp />;
  }

  return (
    <>
      <BorderlessFullscreenControl
        revealKey={isAuthenticated}
        alignNavbarGap={isAuthenticated}
      />
      {isAuthenticated ? <MainLayout /> : <LoginScreen />}
    </>
  );
};

export default function App() {
  return (
    <GymProvider>
      <AppContent />
    </GymProvider>
  );
}
