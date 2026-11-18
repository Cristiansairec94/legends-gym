import React, { useState } from 'react';
import { Client, DEFAULT_CLIENT_AVATAR } from '../../types';
import { useGym } from '../../context/GymContext';
import { getGymAvatar, getOfflineGymSvgAvatar, detectGender } from '../../utils/genderAvatar';
import { getMembershipStatus, resolveSaleType } from '../../utils/membershipUtils';
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
  Award,
  Pencil,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Receipt,
  DollarSign,
  FileText,
  UserCheck
} from 'lucide-react';

interface ClientDetailModalProps {
  client: Client;
  onClose: () => void;
  onEnrollBiometric?: () => void;
  onRenewMembership: () => void;
  onEdit?: () => void;
  initialTab?: 'dossier' | 'payments';
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  client,
  onClose,
  onEnrollBiometric,
  onRenewMembership,
  onEdit,
  initialTab = 'dossier',
}) => {
  const { sales } = useGym();
  const [activeTab, setActiveTab] = useState<'dossier' | 'payments'>(initialTab);

  const { isExpired, isExpiring: isExpiringSoon, daysRemaining: calcDays, statusLabel } = getMembershipStatus(client.membership);

  // Filter all sales linked to this client
  const clientSales = (sales || [])
    .filter(s => 
      (s.clientId && s.clientId === client.id) ||
      (s.clientName && s.clientName.trim().toLowerCase() === client.fullName.trim().toLowerCase())
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const totalSpentAll = clientSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const membershipSales = clientSales.filter(s => resolveSaleType(s) === 'membership');
  const lastSale = clientSales.length > 0 ? clientSales[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#12131c] rounded-3xl border border-zinc-800 w-full max-w-3xl overflow-hidden shadow-2xl relative my-6 text-white">
        
        {/* Header Banner */}
        <div className="h-28 bg-gradient-to-r from-crimson-600/35 via-zinc-900 to-[#12131c] p-4 sm:p-6 relative border-b border-zinc-800/80 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-black px-2.5 py-0.5 rounded-full bg-black/60 text-crimson-400 border border-crimson-500/40 tracking-wider">
              {activeTab === 'dossier' ? 'Expediente de Socio' : 'Historial de Pagos & Cuotas'}
            </span>
            <span className="text-xs font-mono font-bold text-gray-300 bg-black/50 px-2.5 py-0.5 rounded-full border border-white/10">
              {client.id}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full hidden sm:inline-block">
              ● Vinculado con Torniquete
            </span>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl bg-black/50 text-gray-400 hover:text-white hover:bg-black/80 transition-colors border border-white/10"
            title="Cerrar expediente"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Info Bar & Tabs */}
        <div className="px-5 sm:px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-5">
            <div className="flex items-end gap-3.5">
              <img 
                src={getGymAvatar(client.fullName, client.avatarUrl, client.gender)} 
                alt={client.fullName} 
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getOfflineGymSvgAvatar(detectGender(client.fullName));
                }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-[#12131c] shadow-2xl shrink-0"
              />
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-black text-white truncate">{client.fullName}</h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-1">
                  <span>DNI: <strong className="text-gray-200">{client.documentId}</strong></span>
                  <span>•</span>
                  <span>Desde: {client.createdAt || 'Fecha actual'}</span>
                  {client.gender && (
                    <>
                      <span>•</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        client.gender === 'female' 
                          ? 'bg-pink-500/15 border-pink-500/30 text-pink-300' 
                          : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                      }`}>
                        {client.gender === 'female' ? '👩 Mujer' : '👨 Hombre'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 font-bold text-xs flex items-center gap-1.5 transition-all"
                  title="Editar datos personales"
                >
                  <Pencil className="w-3.5 h-3.5 text-blue-400" />
                  <span>Editar</span>
                </button>
              )}
              <button
                onClick={onRenewMembership}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 hover:from-crimson-400 hover:to-crimson-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-glow-crimson transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Cobrar / Renovar</span>
              </button>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 mb-5">
            <button
              onClick={() => setActiveTab('dossier')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'dossier'
                  ? 'bg-crimson-500 text-white shadow-glow-crimson font-black'
                  : 'bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Expediente & Acceso</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
                activeTab === 'payments'
                  ? 'bg-crimson-500 text-white shadow-glow-crimson font-black'
                  : 'bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Consultar Pagos & Cuotas</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ml-1 ${
                activeTab === 'payments'
                  ? 'bg-black/30 text-white'
                  : 'bg-zinc-700 text-zinc-200'
              }`}>
                {clientSales.length}
              </span>
            </button>
          </div>

          {/* TAB 1: DOSSIER & ACCESO */}
          {activeTab === 'dossier' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Membership & Biometrics Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Membership Box */}
                <div className={`p-4 rounded-2xl border ${
                  isExpired
                    ? 'bg-red-500/10 border-red-500/30'
                    : isExpiringSoon
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-zinc-900/80 border-zinc-800'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-400">Plan de Membresía:</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      isExpired 
                        ? 'bg-red-500 text-white' 
                        : isExpiringSoon 
                        ? 'bg-amber-500 text-black' 
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {isExpired ? 'Vencido' : isExpiringSoon ? 'Por Vencer' : 'Activo'}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-base text-white">{client.membership.planName}</h4>
                  <div className="mt-3 space-y-1.5 text-xs text-zinc-400 font-mono">
                    <div className="flex justify-between">
                      <span>Vencimiento:</span>
                      <span className="text-white font-semibold">{client.membership.endDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Días vigentes:</span>
                      <span className={calcDays >= 0 ? (isExpiringSoon ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold') : 'text-red-400 font-bold'}>
                        {calcDays >= 0 ? `${calcDays} días restantes` : `Venció hace ${Math.abs(calcDays)} días`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Precio cuota:</span>
                      <span className="text-crimson-400 font-bold">${client.membership.price?.toLocaleString('es-MX')} MXN</span>
                    </div>
                  </div>
                </div>

                {/* Biometric Status Box */}
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-zinc-400">Torniquete & Huella:</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        client.biometricRegistered 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        <Fingerprint className="w-3 h-3" />
                        <span>{client.biometricRegistered ? 'Huella Enrolada' : 'Sin Huella'}</span>
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-200">
                      {client.biometricRegistered ? 'Pase de Acceso Habilitado' : 'Requiere Enrolamiento'}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      {client.biometricRegistered 
                        ? `Token biométrico registrado. El torniquete abre instantáneamente al pulsar el escáner.`
                        : 'El socio aún no tiene huella registrada. Puede ingresar digitando su DNI en el torniquete o enrolar aquí.'}
                    </p>
                  </div>

                  {!client.biometricRegistered && onEnrollBiometric && (
                    <button
                      onClick={onEnrollBiometric}
                      className="mt-3 w-full py-2 bg-crimson-500/10 hover:bg-crimson-500/20 text-crimson-400 border border-crimson-500/30 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Fingerprint className="w-4 h-4" />
                      <span>Enrolar Huella en Terminal</span>
                    </button>
                  )}
                </div>

              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3">
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-center">
                  <Clock className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                  <span className="text-[11px] text-zinc-400 block font-medium">Asistencias</span>
                  <span className="text-lg font-black text-white">{client.checkInsCount || 0}</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-center">
                  <ShoppingBag className="w-4 h-4 mx-auto text-crimson-400 mb-1" />
                  <span className="text-[11px] text-zinc-400 block font-medium">Gasto Total</span>
                  <span className="text-lg font-black text-crimson-400">${(totalSpentAll || client.totalSpentInStore || 0).toLocaleString('es-MX')}</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-center">
                  <Award className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
                  <span className="text-[11px] text-zinc-400 block font-medium">Estado</span>
                  <span className="text-xs font-extrabold text-emerald-400 mt-1 block">
                    {client.membership.status === 'active' ? 'VIGENTE' : 'RENOVAR'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-center">
                  <Calendar className="w-4 h-4 mx-auto text-purple-400 mb-1" />
                  <span className="text-[11px] text-zinc-400 block font-medium">Último Ingreso</span>
                  <span className="text-xs font-mono font-bold text-gray-200 mt-1 block truncate">
                    {client.lastCheckIn ? new Date(client.lastCheckIn).toLocaleDateString('es-MX') : 'Sin registro'}
                  </span>
                </div>
              </div>

              {/* Emergency Contact & Medical Notes */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tel: <strong className="text-white">{client.phone}</strong></span>
                  </div>
                  <span className="text-zinc-600 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    <span>Email: <strong className="text-white">{client.email}</strong></span>
                  </div>
                </div>

                {client.emergencyContact && (
                  <div className="flex items-center gap-2 text-xs bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80 text-zinc-300">
                    <HeartPulse className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Contacto Emergencia: <strong className="text-white">{client.emergencyContact.name} ({client.emergencyContact.relationship}) - {client.emergencyContact.phone}</strong></span>
                  </div>
                )}

                {client.medicalNotes && (
                  <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-xs text-zinc-400">
                    <span className="font-bold text-crimson-400 block mb-0.5">Notas Médicas & Observaciones:</span>
                    <p>{client.medicalNotes}</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: CONSULTAR PAGOS & FACTURACIÓN */}
          {activeTab === 'payments' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Payment Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Total Pagado</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black text-crimson-400">${totalSpentAll.toLocaleString('es-MX')}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">MXN</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Cuotas / Pagos</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black text-white">{clientSales.length}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">recibos</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Membresías</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black text-emerald-400">{membershipSales.length}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">periodos</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Último Pago</span>
                  <span className="text-xs font-mono font-bold text-zinc-200 mt-1 block truncate">
                    {lastSale ? new Date(lastSale.timestamp).toLocaleDateString('es-MX') : 'Sin pagos'}
                  </span>
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-semibold">
                  <span>Recibos y Comprobantes de Cobro:</span>
                  <span>{clientSales.length} registros encontrados</span>
                </div>

                {clientSales.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 text-zinc-400 space-y-3">
                    <Receipt className="w-10 h-10 mx-auto text-zinc-600" />
                    <div>
                      <h4 className="font-bold text-sm text-zinc-300">No hay pagos previos registrados para este socio</h4>
                      <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                        Los cobros por cuotas, renovaciones de membresía o compras en tienda generados en el ERP o en el Control de Acceso aparecerán aquí automáticamente.
                      </p>
                    </div>
                    <button
                      onClick={onRenewMembership}
                      className="px-4 py-2 rounded-xl bg-crimson-500 hover:bg-crimson-400 text-white font-extrabold text-xs inline-flex items-center gap-1.5 transition-all shadow-glow-crimson"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Registrar Primer Cobro / Cuota</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {clientSales.map((sale) => {
                      const isCard = sale.paymentMethod === 'card';
                      const isTransfer = sale.paymentMethod === 'transfer';
                      const isCash = sale.paymentMethod === 'cash';

                      return (
                        <div 
                          key={sale.id}
                          className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/90 hover:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                              resolveSaleType(sale) === 'membership'
                                ? 'bg-crimson-500/10 border-crimson-500/30 text-crimson-400'
                                : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                            }`}>
                              {resolveSaleType(sale) === 'membership' ? <Receipt className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-crimson-400 bg-crimson-500/10 px-2 py-0.5 rounded border border-crimson-500/20">
                                  {sale.folio || sale.id}
                                </span>
                                <span className="text-xs font-bold text-white truncate">
                                  {sale.planName || sale.items[0]?.product.name || 'Cobro de Gimnasio'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
                                <span>{new Date(sale.timestamp).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                <span>•</span>
                                <span>Atendido por: <strong className="text-zinc-300">{sale.cashierName || 'Caja'}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800">
                            {/* Payment Method Badge */}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                              isCash 
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                                : isCard 
                                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' 
                                : 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                            }`}>
                              {isCash && <Banknote className="w-3 h-3" />}
                              {isCard && <CreditCard className="w-3 h-3" />}
                              {isTransfer && <ArrowRightLeft className="w-3 h-3" />}
                              <span className="capitalize">{isCash ? 'Efectivo' : isCard ? 'Tarjeta' : 'Transferencia'}</span>
                            </span>

                            {/* Total Amount */}
                            <div className="text-right">
                              <span className="text-sm font-black text-white font-mono">
                                ${sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-emerald-400 font-bold block flex items-center justify-end gap-0.5">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Pagado</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
