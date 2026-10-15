import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Server, 
  RefreshCw, 
  Upload, 
  Download, 
  Volume2, 
  VolumeX, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Database,
  Cpu,
  Save
} from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { checkServerHealth, getResolvedServerUrl, CLOUD_SERVER_URL } from '../../services/syncService';

export interface TerminalConfig {
  serverUrl: string;
  autoSync: boolean;
  syncIntervalSeconds: number;
  voiceEnabled: boolean;
  soundVolume: number; // 0 to 1
  relayPulseDurationSeconds: number;
  terminalName: string;
  isOnlineMode: boolean;
}

const STORAGE_KEY_TERMINAL_CONFIG = 'legends_terminal_standalone_config_v1';

export const getTerminalConfig = (): TerminalConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TERMINAL_CONFIG);
    if (saved) return JSON.parse(saved);
  } catch {
    // fallback
  }
  return {
    serverUrl: getResolvedServerUrl(),
    autoSync: true,
    syncIntervalSeconds: 3,
    voiceEnabled: true,
    soundVolume: 0.9,
    relayPulseDurationSeconds: 4,
    terminalName: 'Terminal Principal - Entrada A',
    isOnlineMode: false,
  };
};

export const saveTerminalConfig = (config: TerminalConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY_TERMINAL_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving terminal config:', e);
  }
};

interface TerminalSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TerminalConfig;
  onSaveConfig: (newConfig: TerminalConfig) => void;
  onManualSync: () => Promise<boolean>;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  serverStatus: 'connected' | 'disconnected' | 'checking';
}

