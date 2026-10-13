import React, { useState, useRef } from 'react';
import { Client, MembershipPlanType, PaymentMethod, DEFAULT_CLIENT_AVATAR } from '../../types';
import { useGym } from '../../context/GymContext';
import { X, UserPlus, Image, ShieldAlert, Sparkles, Upload, Trash2, Camera, Dumbbell, Banknote, CreditCard, ArrowRightLeft } from 'lucide-react';
import { 
  getGymAvatar, 
  detectGender, 
  GYM_AREAS_PHOTOS,
  MALE_GYM_PHOTOS, 
  FEMALE_GYM_PHOTOS, 
  MALE_GYM_SVG_AVATAR, 
  FEMALE_GYM_SVG_AVATAR,
  getOfflineGymSvgAvatar
} from '../../utils/genderAvatar';

interface ClientFormModalProps {
  onClose: () => void;
  onClientCreated: (client: Client, wantsEnrollment: boolean) => void;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  onClose,
  onClientCreated,
}) => {
  const { addMember, catalogPlans } = useGym();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(GYM_AREAS_PHOTOS[0]);
  const [genderFilter, setGenderFilter] = useState<'male' | 'female'>('male');
  const [hasManuallySelectedPhoto, setHasManuallySelectedPhoto] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('CAT-PLAN-002');
  const [planType, setPlanType] = useState<MembershipPlanType>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRel, setEmergencyRel] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [enrollNow, setEnrollNow] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP, etc.).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(dataUrl);
        } else {
          setAvatarUrl(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(DEFAULT_CLIENT_AVATAR);
  };

  const DEFAULT_PLANS: { id: string; type: MembershipPlanType; name: string; price: number; duration: string; durationDays: number }[] = [
    { id: 'CAT-PLAN-001', type: 'daily', name: 'Pase por Día (Day Pass)', price: 150, duration: '1 día', durationDays: 1 },
    { id: 'CAT-PLAN-002', type: 'monthly', name: 'Mensualidad Estándar', price: 850, duration: '30 días', durationDays: 30 },
    { id: 'CAT-PLAN-003', type: 'quarterly', name: 'Plan Trimestral Fuerza', price: 2300, duration: '90 días', durationDays: 90 },
    { id: 'CAT-PLAN-004', type: 'annual', name: 'Membresía Black VIP Anual', price: 9500, duration: '365 días', durationDays: 365 },
  ];

  const planOptions = catalogPlans && catalogPlans.length > 0
    ? catalogPlans.map(p => {
        let duration = `${p.durationDays} días`;
        if (p.durationDays === 1) duration = '1 día';
        return {
          id: p.id,
          type: p.type,
          name: p.name,
          price: p.price,
          duration,
          durationDays: p.durationDays,
        };
      })
    : DEFAULT_PLANS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const selectedPlan = planOptions.find(p => p.id === selectedPlanId) || planOptions.find(p => p.type === planType) || planOptions[0];
    const now = new Date();
    const end = new Date();
    const days = selectedPlan.durationDays || (selectedPlan.type === 'daily' ? 1 : selectedPlan.type === 'monthly' ? 30 : selectedPlan.type === 'quarterly' ? 90 : 365);
    end.setDate(now.getDate() + days);

    const daysRemaining = Math.max(1, Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const created = addMember({
      fullName: fullName.trim(),
      documentId: `${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `${fullName.toLowerCase().replace(/\s+/g, '.')}@email.com`,
      phone: phone.trim() || '+52 55 1234 5678',
      avatarUrl: (avatarUrl && !avatarUrl.includes("rect width='128' height='128'"))
        ? avatarUrl
        : getGymAvatar(fullName.trim()),
      emergencyContact: {
        name: emergencyName || 'Familiar de Contacto',
        phone: emergencyPhone || '+52 55 9999 8888',
        relationship: emergencyRel || 'Familiar',
      },
      medicalNotes: medicalNotes || 'Apto para actividad física general.',
      biometricRegistered: true,
      membership: {
        planType: selectedPlan.type,
        planName: selectedPlan.name,
        startDate: now.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        price: selectedPlan.price,
        status: 'active',
        daysRemaining,
      },
    }, paymentMethod);

    onClientCreated(created, enrollNow);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-hidden">
      <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl relative my-auto">
        
        {/* Header */}
        <div className="px-5 py-3 border-b border-gym-border flex items-center justify-between bg-gym-surface/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Registrar Nuevo Cliente</h3>
              <p className="text-[11px] text-gym-muted">Ingresa los datos para la cartera del gimnasio</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gym-muted hover:text-white hover:bg-gym-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body with Fixed Footer */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          <div className="overflow-y-auto px-5 py-3.5 space-y-3.5 flex-1 custom-scrollbar">
            {/* Avatar Selector & Upload */}
            <div className="bg-gym-surface/40 p-3 rounded-xl border border-gym-border space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-white block">
                    Foto de Perfil del Cliente:
                  </label>
                  <p className="text-[10px] sm:text-[11px] text-gym-muted">
                    Sube una imagen desde tu equipo, elige un avatar o elimínala.
                  </p>
                </div>

                {/* Buttons: Cambiar y Eliminar */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                    title="Subir imagen desde tu dispositivo"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir / Cambiar Foto</span>
                  </button>

                  {avatarUrl && avatarUrl !== DEFAULT_CLIENT_AVATAR && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                      title="Eliminar foto de perfil actual"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Foto</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Preview + Presets */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-0.5">
                {/* Current Active Preview */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="relative group">
                    <img
                      src={avatarUrl || DEFAULT_CLIENT_AVATAR}
                      alt="Foto actual"
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-amber-400 shadow-md ring-2 ring-amber-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold"
                      title="Hacer clic para cambiar imagen"
                    >
                      <Camera className="w-3.5 h-3.5 mb-0.5" />
                      <span>Cambiar</span>
                    </button>
                  </div>

                  <div className="text-left">
                    <span className="text-xs font-bold text-white block">
                      {avatarUrl === DEFAULT_CLIENT_AVATAR ? 'Silueta Predeterminada' : 'Foto Asignada'}
                    </span>
                    <span className="text-[10px] text-gym-muted block">
                      {avatarUrl === DEFAULT_CLIENT_AVATAR ? 'Sin foto de perfil' : 'Visible en carnet y control de acceso'}
                    </span>
                  </div>
                </div>

                {/* Presets Gallery: Gym Areas */}
                <div className="w-full sm:w-auto sm:flex-1 border-t sm:border-t-0 sm:border-l border-gym-border/60 pt-2 sm:pt-0 sm:pl-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gym-muted font-semibold">
                      Áreas del Gimnasio sugeridas:
                    </span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                    {GYM_AREAS_PHOTOS.map((url, i) => {
                      const labels = ['Power Rack', 'Mancuernas', 'Poleas', 'Cardio'];
                      return (
                        <div key={i} className="flex flex-col items-center gap-0.5 shrink-0">
                          <img
                            src={url}
                            alt={labels[i] || `Área ${i + 1}`}
                            onClick={() => {
                              setAvatarUrl(url);
                              setHasManuallySelectedPhoto(true);
                            }}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover cursor-pointer border-2 transition-all ${
                              avatarUrl === url
                                ? 'border-amber-400 shadow-glow-gold scale-105 ring-2 ring-amber-400/40 opacity-100'
                                : 'border-gym-border opacity-70 hover:opacity-100 hover:scale-105'
                            }`}
                            title={labels[i]}
                          />
                          <span className="text-[8px] text-gym-muted max-w-[50px] text-center truncate">
                            {labels[i]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFullName(val);
                    if (!hasManuallySelectedPhoto && val.trim()) {
                      const detected = detectGender(val);
                      setGenderFilter(detected);
                      setAvatarUrl(getGymAvatar(val));
                    }
                  }}
                  placeholder="Ej. Rodrigo Silva Mendoza"
                  className="w-full px-3 py-1.5 sm:py-2 bg-gym-surface rounded-xl border border-gym-border text-xs sm:text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
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
                  className="w-full px-3 py-1.5 sm:py-2 bg-gym-surface rounded-xl border border-gym-border text-xs sm:text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Membership Plan Selection */}
            <div className="space-y-2">
              <div>
                <label className="text-xs font-bold text-white block">
                  Seleccionar Plan de Membresía:
                </label>
                <span className="text-[10px] sm:text-[11px] text-gym-muted">
                  Selecciona el plan para inscribir al cliente.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {planOptions.map((opt) => {
                  const isSelected = selectedPlanId ? selectedPlanId === opt.id : planType === opt.type;
                  return (
                    <div
                      key={opt.id || opt.type}
                      onClick={() => {
                        setSelectedPlanId(opt.id);
                        setPlanType(opt.type);
                      }}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all relative group ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 shadow-glow-gold/40'
                          : 'bg-gym-surface/60 border-gym-border hover:border-gym-border/80'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold text-white leading-snug">{opt.name}</span>
                        <span className="text-xs font-mono font-extrabold text-amber-400 shrink-0">
                          ${opt.price} MXN
                        </span>
                      </div>

                      <div className="mt-1.5 pt-1.5 border-t border-gym-border/40">
                        <span className="text-[10px] text-gym-muted block">
                          Vigencia: {opt.duration}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-white block">
                Método de Cobro de la Inscripción:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-sm'
                      : 'bg-gym-surface/60 border-gym-border text-gym-muted hover:text-white'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Efectivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-blue-500/20 border-blue-400 text-blue-400 shadow-sm'
                      : 'bg-gym-surface/60 border-gym-border text-gym-muted hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Tarjeta</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'transfer'
                      ? 'bg-purple-500/20 border-purple-400 text-purple-400 shadow-sm'
                      : 'bg-gym-surface/60 border-gym-border text-gym-muted hover:text-white'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer</span>
                </button>
              </div>
            </div>

            {/* Medical Notes & Emergency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="w-full px-3 py-1.5 bg-gym-surface rounded-xl border border-gym-border text-xs sm:text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
                  />
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="Teléfono de emergencia"
                    className="w-full px-3 py-1.5 bg-gym-surface rounded-xl border border-gym-border text-xs sm:text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
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
                  rows={2}
                  placeholder="Alergias, lesiones previas, restricciones..."
                  className="w-full px-3 py-1.5 bg-gym-surface rounded-xl border border-gym-border text-xs sm:text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
            </div>

            {/* Checkbox: Prompt for immediate Biometric Enrollment */}
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">Enrolar Huella Inmediatamente</p>
                  <p className="text-[10px] sm:text-[11px] text-gym-muted">
                    Abrirá el asistente para capturar la huella del socio para control de acceso
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
          </div>

          {/* Footer Actions (Sticky at bottom, ALWAYS visible on any zoom) */}
          <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gym-border bg-gym-surface/80 backdrop-blur-sm shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-xs font-semibold text-gym-muted hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs sm:text-sm shadow-glow-gold transition-all"
            >
              Guardar e Inscribir Cliente
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
