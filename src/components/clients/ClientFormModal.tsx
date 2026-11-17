import React, { useState } from 'react';
import { Client, MembershipPlanType, PaymentMethod, DEFAULT_CLIENT_AVATAR } from '../../types';
import { useGym } from '../../context/GymContext';
import { 
  calculateMembershipDates,
  calculateAgeFromBirthDate,
  formatBirthDateToISO,
  formatBirthDateToDisplay,
  sanitizeBirthDateInput,
  parseBirthDateParts,
  getGroupPackageSize,
  resizeGroupCompanions,
  isGroupCompanionComplete,
  GroupCompanionDraft
} from '../../utils/membershipUtils';
import { 
  X, 
  UserPlus, 
  Users,
  ShieldAlert, 
  ShieldCheck,
  Sparkles, 
  Dumbbell, 
  Banknote, 
  CreditCard, 
  ArrowRightLeft,
  Calendar,
  Clock,
  Check
} from 'lucide-react';
import { 
  getGymAvatar, 
  detectGender, 
  GYM_AREAS_PHOTOS,
  MALE_GYM_PHOTOS, 
  FEMALE_GYM_PHOTOS, 
  MALE_GYM_SVG_AVATAR, 
  FEMALE_GYM_SVG_AVATAR,
  getOfflineGymSvgAvatar,
  FEMALE_CLIENT_AVATAR,
  MALE_CLIENT_AVATAR
} from '../../utils/genderAvatar';
import { BirthDatePickerField } from '../access/BirthDatePickerField';
import { GroupCompanionsModal } from '../access/GroupCompanionsModal';