export const TerminalSyncModal: React.FC<TerminalSyncModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onManualSync,
  isSyncing,
  lastSyncTime,
  serverStatus,
}) => {
  const { members, accessLogs, importDatabase, exportDatabase } = useGym();
  const [formData, setFormData] = useState<TerminalConfig>(config);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const health = await checkServerHealth(formData.serverUrl);
      if (health.online) {
        setTestResult({
          success: true,
          message: `¡Conexión establecida con éxito! Servidor activo con ${health.membersCount ?? 0} socios registrados (v${health.version ?? 1}).`,
        });
      } else {
        setTestResult({
          success: false,
          message: `No se pudo conectar al servidor en ${formData.serverUrl} (${health.error || 'Sin respuesta'}). Verifique la IP o active el modo autónomo.`,
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: `Error al probar conexión en ${formData.serverUrl}. Verifique que el servidor central esté encendido.`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveConfig(formData);
    onClose();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const ok = importDatabase(json);
        if (ok) {
          setImportStatus('¡Base de socios importada con éxito desde archivo!');
          setTimeout(() => setImportStatus(null), 4000);
        } else {
          setImportStatus('Error: El archivo no contiene un formato de respaldo válido.');
        }
      } catch {
        setImportStatus('Error al leer el archivo seleccionado.');
      }
    };
    reader.readAsText(file);
  };

  const handleExportLogs = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(accessLogs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `accesos_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gym-border flex items-center justify-between bg-gym-surface/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white tracking-wide uppercase flex items-center gap-2">
                <span>Configuración de Terminal Independiente</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Equipo Standalone
                </span>
              </h3>
              <p className="text-xs text-gym-muted mt-0.5">
                Ajustes de red local (LAN), sincronización de socios y periféricos de acceso
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gym-surface hover:bg-gym-border text-gym-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Status summary banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-gym-surface/80 border border-gym-border">
              <span className="text-[11px] font-bold text-gym-muted block mb-1">Estado de Enlace LAN</span>
              <div className="flex items-center gap-2">
                {serverStatus === 'connected' ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-400">Enlazado a Servidor</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-xs font-bold text-amber-300">Modo Autónomo Local</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gym-surface/80 border border-gym-border">
              <span className="text-[11px] font-bold text-gym-muted block mb-1">Socios en Caché Local</span>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-white font-mono">{members.length} socios listos</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gym-surface/80 border border-gym-border">
              <span className="text-[11px] font-bold text-gym-muted block mb-1">Última Sincronización</span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gym-muted" />
                <span className="text-xs font-mono text-gray-300">
                  {lastSyncTime ? lastSyncTime.toLocaleTimeString('es-MX') : 'Reciente'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: LAN Server Configuration */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Server className="w-4 h-4" />
              <span>Conexión con Equipo Principal (Sistema Central)</span>
            </h4>

            <div className="bg-gym-surface/50 p-4 rounded-xl border border-gym-border space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Dirección IP o URL del Servidor Central:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.serverUrl}
                    onChange={(e) => setFormData({ ...formData, serverUrl: e.target.value })}
                    placeholder="Ej. http://192.168.1.50:5173 o http://localhost:5173"
                    className="flex-1 px-3 py-2 bg-gym-bg rounded-xl border border-gym-border text-sm text-white font-mono focus:outline-none focus:border-amber-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-3.5 py-2 rounded-xl bg-gym-surface hover:bg-gym-border border border-gym-border text-xs font-bold text-amber-400 transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                    <span>Probar Ping</span>
                  </button>
                </div>
                
                {/* Quick Server Presets */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[11px] text-gym-muted">Servidores sugeridos:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, serverUrl: CLOUD_SERVER_URL });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                      formData.serverUrl === CLOUD_SERVER_URL
                        ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                        : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    ☁️ Servidor Nube (Vercel)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, serverUrl: 'http://localhost:3001' });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                      formData.serverUrl === 'http://localhost:3001'
                        ? 'bg-white/20 text-white border-white/40 shadow-sm'
                        : 'bg-gym-bg hover:bg-gym-surface text-gray-300 border-gym-border'
                    }`}
                  >
                    🏠 Servidor Local (PC)
                  </button>
                </div>
                <p className="text-[11px] text-gym-muted mt-1.5">
                  Coloca la IP local asignada a la computadora principal donde opera la recepción o administración del gimnasio.
                </p>
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  testResult.success 
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gym-border/60">
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoSync}
                      onChange={(e) => setFormData({ ...formData, autoSync: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gym-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                  <div>
                    <span className="text-xs font-bold text-white block">Auto-sincronización periódica</span>
                    <span className="text-[11px] text-gym-muted">Actualizar altas y renovaciones en segundo plano</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gym-muted">Cada:</span>
                  <select
                    value={formData.syncIntervalSeconds}
                    onChange={(e) => setFormData({ ...formData, syncIntervalSeconds: Number(e.target.value) })}
                    className="bg-gym-bg border border-gym-border text-xs rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value={15}>15 segundos</option>
                    <option value={30}>30 segundos</option>
                    <option value={60}>1 minuto</option>
                    <option value={300}>5 minutos</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onManualSync()}
                  disabled={isSyncing}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando socios y accesos...' : 'Sincronizar Ahora con Servidor Central'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: Relay & Hardware settings */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              <span>Ajustes de Acceso y Periféricos</span>
            </h4>

            <div className="bg-gym-surface/50 p-4 rounded-xl border border-gym-border grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Tiempo de Liberación de Acceso:
                </label>
                <select
                  value={formData.relayPulseDurationSeconds}
                  onChange={(e) => setFormData({ ...formData, relayPulseDurationSeconds: Number(e.target.value) })}
                  className="w-full bg-gym-bg border border-gym-border text-xs rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value={2}>2 segundos (Rápido)</option>
                  <option value={3}>3 segundos (Estándar)</option>
                  <option value={4}>4 segundos (Recomendado)</option>
                  <option value={5}>5 segundos (Holgado)</option>
                </select>
                <p className="text-[11px] text-gym-muted mt-1">
                  Duración de la señal de paso libre y luz verde de acceso.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Identificador de esta Terminal:
                </label>
                <input
                  type="text"
                  value={formData.terminalName}
                  onChange={(e) => setFormData({ ...formData, terminalName: e.target.value })}
                  placeholder="Ej. Terminal A - Entrada"
                  className="w-full px-3 py-2 bg-gym-bg rounded-xl border border-gym-border text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                />
                <p className="text-[11px] text-gym-muted mt-1">
                  Nombre asignado al punto de control para auditoría de accesos.
                </p>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-gym-border/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.voiceEnabled}
                      onChange={(e) => setFormData({ ...formData, voiceEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gym-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                  <div>
                    <span className="text-xs font-bold text-white block">Voz de Bienvenida Sintetizada</span>
                    <span className="text-[11px] text-gym-muted">Anunciar "Bienvenido [Nombre]" por altavoz al conceder acceso</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-gym-muted">
                  {formData.voiceEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
                </div>
              </div>
            </div>
          </div>

          {/* Section: USB / Offline Backup Sync */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span>Sincronización por Memoria USB / Archivo (Sin Internet / Sin Red)</span>
            </h4>

            <div className="bg-gym-surface/50 p-4 rounded-xl border border-gym-border space-y-3">
              <p className="text-xs text-gym-muted">
                Si esta terminal no tiene conexión de red al equipo principal, puedes transferir la base de socios mediante una memoria USB:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="cursor-pointer p-3 rounded-xl bg-gym-bg hover:bg-gym-surface border border-dashed border-gym-border hover:border-amber-400/60 flex items-center gap-3 transition-colors">
                  <Upload className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="overflow-hidden">
                    <span className="text-xs font-bold text-white block">Importar Socios desde USB</span>
                    <span className="text-[11px] text-gym-muted block truncate">Cargar archivo .json con socios</span>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleExportLogs}
                  className="p-3 rounded-xl bg-gym-bg hover:bg-gym-surface border border-gym-border hover:border-amber-400/60 flex items-center gap-3 transition-colors text-left"
                >
                  <Download className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">Descargar Registros de Acceso</span>
                    <span className="text-[11px] text-gym-muted">Exportar historial de hoy a USB</span>
                  </div>
                </button>
              </div>

              {importStatus && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                  {importStatus}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gym-border bg-gym-surface/80 flex items-center justify-between">
          <span className="text-xs text-gym-muted">
            Guardado automático en el almacenamiento local de este equipo.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gym-surface hover:bg-gym-border text-xs font-semibold text-gym-muted hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-2 shadow-glow-gold transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Configuración</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
