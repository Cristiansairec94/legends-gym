import React from 'react';
import { useGym } from '../../context/GymContext';
import { CheckCircle2, XCircle, Clock, Trash2, ShieldCheck, User } from 'lucide-react';

export const AccessHistory: React.FC = () => {
  const { accessLogs, clearAccessLogs, currentRole } = useGym();

  return (
    <div className="bg-gym-card rounded-2xl border border-gym-border overflow-hidden flex flex-col h-full shadow-lg">
      <div className="p-4 border-b border-gym-border flex items-center justify-between bg-gym-surface/40">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-sm text-white">Registro de Accesos en Vivo</h3>
          <span className="text-xs bg-gym-surface px-2 py-0.5 rounded-full text-gym-muted border border-gym-border">
            {accessLogs.length} eventos
          </span>
        </div>

        {currentRole === 'admin' && accessLogs.length > 0 && (
          <button
            onClick={clearAccessLogs}
            className="text-xs text-gym-muted hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
            title="Limpiar historial"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gym-border/50 max-h-[500px]">
        {accessLogs.length === 0 ? (
          <div className="p-8 text-center text-gym-muted">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-400" />
            <p className="text-sm">No hay registros de acceso aún.</p>
            <p className="text-xs mt-1">Escanee una huella en el torniquete para registrar entradas.</p>
          </div>
        ) : (
          accessLogs.map((log) => {
            const isGranted = log.status === 'granted';
            const timeFormatted = new Date(log.timestamp).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div 
                key={log.id} 
                className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                  isGranted ? 'hover:bg-emerald-500/5' : 'hover:bg-red-500/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Status Indicator Icon */}
                  <div className={`p-2 rounded-xl shrink-0 ${
                    isGranted ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'
                  }`}>
                    {isGranted ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </div>

                  {/* Avatar or fallback */}
                  <div className="relative shrink-0">
                    {log.avatarUrl ? (
                      <img 
                        src={log.avatarUrl} 
                        alt={log.clientName} 
                        className="w-10 h-10 rounded-full object-cover border border-gym-border" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gym-surface flex items-center justify-center border border-gym-border text-gym-muted">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div>
                    <h4 className="text-sm font-semibold text-white leading-tight">
                      {log.clientName}
                    </h4>
                    <p className={`text-xs mt-0.5 ${isGranted ? 'text-emerald-400' : 'text-red-400'}`}>
                      {log.reason}
                    </p>
                  </div>
                </div>

                {/* Right side: Time & Days */}
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-medium text-gym-muted block">
                    {timeFormatted}
                  </span>
                  {typeof log.daysRemaining === 'number' && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 inline-block ${
                      log.daysRemaining > 5 
                        ? 'bg-gym-surface text-gym-muted' 
                        : log.daysRemaining > 0 
                        ? 'bg-amber-500/20 text-amber-300' 
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {log.daysRemaining >= 0 ? `${log.daysRemaining} días rest.` : 'Vencida'}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
