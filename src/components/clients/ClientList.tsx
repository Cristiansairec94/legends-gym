import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { Client } from '../../types';
import { ClientFormModal } from './ClientFormModal';
import { ClientDetailModal } from './ClientDetailModal';
import { BiometricEnrollModal } from './BiometricEnrollModal';
import { RenewMembershipModal } from './RenewMembershipModal';
import { 
  Users, 
  UserPlus, 
  Search, 
  Fingerprint, 
  RefreshCw, 
  Eye, 
  Trash2, 
  Phone,
  Mail
} from 'lucide-react';

export const ClientList: React.FC = () => {
  const { members, deleteMember, currentRole } = useGym();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring_soon' | 'expired' | 'no_fingerprint'>('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClientForDetail, setSelectedClientForDetail] = useState<Client | null>(null);
  const [selectedClientForEnroll, setSelectedClientForEnroll] = useState<Client | null>(null);
  const [selectedClientForRenew, setSelectedClientForRenew] = useState<Client | null>(null);

  // Filter logic
  const filteredMembers = members.filter((member) => {
    const matchesSearch = 
      member.fullName.toLowerCase().includes(search.toLowerCase()) ||
      member.documentId.toLowerCase().includes(search.toLowerCase()) ||
      member.phone.toLowerCase().includes(search.toLowerCase()) ||
      member.id.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return member.membership.status === 'active' && member.membership.daysRemaining > 5;
    if (statusFilter === 'expiring_soon') return member.membership.status === 'expiring_soon' || (member.membership.daysRemaining <= 5 && member.membership.daysRemaining >= 0);
    if (statusFilter === 'expired') return member.membership.status === 'expired' || member.membership.daysRemaining < 0;
    if (statusFilter === 'no_fingerprint') return !member.biometricRegistered;

    return true;
  });

  // Summary counts
  const totalCount = members.length;
  const activeCount = members.filter(m => m.membership.daysRemaining > 5).length;
  const expiringCount = members.filter(m => m.membership.daysRemaining <= 5 && m.membership.daysRemaining >= 0).length;
  const expiredCount = members.filter(m => m.membership.daysRemaining < 0).length;
  const noFingerprintCount = members.filter(m => !m.biometricRegistered).length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gym-card p-5 rounded-2xl border border-gym-border shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-black text-white tracking-wide uppercase">
              Cartera de Clientes & Membresías
            </h1>
          </div>
          <p className="text-sm text-gym-muted mt-1">
            Administración de expedientes, vigencias, enrolamiento biométrico y renovaciones.
          </p>
        </div>

        {/* Add client button (only admin & receptionist) */}
        {currentRole !== 'trainer' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm shadow-glow-gold transition-all"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuevo Socio</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div 
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'all' ? 'bg-amber-500/15 border-amber-500' : 'bg-gym-card border-gym-border hover:border-gym-border/80'
          }`}
        >
          <span className="text-xs text-gym-muted block">Total Cartera</span>
          <span className="text-2xl font-black text-white">{totalCount}</span>
        </div>

        <div 
          onClick={() => setStatusFilter('active')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'active' ? 'bg-emerald-500/15 border-emerald-500' : 'bg-gym-card border-gym-border hover:border-gym-border/80'
          }`}
        >
          <span className="text-xs text-emerald-400 font-semibold block">Activos Vigentes</span>
          <span className="text-2xl font-black text-emerald-400">{activeCount}</span>
        </div>

        <div 
          onClick={() => setStatusFilter('expiring_soon')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'expiring_soon' ? 'bg-amber-500/15 border-amber-500' : 'bg-gym-card border-gym-border hover:border-gym-border/80'
          }`}
        >
          <span className="text-xs text-amber-400 font-semibold block">Por Vencer (&le; 5 días)</span>
          <span className="text-2xl font-black text-amber-400">{expiringCount}</span>
        </div>

        <div 
          onClick={() => setStatusFilter('expired')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'expired' ? 'bg-red-500/15 border-red-500' : 'bg-gym-card border-gym-border hover:border-gym-border/80'
          }`}
        >
          <span className="text-xs text-red-400 font-semibold block">Vencidos / Morosos</span>
          <span className="text-2xl font-black text-red-400">{expiredCount}</span>
        </div>

        <div 
          onClick={() => setStatusFilter('no_fingerprint')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all col-span-2 lg:col-span-1 ${
            statusFilter === 'no_fingerprint' ? 'bg-purple-500/15 border-purple-500' : 'bg-gym-card border-gym-border hover:border-gym-border/80'
          }`}
        >
          <span className="text-xs text-purple-400 font-semibold block">Sin Huella Enrolada</span>
          <span className="text-2xl font-black text-purple-400">{noFingerprintCount}</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-gym-card p-4 rounded-2xl border border-gym-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gym-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, DNI, teléfono o ID..."
            className="w-full pl-9 pr-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'active', label: 'Activos' },
            { id: 'expiring_soon', label: 'Por Vencer' },
            { id: 'expired', label: 'Vencidos' },
            { id: 'no_fingerprint', label: 'Sin Huella' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-amber-500 text-black font-bold'
                  : 'bg-gym-surface text-gym-muted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-gym-card rounded-2xl border border-gym-border overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gym-border bg-gym-surface/40 text-[11px] font-bold uppercase tracking-wider text-gym-muted">
                <th className="p-4">Socio</th>
                <th className="p-4">Contacto</th>
                <th className="p-4">Membresía / Plan</th>
                <th className="p-4">Estado & Vigencia</th>
                <th className="p-4 text-center">Acceso Huella</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gym-border/40 text-sm">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gym-muted">
                    No se encontraron clientes que coincidan con los criterios.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isExpired = member.membership.status === 'expired' || member.membership.daysRemaining < 0;
                  const isExpiring = member.membership.daysRemaining <= 5 && !isExpired;

                  return (
                    <tr 
                      key={member.id}
                      className="hover:bg-gym-surface/40 transition-colors"
                    >
                      {/* Member Info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={member.avatarUrl}
                            alt={member.fullName}
                            className="w-10 h-10 rounded-full object-cover border border-gym-border shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white hover:text-amber-400 cursor-pointer" onClick={() => setSelectedClientForDetail(member)}>
                              {member.fullName}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gym-muted font-mono mt-0.5">
                              <span>ID: {member.id}</span>
                              <span>•</span>
                              <span>DNI: {member.documentId}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="p-4 text-xs text-gym-muted">
                        <div className="flex items-center gap-1.5 text-gray-200">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{member.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gym-muted mt-1">
                          <Mail className="w-3.5 h-3.5 text-blue-400" />
                          <span>{member.email}</span>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="p-4">
                        <span className="font-bold text-white block text-xs">
                          {member.membership.planName}
                        </span>
                        <span className="text-[11px] text-amber-400 font-mono">
                          ${member.membership.price} MXN
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isExpired 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : isExpiring 
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {isExpired ? 'Vencida' : isExpiring ? 'Por Vencer' : 'Activa'}
                          </span>
                          <span className="text-[11px] text-gym-muted font-mono">
                            {member.membership.daysRemaining >= 0 
                              ? `${member.membership.daysRemaining} días restantes`
                              : `Venció hace ${Math.abs(member.membership.daysRemaining)} días`}
                          </span>
                        </div>
                      </td>

                      {/* Biometric Status */}
                      <td className="p-4 text-center">
                        {member.biometricRegistered ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold" title="Huella activa en torniquete">
                            <Fingerprint className="w-4 h-4" />
                            <span>Enrolada</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedClientForEnroll(member)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold transition-colors"
                            title="Haz clic para capturar su huella digital"
                          >
                            <Fingerprint className="w-4 h-4" />
                            <span>Capturar</span>
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedClientForDetail(member)}
                            className="p-1.5 rounded-lg bg-gym-surface hover:bg-gym-surface/80 text-gym-muted hover:text-white transition-colors"
                            title="Ver expediente completo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {currentRole !== 'trainer' && (
                            <button
                              onClick={() => setSelectedClientForRenew(member)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold border border-emerald-500/30 transition-colors flex items-center gap-1"
                              title="Renovar membresía"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Renovar</span>
                            </button>
                          )}

                          {currentRole === 'admin' && (
                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar socio ${member.fullName}?`)) {
                                  deleteMember(member.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-gym-surface hover:bg-red-500/20 text-gym-muted hover:text-red-400 transition-colors"
                              title="Eliminar socio"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <ClientFormModal
          onClose={() => setShowAddModal(false)}
          onClientCreated={(newClient, wantsEnrollment) => {
            setShowAddModal(false);
            if (wantsEnrollment) {
              setSelectedClientForEnroll(newClient);
            }
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedClientForDetail && (
        <ClientDetailModal
          client={selectedClientForDetail}
          onClose={() => setSelectedClientForDetail(null)}
          onEnrollBiometric={() => {
            const client = selectedClientForDetail;
            setSelectedClientForDetail(null);
            setSelectedClientForEnroll(client);
          }}
          onRenewMembership={() => {
            const client = selectedClientForDetail;
            setSelectedClientForDetail(null);
            setSelectedClientForRenew(client);
          }}
        />
      )}

      {/* Biometric Enroll Wizard Modal */}
      {selectedClientForEnroll && (
        <BiometricEnrollModal
          client={selectedClientForEnroll}
          onClose={() => setSelectedClientForEnroll(null)}
          onSuccess={() => setSelectedClientForEnroll(null)}
        />
      )}

      {/* Renew Modal */}
      {selectedClientForRenew && (
        <RenewMembershipModal
          client={selectedClientForRenew}
          onClose={() => setSelectedClientForRenew(null)}
        />
      )}

    </div>
  );
};
