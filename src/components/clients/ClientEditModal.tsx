import React, { useState } from 'react';
import { Client, MembershipStatus, MembershipPlanType, DEFAULT_CLIENT_AVATAR } from '../../types';
import { useGym } from '../../context/GymContext';
import { 
  X, 
  Pencil, 
  User, 
  Phone, 
  Mail, 
  CreditCard, 
  HeartPulse, 
  Calendar, 
  Save, 
  CheckCircle2, 
  ShieldAlert, 
  Plus,
  Clock,
  Check
} from 'lucide-react';
import { calculateAgeFromBirthDate, parseLocalDate, getLocalDateString, calculateDaysRemaining } from '../../utils/membershipUtils';
import { 
  getGymAvatar,
  detectGender,
  FEMALE_CLIENT_AVATAR,
  MALE_CLIENT_AVATAR
} from '../../utils/genderAvatar';

interface ClientEditModalProps {
  client: Client;
  onClose: () => void;
  onClientUpdated?: (updatedClient: Client) => void;
}

export const ClientEditModal: React.FC<ClientEditModalProps> = ({
  client,
  onClose,
  onClientUpdated,
}) => {
  const { updateMember, addNotification, catalogPlans, updateCatalogPlan, addCatalogPlan } = useGym();

  const [fullName, setFullName] = useState(client.fullName || '');
  const [documentId, setDocumentId] = useState(client.documentId || '');
  const [email, setEmail] = useState(client.email || '');
  const [phone, setPhone] = useState(client.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(() => getGymAvatar(client.fullName || '', client.avatarUrl, client.gender));
  const [genderFilter, setGenderFilter] = useState<'male' | 'female'>(() => client.gender || detectGender(client.fullName || ''));
  const [hasManuallySelectedPhoto, setHasManuallySelectedPhoto] = useState(false);
  const [birthDate, setBirthDate] = useState(client.birthDate || '');
  
  // Emergency contact
  const [emergencyName, setEmergencyName] = useState(client.emergencyContact?.name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(client.emergencyContact?.phone || '');
  const [emergencyRel, setEmergencyRel] = useState(client.emergencyContact?.relationship || '');
  
  // Medical notes
  const [medicalNotes, setMedicalNotes] = useState(client.medicalNotes || '');

  // Membership fields
  const [planName, setPlanName] = useState(client.membership?.planName || '');
  const [planPrice, setPlanPrice] = useState<number | string>(client.membership?.price ?? 0);
  const [status, setStatus] = useState<MembershipStatus>(client.membership?.status || 'active');
  const [startDate, setStartDate] = useState(client.membership?.startDate || '');
  const [endDate, setEndDate] = useState(client.membership?.endDate || '');
  const [planType, setPlanType] = useState<MembershipPlanType>(client.membership?.planType || 'monthly');

  const DEFAULT_PLANS: { id: string; type: MembershipPlanType; name: string; price: number; duration: string; durationDays: number }[] = [
    { id: 'CAT-PLAN-002', type: 'weekly', name: 'Pase Semanal (Semana por persona)', price: 150, duration: '7 días', durationDays: 7 },
    { id: 'CAT-PLAN-003', type: 'biweekly', name: 'Pase Quincenal (15 Días)', price: 250, duration: '15 días', durationDays: 15 },
    { id: 'CAT-PLAN-004', type: 'monthly', name: 'Mensualidad Individual', price: 420, duration: '30 días', durationDays: 30 },
    { id: 'CAT-PLAN-005', type: 'group', name: 'Paquete 3 Personas (Mensual)', price: 1100, duration: '30 días', durationDays: 30 },
    { id: 'CAT-PLAN-006', type: 'group', name: 'Paquete 4 Personas (Mensual)', price: 1500, duration: '30 días', durationDays: 30 },
  ];

  const planOptions = catalogPlans && catalogPlans.length > 0
    ? catalogPlans.map(p => {
        let duration = `${p.durationDays} dÃ­as`;
        if (p.durationDays === 1) duration = '1 dÃ­a';
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

  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    if (client.membership?.planName && catalogPlans) {
      const match = catalogPlans.find(p => p.name.toLowerCase() === client.membership.planName.toLowerCase());
      if (match) return match.id;
    }
    return '';
  });

  // Modal para editar plan del catÃ¡logo
  const [editingPlan, setEditingPlan] = useState<{ id: string; name: string; price: number } | null>(null);
  const [editPlanName, setEditPlanName] = useState('');
  const [editPlanPrice, setEditPlanPrice] = useState<string | number>('');

  const handleOpenEditPlan = (plan: { id: string; name: string; price: number }) => {
    setEditingPlan(plan);
    setEditPlanName(plan.name);
    setEditPlanPrice(plan.price);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    if (!editPlanName.trim()) return;
    const priceNum = Number(editPlanPrice);
    if (isNaN(priceNum) || priceNum < 0) return;

    updateCatalogPlan(editingPlan.id, {
      name: editPlanName.trim(),
      price: priceNum,
    });

    if (selectedPlanId === editingPlan.id || planName === editingPlan.name) {
      setPlanName(editPlanName.trim());
      setPlanPrice(priceNum);
    }

    addNotification({
      type: 'info',
      title: 'Plan Actualizado',
      message: `El plan "${editPlanName.trim()}" ahora cuesta $${priceNum} MXN.`,
    });

    setEditingPlan(null);
  };

  // Modal para aÃ±adir nueva membresÃ­a
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState<string | number>('');
  const [newPlanDurationDays, setNewPlanDurationDays] = useState<number>(30);

  const handleCreateNewPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;
    const priceNum = Number(newPlanPrice);
    if (isNaN(priceNum) || priceNum < 0) return;
    const days = Number(newPlanDurationDays) || 30;

    let type: MembershipPlanType = 'monthly';
    if (days <= 1) type = 'daily';
    else if (days <= 31) type = 'monthly';
    else if (days <= 95) type = 'quarterly';
    else type = 'annual';

    const created = addCatalogPlan({
      name: newPlanName.trim(),
      price: priceNum,
      durationDays: days,
      type,
      benefits: ['Acceso total a instalaciones y equipamiento'],
      active: true,
    });

    addNotification({
      type: 'info',
      title: 'Nueva MembresÃ­a Creada',
      message: `El plan "${created.name}" ($${created.price} MXN) fue aÃ±adido exitosamente.`,
    });

    setSelectedPlanId(created.id);
    setPlanType(created.type);
    setPlanName(created.name);
    setPlanPrice(created.price);

    const baseDate = startDate ? new Date(startDate) : new Date();
    if (!isNaN(baseDate.getTime())) {
      const newEnd = new Date(baseDate);
      newEnd.setDate(newEnd.getDate() + days);
      setEndDate(newEnd.toISOString().split('T')[0]);
    }

    setShowAddPlanModal(false);
    setNewPlanName('');
    setNewPlanPrice('');
    setNewPlanDurationDays(30);
  };

  const handleSelectPlan = (opt: { id: string; type: MembershipPlanType; name: string; price: number; duration: string; durationDays: number }) => {
    setSelectedPlanId(opt.id);
    setPlanType(opt.type);
    setPlanName(opt.name);
    setPlanPrice(opt.price);

    const baseDate = (startDate ? parseLocalDate(startDate) : null) || new Date();
    baseDate.setHours(0, 0, 0, 0);
    if (!isNaN(baseDate.getTime())) {
      const newEnd = new Date(baseDate);
      newEnd.setDate(newEnd.getDate() + opt.durationDays);
      setEndDate(getLocalDateString(newEnd));
    }
  };

  const [activeTab, setActiveTab] = useState<'personal' | 'membership' | 'emergency' | 'medical'>('personal');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    let daysRemaining = client.membership?.daysRemaining ?? 0;
    if (endDate) {
      daysRemaining = calculateDaysRemaining(endDate);
    }

    const updatedData: Partial<Client> = {
      fullName: fullName.trim(),
      documentId: documentId.trim() || client.documentId,
      email: email.trim() || client.email,
      phone: phone.trim(),
      gender: genderFilter,
      avatarUrl: getGymAvatar(fullName.trim(), avatarUrl, genderFilter),
      birthDate: birthDate || undefined,
      emergencyContact: {
        name: emergencyName.trim(),
        phone: emergencyPhone.trim(),
        relationship: emergencyRel.trim(),
      },
      medicalNotes: medicalNotes.trim(),
      membership: {
        ...client.membership,
        planType: planType || client.membership.planType,
        planName: planName.trim() || client.membership.planName,
        price: !isNaN(Number(planPrice)) && Number(planPrice) >= 0 ? Number(planPrice) : client.membership.price,
        status,
        startDate: startDate || client.membership.startDate,
        endDate: endDate || client.membership.endDate,
        daysRemaining,
      },
    };

    updateMember(client.id, updatedData);

    addNotification({
      type: 'info',
      title: 'Cliente Modificado',
      message: `Los datos de "${fullName}" han sido actualizados exitosamente.`,
    });

    setSavedSuccess(true);

    if (onClientUpdated) {
      onClientUpdated({ ...client, ...updatedData } as Client);
    }

    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-2xl overflow-hidden shadow-2xl relative my-8">
        
        {/* Header */}
        <div className="p-5 border-b border-gym-border flex items-center justify-between bg-gym-surface/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-white">Editar Datos del Cliente</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gym-surface text-gym-muted border border-gym-border">
                  {client.id}
                </span>
              </div>
              <p className="text-xs text-gym-muted">Actualiza los datos personales, contacto y membresÃ­a</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gym-muted hover:text-white hover:bg-gym-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gym-border bg-gym-surface/20 px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'personal'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-gym-muted hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Personal & Contacto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('membership')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'membership'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-gym-muted hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>MembresÃ­a</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('emergency')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'emergency'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-gym-muted hover:text-white'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Emergencia</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('medical')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'medical'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-gym-muted hover:text-white'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Ficha MÃ©dica</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* TAB 1: Personal & Contacto */}
          {activeTab === 'personal' && (
            <div className="space-y-4 animate-fade-in">
              {/* Basic Fields Grid */}
              {/* Badge indicando conexiÃ³n directa con control de acceso */}
              <div className="p-3 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent rounded-xl border border-emerald-500/30 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Sincronizado con Torniquetes y Control de Acceso</p>
                  <p className="text-[11px] text-zinc-300">
                    Cualquier cambio a la CÃ©dula/RFID o MembresÃ­a se actualiza de inmediato en los lectores de acceso.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-crimson-400 block mb-1 flex items-center justify-between">
                    <span>Cédula / Tarjeta RFID / DNI *</span>
                    <span className="text-[10px] text-gym-muted font-normal">Clave de Torniquete / RFID</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    placeholder="Ej. 10984523 o tarjeta RFID"
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-crimson-500/40 font-mono text-sm text-white placeholder-gym-muted focus:outline-none focus:border-crimson-400 focus:ring-1 focus:ring-crimson-400/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">
                    TelÃ©fono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+52 55 9876 5432"
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">
                    Correo ElectrÃ³nico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gym-muted block mb-1">
                      Fecha de Nacimiento
                    </label>
                    <input
                      type="date"
                      min="1900-01-01"
                      max={getLocalDateString()}
                      value={birthDate}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (!raw) {
                          setBirthDate('');
                          return;
                        }
                        const todayIso = getLocalDateString();
                        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
                          const y = parseInt(raw.slice(0, 4), 10);
                          if (y >= 1900 && raw <= todayIso) {
                            setBirthDate(raw);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-blue-400 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gym-muted block mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Edad</span>
                      </span>
                      {calculateAgeFromBirthDate(birthDate) !== null ? (
                        <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Calculada ({calculateAgeFromBirthDate(birthDate)} años)
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-bold">(Automática)</span>
                      )}
                    </label>
                    <div className="px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm font-bold text-white flex items-center justify-between">
                      <span>{calculateAgeFromBirthDate(birthDate) !== null ? `${calculateAgeFromBirthDate(birthDate)}` : 'Sin calcular'}</span>
                      <span className="text-xs text-gym-muted">años</span>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gym-muted block mb-1.5">
                    GÃ©nero e Imagen del Cliente (Mujer / Hombre)
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
            </div>
          )}

          {/* TAB 2: MembresÃ­a */}
          {activeTab === 'membership' && (
            <div className="space-y-5 animate-fade-in">
              {/* SecciÃ³n Seleccionar Plan de MembresÃ­a */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-white block">
                      Seleccionar Plan de MembresÃ­a:
                    </label>
                    <span className="text-[11px] text-gym-muted">
                      Haz clic en <strong className="text-crimson-400">Editar</strong> para cambiar nombre/costo o añade nuevas membresías.
                    </span>
                  </div>

                  {/* Botón para añadir nueva membresía */}
                  <button
                    type="button"
                    onClick={() => setShowAddPlanModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-crimson-500 hover:bg-crimson-400 text-white font-extrabold text-xs shadow-glow-crimson transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                    title="Añadir una nueva membresía al catálogo"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Nueva Membresía</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {planOptions.map((opt) => {
                    const isSelected = selectedPlanId
                      ? selectedPlanId === opt.id
                      : (planName.toLowerCase() === opt.name.toLowerCase() || planType === opt.type);
                    return (
                      <div
                        key={opt.id || opt.type}
                        onClick={() => handleSelectPlan(opt)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all relative group ${
                          isSelected
                            ? 'bg-crimson-500/15 border-crimson-400 shadow-glow-crimson/40'
                            : 'bg-gym-surface/60 border-gym-border hover:border-gym-border/80'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-bold text-white leading-snug">{opt.name}</span>
                          <span className="text-xs font-mono font-extrabold text-crimson-400 shrink-0">
                            ${opt.price} MXN
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gym-border/40">
                          <span className="text-[10px] text-gym-muted block">
                            Vigencia: {opt.duration}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditPlan(opt);
                            }}
                            className="px-2 py-1 rounded-lg bg-gym-surface hover:bg-crimson-500/20 text-gym-muted hover:text-crimson-400 border border-gym-border hover:border-crimson-500/40 text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm"
                            title="Editar costo y nombre de esta membresía"
                          >
                            <Pencil className="w-3 h-3 text-crimson-400" />
                            <span>Editar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Campos manuales / detalles de la membresÃ­a */}
              <div className="pt-2 border-t border-gym-border/60">
                <span className="text-[11px] font-bold text-gym-muted uppercase tracking-wider block mb-3">
                  Detalles y Vigencia de la MembresÃ­a
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gym-muted block mb-1">
                      Nombre del Plan / MembresÃ­a
                    </label>
                    <input
                      type="text"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder="Ej. Mensualidad EstÃ¡ndar"
                      className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gym-muted block mb-1">
                      Costo de la MembresÃ­a ($ MXN)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm text-gym-muted font-mono">$</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={planPrice}
                        onChange={(e) => setPlanPrice(e.target.value)}
                        placeholder="850"
                        className="w-full pl-7 pr-16 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-blue-400 font-mono font-bold"
                      />
                      <span className="absolute right-3 top-2 text-xs text-blue-400 font-mono font-extrabold">MXN</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gym-muted block mb-1">
                      Estado de MembresÃ­a
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as MembershipStatus)}
                      className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-blue-400"
                    >
                      <option value="active">Activa (Vigente)</option>
                      <option value="expiring_soon">Por Vencer (Alerta de vencimiento)</option>
                      <option value="expired">Vencida / Inactiva</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gym-muted block mb-1">
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gym-muted block mb-1">
                      Fecha de Vencimiento
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Contacto de Emergencia */}
          {activeTab === 'emergency' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gym-muted block mb-1">
                    Nombre del Contacto de Emergencia
                  </label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="Ej. MarÃ­a Vega (Madre)"
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">
                    TelÃ©fono de Emergencia
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="+52 55 9999 8888"
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">
                    Parentesco o RelaciÃ³n
                  </label>
                  <input
                    type="text"
                    value={emergencyRel}
                    onChange={(e) => setEmergencyRel(e.target.value)}
                    placeholder="Ej. CÃ³nyuge / Hermano / Amigo"
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Ficha MÃ©dica */}
          {activeTab === 'medical' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">
                  Observaciones ClÃ­nicas / Ficha MÃ©dica
                </label>
                <textarea
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  rows={5}
                  placeholder="Alergias, hipertensiÃ³n, lesiones de rodilla o columna, restricciones de peso..."
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-blue-400 resize-none"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gym-border">
            <span className="text-xs text-gym-muted">
              {savedSuccess ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Cambios guardados con Ã©xito
                </span>
              ) : (
                'Verifica los datos antes de guardar'
              )}
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-xs font-semibold text-gym-muted hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-black text-sm shadow-lg shadow-blue-500/20 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>

        </form>

      </div>

      {/* Modal para editar costo y nombre de la membresÃ­a */}
      {editingPlan && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gym-card rounded-2xl border border-crimson-500/40 w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-gym-border flex items-center justify-between bg-gym-surface/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-crimson-500/20 text-crimson-400 border border-crimson-500/30">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">Editar Plan de Membresía</h4>
                  <p className="text-[11px] text-gym-muted">Modifica el nombre y costo de esta membresía</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="p-1.5 rounded-lg text-gym-muted hover:text-white hover:bg-gym-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">
                  Nombre de la Membresía *
                </label>
                <input
                  type="text"
                  required
                  value={editPlanName}
                  onChange={(e) => setEditPlanName(e.target.value)}
                  placeholder="Ej. Mensualidad Estándar"
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-crimson-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">
                  Costo de la Membresía ($ MXN) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-gym-muted font-mono">$</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editPlanPrice}
                    onChange={(e) => setEditPlanPrice(e.target.value)}
                    placeholder="850"
                    className="w-full pl-7 pr-16 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-crimson-400 font-mono font-bold"
                  />
                  <span className="absolute right-3 top-2 text-xs text-crimson-400 font-mono font-extrabold">MXN</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gym-border">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-xs font-semibold text-gym-muted hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-crimson-500 hover:bg-crimson-400 text-white font-black text-xs shadow-glow-crimson transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Membresía</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para añadir nueva membresía */}
      {showAddPlanModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gym-card rounded-2xl border border-crimson-500/40 w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-gym-border flex items-center justify-between bg-gym-surface/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-crimson-500/20 text-crimson-400 border border-crimson-500/30">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">Añadir Nueva Membresía</h4>
                  <p className="text-[11px] text-gym-muted">Registra un nuevo plan para ofrecer a los clientes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPlanModal(false)}
                className="p-1.5 rounded-lg text-gym-muted hover:text-white hover:bg-gym-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewPlan} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">
                  Nombre de la Membresía *
                </label>
                <input
                  type="text"
                  required
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="Ej. Membresía Estudiantes, Trimestral Cross, etc."
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-crimson-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">
                  Costo de la Membresía ($ MXN) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-gym-muted font-mono">$</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={newPlanPrice}
                    onChange={(e) => setNewPlanPrice(e.target.value)}
                    placeholder="750"
                    className="w-full pl-7 pr-16 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-crimson-400 font-mono font-bold"
                  />
                  <span className="absolute right-3 top-2 text-xs text-crimson-400 font-mono font-extrabold">MXN</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1.5">
                  Vigencia del Plan (Días de acceso) *
                </label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {[
                    { label: '1 Día', days: 1 },
                    { label: '15 Días', days: 15 },
                    { label: '1 Mes (30d)', days: 30 },
                    { label: '3 Meses (90d)', days: 90 },
                    { label: '6 Meses (180d)', days: 180 },
                    { label: '1 Año (365d)', days: 365 },
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => setNewPlanDurationDays(preset.days)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors ${
                        newPlanDurationDays === preset.days
                          ? 'bg-crimson-500/20 border-crimson-400 text-crimson-400'
                          : 'bg-gym-surface border-gym-border text-gym-muted hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gym-muted">Personalizado:</span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={newPlanDurationDays}
                    onChange={(e) => setNewPlanDurationDays(Number(e.target.value) || 1)}
                    className="w-24 px-2.5 py-1.5 bg-gym-surface rounded-xl border border-gym-border text-xs text-white focus:outline-none focus:border-crimson-400 font-mono font-bold"
                  />
                  <span className="text-xs text-gym-muted">días de acceso</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gym-border">
                <button
                  type="button"
                  onClick={() => setShowAddPlanModal(false)}
                  className="px-4 py-2 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-xs font-semibold text-gym-muted hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-crimson-500 hover:bg-crimson-400 text-white font-black text-xs shadow-glow-crimson transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Guardar y Crear Membresía</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
