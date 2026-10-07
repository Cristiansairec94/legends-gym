import React from 'react';
import { useGym } from '../../context/GymContext';
import { 
  Bell, 
  X, 
  CheckCheck, 
  AlertTriangle, 
  Info, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Trash2
} from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({ 
  isOpen, 
  onClose, 
  onNavigateTab 
}) => {
  const { 
    notifications, 
    unreadNotificationsCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    deleteNotification 
  } = useGym();

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'danger':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getBorderColor = (type: string, read: boolean) => {
    if (read) return 'border-gym-border/40 opacity-70';
    switch (type) {
      case 'warning': return 'border-amber-500/40 bg-amber-500/5';
      case 'danger': return 'border-red-500/40 bg-red-500/5';
      case 'success': return 'border-emerald-500/40 bg-emerald-500/5';
      default: return 'border-blue-500/40 bg-blue-500/5';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-gym-card border-l border-gym-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-gym-border flex items-center justify-between bg-gym-surface/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm text-white">Centro de Avisos</h2>
                {unreadNotificationsCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500 text-black">
                    {unreadNotificationsCount} nuevos
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gym-muted">Alertas operativas del club</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadNotificationsCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="p-1.5 rounded-lg text-gym-muted hover:text-amber-400 hover:bg-gym-surface transition-colors"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gym-muted hover:text-white hover:bg-gym-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gym-muted">
              <div className="w-12 h-12 rounded-2xl bg-gym-surface flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-gym-muted" />
              </div>
              <p className="text-xs font-bold text-gray-300">No hay avisos pendientes</p>
              <p className="text-[11px] mt-1">El sistema te notificará cuando haya cuotas por vencer o stock bajo.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const dateObj = new Date(notif.timestamp);

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-xl border transition-all ${getBorderColor(notif.type, notif.read)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getIcon(notif.type)}
                      <h4 className="font-bold text-xs text-white">
                        {notif.title}
                      </h4>
                    </div>

                    <span className="text-[10px] text-gym-muted shrink-0">
                      {dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gym-border/30">
                    {notif.targetTab ? (
                      <button
                        onClick={() => {
                          onNavigateTab(notif.targetTab!);
                          markNotificationAsRead(notif.id);
                          onClose();
                        }}
                        className="text-[11px] font-extrabold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                      >
                        <span>{notif.actionLabel || 'Ir al módulo'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-2">
                      {!notif.read && (
                        <button
                          onClick={() => markNotificationAsRead(notif.id)}
                          className="text-[10px] text-gym-muted hover:text-white font-semibold"
                        >
                          Marcar leída
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notif.id)}
                        className="p-1 rounded text-gym-muted hover:text-red-400 transition-colors"
                        title="Eliminar aviso"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-gym-border bg-gym-surface/40 flex items-center justify-between text-xs text-gym-muted">
          <span>{notifications.length} avisos en historial</span>
          <button
            onClick={markAllNotificationsAsRead}
            className="text-amber-400 hover:underline font-bold text-[11px]"
          >
            Limpiar no leídas
          </button>
        </div>

      </div>
    </div>
  );
};
