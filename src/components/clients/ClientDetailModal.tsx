import React from 'react';
import { Client } from '../../types';
import { 
  X, 
  Fingerprint, 
  Calendar, 
  Phone, 
  Mail, 
  HeartPulse, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Award
} from 'lucide-react';

interface ClientDetailModalProps {
  client: Client;
  onClose: () => void;
  onEnrollBiometric: () => void;
  onRenewMembership: () => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  client,
  onClose,
  onEnrollBiometric,
  onRenewMembership,
}) => {
  const isExpired = client.membership.status === 'expired' || client.membership.daysRemaining < 0;
  const isExpiringSoon = client.membership.status === 'expiring_soon' || (client.membership.daysRemaining <= 5 && !isExpired);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-2xl overflow-hidden shadow-2xl relative my-8">
        
        {/* Header Cover */}
        <div className="h-28 bg-gradient-to-r from-amber-600/30 via-gym-surface to-gym-card p-4 relative border-b border-gym-border flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded bg-black/50 text-amber-400 border border-amber-500/30">
              Expediente de Socio
            </span>
            <span className="text-xs font-mono text-gray-300 bg-black/40 px-2 py-0.5 rounded">
              {client.id}
            </span>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/40 text-gray-300 hover:text-white hover:bg-black/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card Header */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-6">
            <div className="flex items-end gap-4">
              <img 
                src={client.avatarUrl} 
                alt={client.fullName} 
                className="w-24 h-24 rounded-2xl object-cover border-4 border-gym-card shadow-xl"
              />
              <div>
                <h2 className="text-xl font-black text-white">{client.fullName}</h2>
                <div className="flex items-center gap-3 text-xs text-gym-muted mt-1">
                  <span>DNI/Doc: <strong className="text-gray-200">{client.documentId}</strong></span>
                  <span>•</span>
                  <span>Miembro desde: {client.createdAt}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={onRenewMembership}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-glow-gold transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Renovar Cuota</span>
              </button>
            </div>
          </div>

          {/* Grid of details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Membership Box */}
            <div className={`p-4 rounded-xl border ${
              isExpired
                ? 'bg-red-500/10 border-red-500/30'
                : isExpiringSoon
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-gym-surface/60 border-gym-border'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gym-muted">Plan Actual:</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                  isExpired 
                    ? 'bg-red-500 text-white' 
                    : isExpiringSoon 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {isExpired ? 'Vencido' : isExpiringSoon ? 'Por Vencer' : 'Activo'}
                </span>
              </div>
              <h4 className="font-bold text-base text-white">{client.membership.planName}</h4>
              <div className="mt-3 space-y-1 text-xs text-gym-muted font-mono">
                <div className="flex justify-between">
                  <span>Vence el:</span>
                  <span className="text-white font-semibold">{client.membership.endDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Días restantes:</span>
                  <span className={client.membership.daysRemaining >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {client.membership.daysRemaining >= 0 ? `${client.membership.daysRemaining} días` : `Venció hace ${Math.abs(client.membership.daysRemaining)} días`}
                  </span>
                </div>
              </div>
            </div>

            {/* Biometric Status Box */}
            <div className="p-4 rounded-xl bg-gym-surface/60 border border-gym-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gym-muted">Acceso Biométrico:</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                    client.biometricRegistered 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    <Fingerprint className="w-3 h-3" />
                    <span>{client.biometricRegistered ? 'Huella Registrada' : 'Sin Huella'}</span>
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-gray-200">
                  {client.biometricRegistered ? 'Torniquete Habilitado' : 'Requiere Enrolamiento'}
                </h4>
                <p className="text-xs text-gym-muted mt-1">
                  {client.biometricRegistered 
                    ? `Código hash: ${client.biometricHash || 'HASH_ENCRYPTED'}`
                    : 'El socio debe pasar su huella para entrar sin tarjeta física.'}
                </p>
              </div>

              {!client.biometricRegistered && (
                <button
                  onClick={onEnrollBiometric}
                  className="mt-3 w-full py-2 bg-gym-surface hover:bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>Enrolar Huella Ahora</span>
                </button>
              )}
            </div>

          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
            <div className="p-3 rounded-xl bg-gym-surface/40 border border-gym-border text-center">
              <Clock className="w-4 h-4 mx-auto text-blue-400 mb-1" />
              <span className="text-xs text-gym-muted block">Asistencias</span>
              <span className="text-lg font-black text-white">{client.checkInsCount}</span>
            </div>

            <div className="p-3 rounded-xl bg-gym-surface/40 border border-gym-border text-center">
              <ShoppingBag className="w-4 h-4 mx-auto text-amber-400 mb-1" />
              <span className="text-xs text-gym-muted block">Gasto en Tienda</span>
              <span className="text-lg font-black text-amber-400">${client.totalSpentInStore}</span>
            </div>

            <div className="p-3 rounded-xl bg-gym-surface/40 border border-gym-border text-center">
              <Award className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
              <span className="text-xs text-gym-muted block">Fidelidad</span>
              <span className="text-lg font-black text-white">Nivel Gold</span>
            </div>

            <div className="p-3 rounded-xl bg-gym-surface/40 border border-gym-border text-center">
              <Calendar className="w-4 h-4 mx-auto text-purple-400 mb-1" />
              <span className="text-xs text-gym-muted block">Último Ingreso</span>
              <span className="text-xs font-mono font-bold text-gray-200 mt-1 block">
                {client.lastCheckIn ? new Date(client.lastCheckIn).toLocaleDateString('es-MX') : 'Sin registro'}
              </span>
            </div>
          </div>

          {/* Emergency Contact & Medical Notes */}
          <div className="space-y-3 pt-2 border-t border-gym-border">
            <div className="flex items-center gap-2 text-xs">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span className="text-gym-muted">Teléfono socio:</span>
              <span className="font-semibold text-white">{client.phone}</span>
              <span className="mx-2 text-gym-border">•</span>
              <Mail className="w-4 h-4 text-blue-400" />
              <span className="text-gym-muted">Email:</span>
              <span className="font-semibold text-white">{client.email}</span>
            </div>

            <div className="flex items-center gap-2 text-xs bg-gym-surface/30 p-2.5 rounded-lg border border-gym-border">
              <HeartPulse className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-gym-muted shrink-0">Contacto de Emergencia:</span>
              <span className="font-semibold text-white">
                {client.emergencyContact.name} ({client.emergencyContact.relationship}) - {client.emergencyContact.phone}
              </span>
            </div>

            {client.medicalNotes && (
              <div className="p-3 rounded-lg bg-gym-surface/20 border border-gym-border text-xs text-gym-muted">
                <span className="font-bold text-amber-400 block mb-1">Notas Médicas & Entrenamiento:</span>
                <p>{client.medicalNotes}</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
