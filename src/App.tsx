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

const MainLayout: React.FC = () => {
  const { currentRole } = useGym();
  const [activeTab, setActiveTab] = useState<string>('dashboard'); 
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
    <div className="min-h-screen bg-gym-bg text-gym-text flex flex-col font-sans select-none sm:select-auto">
      
      {/* Top Navbar matching Panadería Brito */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenCart={() => setIsCartOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenSync={() => setIsSyncModalOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dynamic Main Workspace View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-gym-bg to-[#07080c]">
          <div className="max-w-7xl mx-auto">
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
            {activeTab === 'config_catalogs' && <SystemCatalogs />}
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

    </div>
  );
};

export default function App() {
  return (
    <GymProvider>
      <MainLayout />
    </GymProvider>
  );
}