interface ClientFormModalProps {
  onClose: () => void;
  onClientCreated: (client: Client, wantsEnrollment: boolean) => void;
  initialPlanId?: string;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  onClose,
  onClientCreated,
  initialPlanId,
}) => {
  const { addMember, catalogPlans } = useGym();

  const [fullName, setFullName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [genderFilter, setGenderFilter] = useState<'male' | 'female'>('male');
  const [hasManuallySelectedPhoto, setHasManuallySelectedPhoto] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanId || 'CAT-PLAN-004');
  const [planType, setPlanType] = useState<MembershipPlanType>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRel, setEmergencyRel] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [enrollNow, setEnrollNow] = useState(true);

  const [birthDate, setBirthDate] = useState('');
  const [birthDateDisplay, setBirthDateDisplay] = useState('');
  const [age, setAge] = useState<number | string>('');

  const handleBirthDateInputChange = (rawVal: string) => {
    const val = sanitizeBirthDateInput(rawVal, birthDateDisplay);
    setBirthDateDisplay(val);
    if (!val.trim()) {
      setBirthDate('');
      setAge('');
      return;
    }
    const calculatedAge = calculateAgeFromBirthDate(val);
    if (calculatedAge !== null) {
      setAge(calculatedAge);
      setBirthDate(formatBirthDateToISO(val));
    } else {
      setBirthDate('');
      setAge('');
    }
  };

  const handleCalendarDateChange = (isoDate: string) => {
    if (!isoDate) {
      setBirthDate('');
      setBirthDateDisplay('');
      setAge('');
      return;
    }
    setBirthDate(isoDate);
    setBirthDateDisplay(formatBirthDateToDisplay(isoDate));
    const calculatedAge = calculateAgeFromBirthDate(isoDate);
    if (calculatedAge !== null) {
      setAge(calculatedAge);
    }
  };

  const handleAgeChange = (val: string) => {
    setAge(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0 && num < 120 && !birthDateDisplay) {
      const approxYear = new Date().getFullYear() - num;
      setBirthDate(`${approxYear}-01-01`);
      setBirthDateDisplay(`01/01/${approxYear}`);
    }
  };

  const DEFAULT_PLANS: { id: string; type: MembershipPlanType; name: string; price: number; duration: string; durationDays: number }[] = [
    { id: 'CAT-PLAN-002', type: 'weekly', name: 'Pase Semanal (Semana por persona)', price: 150, duration: '7 días', durationDays: 7 },
    { id: 'CAT-PLAN-003', type: 'biweekly', name: 'Pase Quincenal (15 Días)', price: 250, duration: '15 días', durationDays: 15 },
    { id: 'CAT-PLAN-004', type: 'monthly', name: 'Mensualidad Individual', price: 420, duration: '30 días', durationDays: 30 },
    { id: 'CAT-PLAN-005', type: 'group', name: 'Paquete 3 Personas (Mensual)', price: 1100, duration: '30 días', durationDays: 30 },
    { id: 'CAT-PLAN-006', type: 'group', name: 'Paquete 4 Personas (Mensual)', price: 1500, duration: '30 días', durationDays: 30 },
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

  const [groupCompanions, setGroupCompanions] = useState<GroupCompanionDraft[]>([]);
  const [showGroupCompanionsModal, setShowGroupCompanionsModal] = useState(false);

  const selectedPlan = planOptions.find(p => p.id === selectedPlanId) || planOptions.find(p => p.type === planType) || planOptions[0];
  const activeGroupSize = getGroupPackageSize(selectedPlan?.name, selectedPlan?.type);
  const requiredCompanionsCount = Math.max(0, activeGroupSize - 1);
  const activeGroupCompanions = requiredCompanionsCount > 0
    ? resizeGroupCompanions(groupCompanions, requiredCompanionsCount)
    : [];
  const completedCompanionsCount = activeGroupCompanions.filter(isGroupCompanionComplete).length;
  const allGroupCompanionsReady =
    requiredCompanionsCount === 0 || completedCompanionsCount === requiredCompanionsCount;

  const performRegisterMembers = () => {
    if (!fullName.trim()) return;

    const days = selectedPlan.durationDays || (selectedPlan.type === 'daily' ? 1 : selectedPlan.type === 'monthly' ? 30 : selectedPlan.type === 'quarterly' ? 90 : 365);
    const calculatedDates = calculateMembershipDates(days);

    const finalDocId = documentId.trim() || `${Math.floor(10000000 + Math.random() * 90000000)}`;
    const finalEmail = email.trim() || `${fullName.toLowerCase().replace(/\s+/g, '.') || 'cliente'}@email.com`;

    const parsedBirth = birthDateDisplay.trim()
      ? (parseBirthDateParts(birthDateDisplay) ? formatBirthDateToISO(birthDateDisplay) : '')
      : formatBirthDateToISO(birthDate);
    const finalBirthDate = parsedBirth || (age ? `${new Date().getFullYear() - Number(age)}-01-01` : undefined);

    const groupNames = requiredCompanionsCount > 0
      ? [fullName.trim(), ...activeGroupCompanions.map(c => c.fullName.trim())]
      : [];

    const created = addMember({
      fullName: fullName.trim(),
      documentId: finalDocId,
      email: finalEmail,
      phone: phone.trim() || '+52 55 1234 5678',
      gender: genderFilter,
      birthDate: finalBirthDate,
      avatarUrl: getGymAvatar(fullName.trim(), avatarUrl, genderFilter),
      emergencyContact: {
        name: emergencyName || 'Familiar de Contacto',
        phone: emergencyPhone || '+52 55 9999 8888',
        relationship: emergencyRel || 'Familiar',
      },
      medicalNotes: requiredCompanionsCount > 0
        ? `Titular de paquete grupal (${activeGroupSize} personas · ${selectedPlan.name}).`
        : (medicalNotes || (age ? `Edad: ${age} años. Apto para actividad física general.` : 'Apto para actividad física general.')),
      biometricRegistered: true,
      membership: {
        planType: selectedPlan.type,
        planName: selectedPlan.name,
        startDate: calculatedDates.startDate,
        endDate: calculatedDates.endDate,
        price: selectedPlan.price,
        status: 'active',
        daysRemaining: calculatedDates.daysRemaining,
      },
    }, paymentMethod, requiredCompanionsCount > 0 ? {
      groupSummaryNote: `Alta grupal (${activeGroupSize} personas): ${groupNames.join(', ')}`
    } : undefined);

    if (requiredCompanionsCount > 0) {
      activeGroupCompanions.forEach((comp, idx) => {
        const compName = comp.fullName.trim();
        if (!compName) return;
        const compParsed = comp.birthDateDisplay.trim()
          ? (parseBirthDateParts(comp.birthDateDisplay) ? formatBirthDateToISO(comp.birthDateDisplay) : '')
          : formatBirthDateToISO(comp.birthDate);
        const compBirthDate = compParsed || (comp.age ? `${new Date().getFullYear() - Number(comp.age)}-01-01` : undefined);
        const compDocId = `${Math.floor(10000000 + Math.random() * 90000000)}`;
        addMember({
          fullName: compName,
          documentId: compDocId,
          email: `${compName.toLowerCase().replace(/\s+/g, '.') || 'cliente'}@email.com`,
          phone: comp.phone.trim() || phone.trim() || '+52 55 1234 5678',
          gender: comp.gender,
          birthDate: compBirthDate,
          avatarUrl: getGymAvatar(compName, undefined, comp.gender),
          emergencyContact: {
            name: emergencyName || fullName.trim(),
            phone: emergencyPhone || phone.trim() || '+52 55 9999 8888',
            relationship: 'Grupo / Titular',
          },
          medicalNotes: `Integrante ${idx + 2}/${activeGroupSize} (${selectedPlan.name}) · Titular: ${fullName.trim()}`,
          biometricRegistered: true,
          membership: {
            planType: selectedPlan.type,
            planName: selectedPlan.name,
            startDate: calculatedDates.startDate,
            endDate: calculatedDates.endDate,
            price: selectedPlan.price,
            status: 'active',
            daysRemaining: calculatedDates.daysRemaining,
          },
        }, paymentMethod, { skipSale: true });
      });
    }

    onClientCreated(created, enrollNow);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    if (requiredCompanionsCount > 0 && !allGroupCompanionsReady) {
      setGroupCompanions(resizeGroupCompanions(groupCompanions, requiredCompanionsCount));
      setShowGroupCompanionsModal(true);
      return;
    }
    performRegisterMembers();
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
            {/* Direct Access Connection Badge */}
            <div className="p-3 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent rounded-xl border border-emerald-500/30 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Conexión 100% Directa con Control de Acceso</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">EN LÍNEA</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-tight mt-0.5">
                  Al guardar, este socio quedará habilitado de inmediato para ingresar por el torniquete usando su <strong>Cédula / Tarjeta RFID</strong> o <strong>Huella Digital</strong>.
                </p>
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
                      setAvatarUrl(getGymAvatar(val, undefined, detected));
                    }
                  }}
                  placeholder="Ej. Rodrigo Silva Mendoza"
                  className="w-full px-3 py-1.5 sm:py-2 bg-gym-surface rounded-xl border border-gym-border text-xs sm:text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-amber-400 block mb-1 flex items-center justify-between">
                  <span>Cédula / Tarjeta RFID / DNI *</span>
                  <span className="text-[10px] text-gym-muted font-normal">Clave de Torniquete</span>
                </label>
                <input
                  type="text"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="Ej. 10984523 o pasa tarjeta RFID..."
                  className="w-full px-3 py-1.5 sm:py-2 bg-gym-surface rounded-xl border border-amber-500/40 text-xs sm:text-sm text-white font-mono placeholder-gym-muted focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50"
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

              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full px-3 py-1.5 sm:py-2 bg-gym-surface rounded-xl border border-gym-border text-xs sm:text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Fecha de Cumpleaños y Edad */}
              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Fecha de Cumpleaños</span>
                  </span>
                  <span className="text-[10px] text-gym-muted font-normal">dd/mm/aaaa</span>
                </label>
                <BirthDatePickerField
                  displayValue={birthDateDisplay}
                  isoValue={birthDate}
                  compact
                  onInputChange={handleBirthDateInputChange}
                  onSelectDate={handleCalendarDateChange}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Edad</span>
                  </span>
                  {age ? (
                    <span className="text-[11px] text-emerald-400 font-bold animate-pulse flex items-center gap-1">
                      <Check className="w-3 h-3" /> Calculada ({age} años)
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-bold">(Automática)</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="8"
                    max="110"
                    value={age}
                    onChange={(e) => handleAgeChange(e.target.value)}
                    placeholder="Ej. 25"
                    className={`w-full px-3 py-1.5 sm:py-2 bg-gym-surface rounded-xl border text-xs sm:text-sm font-bold text-white placeholder-gym-muted focus:outline-none focus:border-amber-400 pr-14 ${
                      age ? 'border-emerald-500/60 text-emerald-300' : 'border-gym-border'
                    }`}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gym-muted font-bold pointer-events-none">
                    años
                  </span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gym-muted block mb-1.5">
                  Género e Imagen del Cliente (Mujer / Hombre)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setGenderFilter('female');
                      setHasManuallySelectedPhoto(true);
                      setAvatarUrl(FEMALE_CLIENT_AVATAR);
                    }}
                    className={`flex items-center justify-center gap-2.5 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all border cursor-pointer ${
                      genderFilter === 'female'
                        ? 'bg-pink-500/20 border-2 border-pink-400 text-white shadow-md'
                        : 'bg-gym-surface border-gym-border text-gym-muted hover:text-white'
                    }`}
                  >
                    <img src={FEMALE_CLIENT_AVATAR} alt="Mujer" className="w-9 h-9 rounded-lg object-contain bg-white p-0.5 shrink-0" />
                    <span>Mujer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGenderFilter('male');
                      setHasManuallySelectedPhoto(true);
                      setAvatarUrl(MALE_CLIENT_AVATAR);
                    }}
                    className={`flex items-center justify-center gap-2.5 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all border cursor-pointer ${
                      genderFilter === 'male'
                        ? 'bg-blue-500/20 border-2 border-blue-400 text-white shadow-md'
                        : 'bg-gym-surface border-gym-border text-gym-muted hover:text-white'
                    }`}
                  >
                    <img src={MALE_CLIENT_AVATAR} alt="Hombre" className="w-9 h-9 rounded-lg object-contain bg-white p-0.5 shrink-0" />
                    <span>Hombre</span>
                  </button>
                </div>
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
                  const optSize = getGroupPackageSize(opt.name, opt.type);
                  return (
                    <div
                      key={opt.id || opt.type}
                      onClick={() => {
                        setSelectedPlanId(opt.id);
                        setPlanType(opt.type);
                        const nextReq = Math.max(0, optSize - 1);
                        setGroupCompanions((prev) => resizeGroupCompanions(prev, nextReq));
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

                      <div className="mt-1.5 pt-1.5 border-t border-gym-border/40 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-gym-muted block">
                          Vigencia: {opt.duration}
                        </span>
                        {optSize > 1 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-400/30 inline-flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" />
                            <span>{optSize} personas</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {requiredCompanionsCount > 0 && (
                <div
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    allGroupCompanionsReady
                      ? 'bg-emerald-500/10 border-emerald-500/35'
                      : 'bg-amber-500/10 border-amber-500/40'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Users className={`w-3.5 h-3.5 ${allGroupCompanionsReady ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span>
                        {allGroupCompanionsReady
                          ? `✓ ${activeGroupSize} integrantes listos para registrar`
                          : `Falta registrar ${requiredCompanionsCount - completedCompanionsCount} acompañantes más`}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ✓ 1. {(fullName || 'Titular').trim().split(' ')[0]}
                      </span>
                      {activeGroupCompanions.map((c, idx) => {
                        const done = isGroupCompanionComplete(c);
                        return (
                          <span
                            key={idx}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              done
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-black/30 text-zinc-400 border-white/10'
                            }`}
                          >
                            {done ? `✓ ${idx + 2}. ${c.fullName.trim().split(' ')[0]}` : `${idx + 2}. Falta`}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGroupCompanions(resizeGroupCompanions(groupCompanions, requiredCompanionsCount));
                      setShowGroupCompanionsModal(true);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer shrink-0 ${
                      allGroupCompanionsReady
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500 hover:bg-amber-400 text-black'
                    }`}
                  >
                    {allGroupCompanionsReady ? 'Editar grupo' : `Registrar ${requiredCompanionsCount} acompañantes`}
                  </button>
                </div>
              )}
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
              {requiredCompanionsCount > 0 && !allGroupCompanionsReady
                ? `Registrar ${requiredCompanionsCount - completedCompanionsCount} acompañantes y Guardar`
                : requiredCompanionsCount > 0
                  ? `Guardar e Inscribir ${activeGroupSize} Personas`
                  : 'Guardar e Inscribir Cliente'}
            </button>
          </div>

        </form>

      </div>

      <GroupCompanionsModal
        isOpen={showGroupCompanionsModal && requiredCompanionsCount > 0}
        planName={selectedPlan?.name || ''}
        groupSize={activeGroupSize}
        primaryName={fullName}
        companions={activeGroupCompanions}
        onChangeCompanions={setGroupCompanions}
        onClose={() => setShowGroupCompanionsModal(false)}
        onConfirmAndContinue={() => {
          setShowGroupCompanionsModal(false);
          performRegisterMembers();
        }}
      />
    </div>
  );
};
