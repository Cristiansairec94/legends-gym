import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { SystemCatalogPlan, MembershipPlanType } from '../../types';
import { 
  SlidersHorizontal, 
  Plus, 
  Check, 
  Save, 
  Building2, 
  CreditCard, 
  Tag, 
  Clock, 
  ShieldCheck, 
  Trash2, 
  X,
  Edit2
} from 'lucide-react';

export const SystemCatalogs: React.FC = () => {
  const { 
    catalogPlans, 
    addCatalogPlan, 
    updateCatalogPlan, 
    deleteCatalogPlan, 
    gymSettings, 
    updateGymSettings, 
    currentRole 
  } = useGym();

  const [activeTab, setActiveTab] = useState<'plans' | 'gym' | 'turnstile'>('plans');

  // Gym settings local state
  const [gymName, setGymName] = useState(gymSettings.gymName);
  const [legalName, setLegalName] = useState(gymSettings.legalName);
  const [rfc, setRfc] = useState(gymSettings.rfc);
  const [phone, setPhone] = useState(gymSettings.phone);
  const [address, setAddress] = useState(gymSettings.address);
  const [email, setEmail] = useState(gymSettings.email);
  const [turnstileTimeout, setTurnstileTimeout] = useState(gymSettings.turnstileTimeoutSeconds);
  const [gracePeriod, setGracePeriod] = useState(gymSettings.allowGracePeriodDays);

  const [savedFeedback, setSavedFeedback] = useState(false);

  // New Plan modal state
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planType, setPlanType] = useState<MembershipPlanType>('monthly');
  const [planDays, setPlanDays] = useState(30);
  const [planPrice, setPlanPrice] = useState(850);
  const [planBenefits, setPlanBenefits] = useState('Acceso 30 días, Torniquete biométrico');

  const handleSaveGymSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateGymSettings({
      gymName,
      legalName,
      rfc,
      phone,
      address,
      email,
      turnstileTimeoutSeconds: Number(turnstileTimeout),
      allowGracePeriodDays: Number(gracePeriod),
    });

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const handleAddPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) return;

    addCatalogPlan({
      name: planName.trim(),
      type: planType,
      durationDays: Number(planDays),
      price: Number(planPrice),
      benefits: planBenefits.split(',').map(b => b.trim()).filter(Boolean),
      active: true,
    });

    setShowAddPlanModal(false);
    setPlanName('');
    setPlanBenefits('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gym-card p-5 rounded-2xl border border-gym-border shadow-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-wide uppercase">
                  Catálogos de Sistema
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-gym-surface text-gray-300 border border-gym-border">
                  Sistema
                </span>
              </div>
              <p className="text-xs text-gym-muted mt-0.5">
                Configuración de planes de membresía, precios de cuotas, datos fiscales del gimnasio y parámetros del torniquete.
              </p>
            </div>
          </div>
        </div>

        {savedFeedback && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold animate-fade-in">
            <Check className="w-4 h-4" />
            <span>Configuración guardada</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gym-border pb-3">
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'plans'
              ? 'bg-amber-500 text-black shadow-glow-gold'
              : 'bg-gym-card text-gym-muted hover:text-white border border-gym-border'
          }`}
        >
          Planes y Membresías ({catalogPlans.length})
        </button>
        <button
          onClick={() => setActiveTab('gym')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'gym'
              ? 'bg-amber-500 text-black shadow-glow-gold'
              : 'bg-gym-card text-gym-muted hover:text-white border border-gym-border'
          }`}
        >
          Datos del Gimnasio & Tickets
        </button>
        <button
          onClick={() => setActiveTab('turnstile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'turnstile'
              ? 'bg-amber-500 text-black shadow-glow-gold'
              : 'bg-gym-card text-gym-muted hover:text-white border border-gym-border'
          }`}
        >
          Parámetros Biométricos & Tolerancia
        </button>
      </div>

      {/* Tab 1: Plans Catalog */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gym-muted">
              Estos planes aparecen automáticamente en la cartera de clientes, terminal de torniquete y renovaciones.
            </p>
            {currentRole === 'admin' && (
              <button
                onClick={() => setShowAddPlanModal(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Agregar Nuevo Plan</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catalogPlans.map((plan) => (
              <div 
                key={plan.id}
                className="bg-gym-card p-5 rounded-2xl border border-gym-border shadow-md flex flex-col justify-between hover:border-amber-400/40 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-gym-muted uppercase">
                        {plan.id} • {plan.durationDays} días de vigencia
                      </span>
                      <h3 className="font-black text-lg text-white mt-0.5">{plan.name}</h3>
                    </div>
                    <span className="text-xl font-mono font-black text-amber-400">
                      ${plan.price.toLocaleString()} MXN
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gym-border/60">
                    <span className="text-[11px] font-semibold text-gym-muted block mb-1.5">
                      Beneficios incluidos:
                    </span>
                    <ul className="space-y-1 text-xs text-gray-300">
                      {plan.benefits.map((b, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gym-border/60 flex items-center justify-between text-xs">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    plan.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {plan.active ? 'Activo en Mostrador' : 'Pausado'}
                  </span>

                  {currentRole === 'admin' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCatalogPlan(plan.id, { active: !plan.active })}
                        className="text-xs text-gym-muted hover:text-white underline"
                      >
                        {plan.active ? 'Pausar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar plan ${plan.name}?`)) {
                            deleteCatalogPlan(plan.id);
                          }
                        }}
                        className="p-1 rounded-lg text-gym-muted hover:text-red-400"
                        title="Eliminar plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Gym Settings */}
      {activeTab === 'gym' && (
        <form onSubmit={handleSaveGymSettings} className="bg-gym-card rounded-2xl border border-gym-border p-6 shadow-md space-y-5">
          <div className="border-b border-gym-border pb-3">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Identidad y Datos Fiscales para Recibos de Venta</span>
            </h3>
            <p className="text-xs text-gym-muted mt-0.5">
              Esta información se imprime en el encabezado y pie de página de los tickets de comandera.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gym-muted block mb-1">Nombre Comercial del Gimnasio</label>
              <input
                type="text"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gym-muted block mb-1">Razón Social Legal</label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gym-muted block mb-1">RFC / Identificación Tributaria</label>
              <input
                type="text"
                value={rfc}
                onChange={(e) => setRfc(e.target.value)}
                className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gym-muted block mb-1">Teléfono Sucursal</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gym-muted block mb-1">Dirección Completa de la Sucursal</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gym-muted block mb-1">Email de Contacto</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gym-border flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm shadow-glow-gold flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Datos del Gimnasio</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Turnstile & Biometrics Parameters */}
      {activeTab === 'turnstile' && (
        <form onSubmit={handleSaveGymSettings} className="bg-gym-card rounded-2xl border border-gym-border p-6 shadow-md space-y-5">
          <div className="border-b border-gym-border pb-3">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Tolerancia de Membresías & Torniquete Biométrico</span>
            </h3>
            <p className="text-xs text-gym-muted mt-0.5">
              Ajustes de comportamiento del sensor de huella y reglas de acceso para socios con cuota pendiente.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="p-4 rounded-xl bg-gym-surface/60 border border-gym-border space-y-2">
              <label className="text-xs font-bold text-white block">
                Tiempo de Desbloqueo del Torniquete (Segundos)
              </label>
              <p className="text-xs text-gym-muted">
                Lapso durante el cual la compuerta física permanece abierta tras una huella válida.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={turnstileTimeout}
                  onChange={(e) => setTurnstileTimeout(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <span className="text-base font-mono font-black text-amber-400 w-12 text-right">
                  {turnstileTimeout} seg
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gym-surface/60 border border-gym-border space-y-2">
              <label className="text-xs font-bold text-white block">
                Días de Gracia para Membresías Vencidas
              </label>
              <p className="text-xs text-gym-muted">
                Permitir acceso con alerta preventiva si el socio venció hace menos de X días.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="range"
                  min="0"
                  max="7"
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <span className="text-base font-mono font-black text-amber-400 w-12 text-right">
                  {gracePeriod} días
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gym-border flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm shadow-glow-gold flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Parámetros Biométricos</span>
            </button>
          </div>
        </form>
      )}

      {/* Add Plan Modal */}
      {showAddPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-md overflow-hidden shadow-2xl relative my-6">
            <div className="p-4 border-b border-gym-border flex items-center justify-between bg-gym-surface/40">
              <h3 className="font-bold text-base text-white">Agregar Nuevo Plan al Catálogo</h3>
              <button onClick={() => setShowAddPlanModal(false)} className="text-gym-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPlan} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">Nombre del Plan *</label>
                <input
                  type="text"
                  required
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="Ej. Plan Semestral Cross Training"
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Tipo</label>
                  <select
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value as MembershipPlanType)}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="daily">Diario</option>
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="annual">Anual</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Duración (Días)</label>
                  <input
                    type="number"
                    value={planDays}
                    onChange={(e) => setPlanDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">Precio al Público ($ MXN)</label>
                <input
                  type="number"
                  value={planPrice}
                  onChange={(e) => setPlanPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">
                  Beneficios (separados por coma)
                </label>
                <textarea
                  value={planBenefits}
                  onChange={(e) => setPlanBenefits(e.target.value)}
                  rows={2}
                  placeholder="Área de pesas, Asesoría nutricional, Torniquete..."
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gym-border">
                <button
                  type="button"
                  onClick={() => setShowAddPlanModal(false)}
                  className="px-4 py-2 rounded-xl bg-gym-surface text-xs font-semibold text-gym-muted hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold"
                >
                  Crear Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
