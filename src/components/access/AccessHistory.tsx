import React, { useState, useMemo } from 'react';
import { useGym } from '../../context/GymContext';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trash2, 
  User, 
  X, 
  Search, 
  Fingerprint, 
  ShieldCheck, 
  ShieldAlert, 
  Calendar, 
  Filter 
} from 'lucide-react';
import { getGymAvatar, getOfflineGymSvgAvatar, detectGender } from '../../utils/genderAvatar';

interface AccessHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccessHistory: React.FC<AccessHistoryProps> = ({ isOpen, onClose }) => {
  const { accessLogs, clearAccessLogs, currentRole } = useGym();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'granted' | 'denied'>('all');

  // Stats
  const totalEvents = accessLogs.length;
  const grantedCount = useMemo(() => accessLogs.filter(l => l.status === 'granted').length, [accessLogs]);
  const deniedCount = totalEvents - grantedCount;

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return accessLogs.filter(log => {
      const matchesStatus = 
        statusFilter === 'all' 
          ? true 
          : statusFilter === 'granted' 
          ? log.status === 'granted' 
          : log.status === 'denied';

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        log.clientName.toLowerCase().includes(q) ||
        (log.planName && log.planName.toLowerCase().includes(q)) ||
        (log.reason && log.reason.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [accessLogs, statusFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-[#12161f] rounded-[28px] border border-white/10 w-full max-w-3xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.75)] relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        style={{ fontFamily: "'Roboto', 'Segoe UI', system-ui, -apple-system, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#151a24]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-crimson-500/15 border border-crimson-500/25 flex items-center justify-center text-crimson-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base sm:text-lg text-white tracking-tight">
                  Registro de accesos
                </h3>
                <span className="text-xs font-medium bg-crimson-500/15 text-crimson-300 border border-crimson-500/25 px-2.5 py-0.5 rounded-full tabular-nums">
                  {totalEvents} eventos
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Historial cronológico de validaciones biométricas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-zinc-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Stats Summary Bar */}
        <div className="grid grid-cols-3 gap-2.5 p-3 sm:p-4 bg-[#10141c] border-b border-white/[0.08] text-center">
          <div className="p-2.5 rounded-2xl bg-[#1b202b] border border-white/[0.06]">
            <span className="text-[11px] font-medium text-zinc-400 block">Total registros</span>
            <span className="text-lg font-semibold text-white tabular-nums">{totalEvents}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
            <span className="text-[11px] font-medium text-emerald-300 block">Autorizados</span>
            <span className="text-lg font-semibold text-emerald-400 tabular-nums">{grantedCount}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/25">
            <span className="text-[11px] font-medium text-rose-300 block">Restringidos</span>
            <span className="text-lg font-semibold text-rose-400 tabular-nums">{deniedCount}</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 sm:p-4 border-b border-white/[0.08] bg-[#141822] flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por socio, plan o motivo..."
              className="w-full pl-10 pr-4 py-2 bg-[#1b202b] rounded-full border border-white/12 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-crimson-400 transition-colors"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 bg-[#1b202b] p-1 rounded-full border border-white/10 shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-crimson-500 text-white font-semibold'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              Todos ({totalEvents})
            </button>
            <button
              onClick={() => setStatusFilter('granted')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'granted'
                  ? 'bg-emerald-500 text-[#04140d] font-semibold'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              Exitosos ({grantedCount})
            </button>
            <button
              onClick={() => setStatusFilter('denied')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'denied'
                  ? 'bg-rose-500 text-white font-semibold'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              Denegados ({deniedCount})
            </button>
          </div>

          {/* Admin Clean History button */}
          {currentRole === 'admin' && totalEvents > 0 && (
            <button
              onClick={clearAccessLogs}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-rose-300 bg-[#1b202b] hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 rounded-full flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              title="Borrar todos los eventos registrados"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          )}
        </div>

        {/* Detailed Event List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gym-border/50 p-2 sm:p-4 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-gym-muted">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30 text-crimson-400" />
              <p className="text-sm font-semibold text-gray-300">No se encontraron eventos</p>
              <p className="text-xs text-gym-muted mt-1">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Intenta ajustar los filtros de búsqueda.'
                  : 'Las validaciones de acceso aparecerán registradas aquí.'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isGranted = log.status === 'granted';
              const logDate = new Date(log.timestamp);
              const timeFormatted = logDate.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              const dateFormatted = logDate.toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
              });

              return (
                <div 
                  key={log.id} 
                  className={`p-3.5 rounded-xl border transition-all ${
                    isGranted 
                      ? 'bg-gym-surface/40 hover:bg-emerald-500/5 border-gym-border/70 hover:border-emerald-500/30' 
                      : 'bg-red-950/10 hover:bg-red-500/10 border-red-500/20 hover:border-red-500/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Left: Status icon, Avatar & Main Info */}
                    <div className="flex items-center gap-3">
                      {/* Status Indicator Icon */}
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        isGranted 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      }`}>
                        {isGranted ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : <XCircle className="w-5 h-5 stroke-[2.5]" />}
                      </div>

                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {log.clientName && log.clientName !== 'Huella No Identificada' ? (
                          <img 
                            src={getGymAvatar(log.clientName, log.avatarUrl)} 
                            alt={log.clientName} 
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = getOfflineGymSvgAvatar(detectGender(log.clientName));
                            }}
                            className="w-11 h-11 rounded-xl object-cover border border-gym-border shadow-sm" 
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-gym-surface flex items-center justify-center border border-gym-border text-gym-muted">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      {/* Client Name, Reason, Plan */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white leading-tight">
                            {log.clientName}
                          </h4>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            isGranted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {isGranted ? 'Paso Libre' : 'Restringido'}
                          </span>
                        </div>

                        <p className={`text-xs mt-1 ${isGranted ? 'text-gray-300' : 'text-red-300 font-medium'}`}>
                          {log.reason}
                        </p>

                        {log.planName && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-gym-muted">
                              Plan: <strong className="text-crimson-400 font-semibold">{log.planName}</strong>
                            </span>
                            <span className="text-gym-border">•</span>
                            <span className="text-[10px] text-gym-muted uppercase font-mono flex items-center gap-1">
                              <Fingerprint className="w-3 h-3 text-crimson-400" />
                              Biométrico
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Timestamp & Membership Status */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-gym-border/40 shrink-0">
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-mono font-bold text-white block">
                          {timeFormatted}
                        </span>
                        <span className="text-[10px] text-gym-muted font-mono block">
                          {dateFormatted}
                        </span>
                      </div>

                      {typeof log.daysRemaining === 'number' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block ${
                          log.daysRemaining > 5 
                            ? 'bg-gym-surface text-emerald-300 border border-emerald-500/20' 
                            : log.daysRemaining > 0 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}>
                          {log.daysRemaining >= 0 ? `${log.daysRemaining} días rest.` : `Venció hace ${Math.abs(log.daysRemaining)}d`}
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-white/[0.08] bg-[#151a24] flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            Mostrando {filteredLogs.length} de {totalEvents} eventos registrados
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-xs font-medium text-white transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
