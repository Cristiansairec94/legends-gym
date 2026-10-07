import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { Employee, UserRole } from '../../types';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  UserCheck, 
  Activity, 
  Trash2, 
  Edit3, 
  X,
  CheckCircle2,
  Clock
} from 'lucide-react';

const SAMPLE_EMPLOYEE_AVATARS = [
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
];

export const EmployeesManager: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee, currentRole } = useGym();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(SAMPLE_EMPLOYEE_AVATARS[0]);
  const [role, setRole] = useState<UserRole>('receptionist');
  const [jobTitle, setJobTitle] = useState('');
  const [shift, setShift] = useState<Employee['shift']>('Matutino (06:00 - 14:00)');
  const [salaryMonthly, setSalaryMonthly] = useState<number>(12000);

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      emp.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.phone.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalMonthlyPayroll = employees.reduce((sum, e) => sum + (e.status === 'active' ? e.salaryMonthly : 0), 0);
  const activeStaffCount = employees.filter(e => e.status === 'active').length;

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    addEmployee({
      fullName: fullName.trim(),
      documentId: documentId.trim() || `${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: email.trim() || `${fullName.toLowerCase().replace(/\s+/g, '.')}@legendsgym.com`,
      phone: phone.trim() || '+52 55 0000 0000',
      avatarUrl,
      role,
      jobTitle: jobTitle.trim() || (role === 'admin' ? 'Administrador' : role === 'trainer' ? 'Entrenador de Piso' : 'Recepcionista'),
      shift,
      status: 'active',
      hireDate: new Date().toISOString().slice(0, 10),
      salaryMonthly: Number(salaryMonthly) || 12000,
    });

    setShowAddModal(false);
    setFullName('');
    setDocumentId('');
    setEmail('');
    setPhone('');
    setJobTitle('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gym-card p-5 rounded-2xl border border-gym-border shadow-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-wide uppercase">
                  Gestión de Empleados
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-950/70 text-amber-300 border border-amber-500/40 shadow-sm">
                  Personal
                </span>
              </div>
              <p className="text-xs text-gym-muted mt-0.5">
                Administración del staff operativo: roles de sistema, turnos, sueldos y datos de contacto.
              </p>
            </div>
          </div>
        </div>

        {currentRole === 'admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm shadow-glow-gold transition-all"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuevo Empleado</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <span className="text-xs text-gym-muted block uppercase font-bold">Total Personal</span>
          <span className="text-2xl font-black text-white mt-1 block">{employees.length}</span>
          <span className="text-xs text-emerald-400 mt-1 block font-semibold">{activeStaffCount} activos</span>
        </div>

        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <span className="text-xs text-gym-muted block uppercase font-bold">Nómina Mensual Base</span>
          <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
            ${totalMonthlyPayroll.toLocaleString()} MXN
          </span>
          <span className="text-xs text-gym-muted mt-1 block">Personal en nómina</span>
        </div>

        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <span className="text-xs text-gym-muted block uppercase font-bold">Recepcionistas</span>
          <span className="text-2xl font-black text-blue-400 mt-1 block">
            {employees.filter(e => e.role === 'receptionist').length}
          </span>
          <span className="text-xs text-gym-muted mt-1 block">Atención & Caja</span>
        </div>

        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <span className="text-xs text-gym-muted block uppercase font-bold">Coaches & Trainers</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            {employees.filter(e => e.role === 'trainer').length}
          </span>
          <span className="text-xs text-gym-muted mt-1 block">Piso & Clases</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-gym-card p-4 rounded-2xl border border-gym-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gym-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, puesto o correo..."
            className="w-full pl-9 pr-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'admin', label: 'Administradores' },
            { id: 'receptionist', label: 'Recepción' },
            { id: 'trainer', label: 'Entrenadores' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id as typeof roleFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                roleFilter === tab.id
                  ? 'bg-amber-500 text-black font-bold'
                  : 'bg-gym-surface text-gym-muted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-gym-card rounded-2xl border border-gym-border overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gym-border bg-gym-surface/40 text-[11px] font-bold uppercase tracking-wider text-gym-muted">
                <th className="p-4">Empleado</th>
                <th className="p-4">Puesto / Cargo</th>
                <th className="p-4">Rol en Sistema</th>
                <th className="p-4">Turno Asignado</th>
                <th className="p-4">Sueldo Base</th>
                <th className="p-4">Estado</th>
                {currentRole === 'admin' && <th className="p-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gym-border/40 text-sm">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gym-surface/40 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.avatarUrl}
                        alt={emp.fullName}
                        className="w-10 h-10 rounded-full object-cover border border-gym-border shrink-0"
                      />
                      <div>
                        <div className="font-bold text-white text-xs">{emp.fullName}</div>
                        <div className="text-[11px] text-gym-muted font-mono">{emp.id} • {emp.phone}</div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="font-semibold text-white text-xs block">{emp.jobTitle}</span>
                    <span className="text-[10px] text-gym-muted">Desde {emp.hireDate}</span>
                  </td>

                  <td className="p-4">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${
                      emp.role === 'admin'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : emp.role === 'receptionist'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {emp.role === 'admin' ? 'Administrador' : emp.role === 'receptionist' ? 'Recepción' : 'Coach / Trainer'}
                    </span>
                  </td>

                  <td className="p-4 text-xs text-gray-300">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gym-muted" />
                      <span>{emp.shift}</span>
                    </div>
                  </td>

                  <td className="p-4 font-mono font-bold text-xs text-amber-400">
                    ${emp.salaryMonthly.toLocaleString()} MXN
                  </td>

                  <td className="p-4">
                    <button
                      onClick={() => {
                        if (currentRole === 'admin') {
                          updateEmployee(emp.id, { status: emp.status === 'active' ? 'inactive' : 'active' });
                        }
                      }}
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full transition-colors ${
                        emp.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}
                    >
                      {emp.status === 'active' ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>

                  {currentRole === 'admin' && (
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar al empleado ${emp.fullName}?`)) {
                            deleteEmployee(emp.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-gym-surface hover:bg-red-500/20 text-gym-muted hover:text-red-400 transition-colors"
                        title="Eliminar empleado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar Empleado */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-lg overflow-hidden shadow-2xl relative my-6">
            <div className="p-4 border-b border-gym-border flex items-center justify-between bg-gym-surface/40">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Registrar Nuevo Empleado</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gym-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4">
              {/* Avatar Selector */}
              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-2">
                  Foto de Perfil del Empleado:
                </label>
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {SAMPLE_EMPLOYEE_AVATARS.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="avatar"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-12 h-12 rounded-full object-cover cursor-pointer border-2 transition-all ${
                        avatarUrl === url ? 'border-amber-400 scale-105' : 'border-gym-border opacity-70'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Andrés Navarro López"
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Rol en Sistema</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="receptionist">Recepción / Cajero</option>
                    <option value="trainer">Coach / Entrenador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Puesto / Cargo</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Ej. Entrenador Funcional"
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Turno</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as Employee['shift'])}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Matutino (06:00 - 14:00)">Matutino (06:00 - 14:00)</option>
                    <option value="Vespertino (14:00 - 22:00)">Vespertino (14:00 - 22:00)</option>
                    <option value="Turno Completo">Turno Completo</option>
                    <option value="Fines de Semana">Fines de Semana</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Sueldo Mensual ($)</label>
                  <input
                    type="number"
                    value={salaryMonthly}
                    onChange={(e) => setSalaryMonthly(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+52 55..."
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@legendsgym.com"
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gym-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-gym-surface text-xs font-semibold text-gym-muted hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold"
                >
                  Guardar Empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
