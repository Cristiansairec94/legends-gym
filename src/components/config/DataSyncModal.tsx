import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Download, 
  Upload, 
  Trash2, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  X,
  Database
} from 'lucide-react';

interface DataSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataSyncModal: React.FC<DataSyncModalProps> = ({ isOpen, onClose }) => {
  const { 
    syncState, 
    toggleOnlineMode, 
    forceSync, 
    storageUsageKb, 
    exportDatabase, 
    importDatabase, 
    resetDatabase 
  } = useGym();

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    const json = exportDatabase();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LEGENDS_GYM_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDatabase(content);
      if (success) {
        setImportStatus('success');
      } else {
        setImportStatus('error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gym-card border border-gym-border rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gym-border pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Database className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">Sincronización & Base de Datos</h3>
              <p className="text-xs text-gym-muted">Motor Offline-First y Respaldo de LEGENDS</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-gym-muted hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4">
          
          {/* Connection Status Card */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            syncState.isOnline 
              ? 'bg-emerald-500/10 border-emerald-500/30' 
              : 'bg-amber-500/10 border-amber-500/30'
          }`}>
            <div className="flex items-center gap-3">
              {syncState.isOnline ? (
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-emerald-400" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <CloudOff className="w-5 h-5 text-amber-400" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${syncState.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="font-black text-sm text-white">
                    {syncState.isOnline ? 'Conexión en Línea' : 'Modo Fuera de Línea'}
                  </span>
                </div>
                <p className="text-[11px] text-gym-muted mt-0.5">
                  {syncState.isOnline 
                    ? 'Sincronizado en tiempo real con servidor central' 
                    : 'Operando localmente. Las ventas y accesos se guardan en el dispositivo.'}
                </p>
              </div>
            </div>

            <button
              onClick={toggleOnlineMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                syncState.isOnline
                  ? 'bg-gym-surface text-gray-300 border-gym-border hover:bg-gym-card'
                  : 'bg-amber-500 text-black border-amber-400'
              }`}
            >
              {syncState.isOnline ? 'Simular Offline' : 'Restablecer Online'}
            </button>
          </div>

          {/* Sync Stats Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-gym-surface/60 border border-gym-border">
              <span className="text-[10px] text-gym-muted uppercase font-bold block">Última Sincronización</span>
              <span className="font-mono text-gray-200 font-semibold block mt-1">
                {new Date(syncState.lastSyncedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-gym-surface/60 border border-gym-border">
              <span className="text-[10px] text-gym-muted uppercase font-bold block">Almacenamiento Local</span>
              <span className="font-mono text-amber-400 font-semibold block mt-1">
                ~{storageUsageKb} KB en disco
              </span>
            </div>
          </div>

          {/* Force Sync Button */}
          <button
            onClick={() => forceSync()}
            disabled={syncState.isSyncing}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs shadow-glow-gold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
            <span>{syncState.isSyncing ? 'Sincronizando registros...' : 'Forzar Sincronización Ahora'}</span>
          </button>

          {/* Backup & Restore Section */}
          <div className="pt-3 border-t border-gym-border space-y-3">
            <span className="text-xs font-bold text-gray-200 block">Copia de Seguridad y Restauración</span>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleDownloadBackup}
                className="py-2.5 px-3 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Exportar JSON</span>
              </button>

              <label className="py-2.5 px-3 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer text-center">
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Importar JSON</span>
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>

            {importStatus === 'success' && (
              <p className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Respaldo importado con éxito. Recargando...
              </p>
            )}
            {importStatus === 'error' && (
              <p className="text-xs text-red-400 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Formato de archivo JSON inválido.
              </p>
            )}
          </div>

          {/* Danger Zone: Factory Reset */}
          <div className="pt-2">
            {!isResetConfirmOpen ? (
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="w-full py-2 px-3 rounded-xl border border-red-500/20 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Restablecer datos de demostración a estado de fábrica</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center space-y-2">
                <p className="text-xs text-red-300 font-bold">
                  ¿Seguro que deseas reiniciar todos los datos locales?
                </p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setIsResetConfirmOpen(false)}
                    className="px-3 py-1 rounded-lg bg-gym-surface text-gym-muted hover:text-white text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={resetDatabase}
                    className="px-3 py-1 rounded-lg bg-red-500 text-white font-bold text-xs"
                  >
                    Sí, Restablecer Todo
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
