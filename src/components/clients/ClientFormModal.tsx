import React, { useState } from 'react';
import { Client, MembershipPlanType } from '../../types';
import { useGym } from '../../context/GymContext';
import { X, UserPlus, Image, ShieldAlert, Sparkles } from 'lucide-react';

interface ClientFormModalProps {
  onClose: () => void;
  onClientCreated: (client: Client, wantsEnrollment: boolean) => void;
}

const SAMPLE_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=300&q=80',
];

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  onClose,
  onClientCreated,
}) => {
  const { addMember } = useGym();

  const [fullName, setFullName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(SAMPLE_AVATARS[0]);
  const [planType, setPlanType] = useState<MembershipPlanType>('monthly');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRel, setEmergencyRel] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [enrollNow, setEnrollNow] = useState(true);

  const planOptions: { type: MembershipPlanType; name: string; price: number; duration: string }[] = [
    { type: 'daily', name: 'Pase por Día (Day Pass)', price: 150, duration: '1 día' },
    { type: 'monthly', name: 'Mensualidad Estándar', price: 850, duration: '30 días' },
    { type: 'quarterly', name: 'Plan Trimestral Fuerza', price: 2300, duration: '90 días' },
    { type: 'annual', name: 'Membresía Black VIP Anual', price: 9500, duration: '365 días' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const selectedPlan = planOptions.find(p => p.type === planType) || planOptions[1];
    const now = new Date();
    const end = new Date();
    if (planType === 'daily') {
      end.setDate(now.getDate() + 1);
    } else if (planType === 'monthly') {
      end.setMonth(now.getMonth() + 1);
    } else if (planType === 'quarterly') {
      end.setMonth(now.getMonth() + 3);
    } else {
      end.setFullYear(now.getFullYear() + 1);
    }

    const daysRemaining = Math.max(1, Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const created = addMember({
      fullName: fullName.trim(),
      documentId: documentId.trim() || `${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: email.trim() || `${fullName.toLowerCase().replace(/\s+/g, '.')}@email.com`,
      phone: phone.trim() || '+52 55 1234 5678',
      avatarUrl,
      emergencyContact: {
        name: emergencyName || 'Familiar de Contacto',
        phone: emergencyPhone || '+52 55 9999 8888',
        relationship: emergencyRel || 'Familiar',
      },
      medicalNotes: medicalNotes || 'Apto para actividad física general.',
      biometricRegistered: false,
      membership: {
        planType,
        planName: selectedPlan.name,
        startDate: now.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        price: selectedPlan.price,
        status: 'active',
        daysRemaining,
      },
    });

    onClientCreated(created, enrollNow);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-2xl overflow-hidden shadow-2xl relative my-8">
        
        {/* Header */}
        <div className="p-5 border-b border-gym-border flex items-center justify-between bg-gym-surface/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Registrar Nuevo Socio</h3>
              <p className="text-xs text-gym-muted">Ingresa los datos para la cartera del gimnasio</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gym-muted hover:text-white hover:bg-gym-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Avatar Selector */}
          <div>
            <label className="text-xs font-semibold text-gym-muted block mb-2">
              Foto de Perfil del Socio:
            </label>
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {SAMPLE_AVATARS.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Avatar ${i}`}
                  onClick={() => setAvatarUrl(url)}
                  className={`w-14 h-14 rounded-full object-cover cursor-pointer border-2 transition-all ${
                    avatarUrl === url
                      ? 'border-amber-400 shadow-glow-gold scale-105'
                      : 'border-gym-border opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gym-muted block mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Rodrigo Silva Mendoza"
                className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gym-muted block mb-1">
                DNI / Cédula / CURP
              </label>
              <input
                type="text"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="Ej. 48291032"
                className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gym-muted block mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rodrigo@email.com"
                className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gym-muted block mb-1">
                Teléfono WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+52 55 9876 5432"
                className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Membership Plan Selection */}
          <div>
            <label className="text-xs font-semibold text-gym-muted block mb-2">
              Seleccionar Plan de Membresía:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {planOptions.map((opt) => (
                <div
                  key={opt.type}
                  onClick={() => setPlanType(opt.type)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    planType === opt.type
                      ? 'bg-amber-500/15 border-amber-400 shadow-glow-gold/40'
                      : 'bg-gym-surface/60 border-gym-border hover:border-gym-border/80'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">{opt.name}</span>
                    <span className="text-xs font-mono font-extrabold text-amber-400">
                      ${opt.price} MXN
                    </span>
                  </div>
                  <span className="text-[10px] text-gym-muted block mt-1">
                    Vigencia: {opt.duration}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Medical Notes & Emergency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gym-muted block mb-1">
                Contacto de Emergencia (Nombre y Teléfono)
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="Nombre de familiar"
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
                />
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="Teléfono de emergencia"
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gym-muted block mb-1">
                Ficha Médica / Observaciones
              </label>
              <textarea
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                rows={3}
                placeholder="Alergias, lesiones previas, restricciones..."
                className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>
          </div>

          {/* Checkbox: Prompt for immediate Biometric Enrollment */}
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-xs font-bold text-white">Enrolar Huella Inmediatamente</p>
                <p className="text-[11px] text-gym-muted">
                  Abrirá el asistente para capturar la huella del socio en el torniquete
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={enrollNow}
              onChange={(e) => setEnrollNow(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gym-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-xs font-semibold text-gym-muted hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm shadow-glow-gold transition-all"
            >
              Guardar e Inscribir Socio
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
