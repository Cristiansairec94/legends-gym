import React, { useState, useRef } from 'react';
import { useGym } from '../../context/GymContext';
import { Employee, UserRole, DEFAULT_EMPLOYEE_AVATAR } from '../../types';
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
  Clock,
  Upload,
  Camera,
  KeyRound,
  Key,
  Eye,
  EyeOff,
  User,
  Lock,
  Sparkles
} from 'lucide-react';

export const EmployeesManager: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee, currentRole } = useGym();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_EMPLOYEE_AVATAR);
  const [role, setRole] = useState<UserRole>('receptionist');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('1234');
  const [showPassword, setShowPassword] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [shift, setShift] = useState<Employee['shift']>('Matutino (06:00 - 14:00)');
  const [salaryMonthly, setSalaryMonthly] = useState<number>(12000);

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      emp.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.phone.toLowerCase().includes(search.toLowerCase()) ||
      (emp.username && emp.username.toLowerCase().includes(search.toLowerCase()));

    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalMonthlyPayroll = employees.reduce((sum, e) => sum + (e.status === 'active' ? e.salaryMonthly : 0), 0);
  const activeStaffCount = employees.filter(e => e.status === 'active').length;

  // Manejo de carga de fotografía con compresión en canvas
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
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
          const raw = event.target?.result as string;
          setAvatarUrl(raw);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Eliminar la foto asignada y volver a la silueta por defecto
  const handleRemovePhoto = () => {
    setAvatarUrl(DEFAULT_EMPLOYEE_AVATAR);
  };

  // Generador de contraseña aleatoria segura
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    setShowPassword(true);
  };

  // Auto-sugerir nombre de usuario basado en el nombre completo
  const handleNameChange = (val: string) => {
    setFullName(val);
    if (!editingEmployee && (!username || username === '')) {
      const clean = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, '.');
      setUsername(clean);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingEmployee(null);
    setFullName('');
    setDocumentId('');
    setEmail('');
    setPhone('');
    setAvatarUrl(DEFAULT_EMPLOYEE_AVATAR);
    setRole('receptionist');
    setUsername('');
    setPassword('');
    setPin('1234');
    setShowPassword(false);
    setJobTitle('');
    setShift('Matutino (06:00 - 14:00)');
    setSalaryMonthly(12000);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFullName(emp.fullName);
    setDocumentId(emp.documentId);
    setEmail(emp.email);
    setPhone(emp.phone);
    setAvatarUrl(emp.avatarUrl || DEFAULT_EMPLOYEE_AVATAR);
    setRole(emp.role);
    setUsername(emp.username || '');
    setPassword(emp.password?.startsWith('lg_hash$') ? '' : (emp.password || ''));
    setPin(emp.pin?.startsWith('lg_hash$') ? '' : (emp.pin || ''));
    setShowPassword(false);
    setJobTitle(emp.jobTitle);
    setShift(emp.shift);
    setSalaryMonthly(emp.salaryMonthly);
    setShowAddModal(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const finalUsername = username.trim().toLowerCase().replace(/\s+/g, '') || `${fullName.toLowerCase().replace(/\s+/g, '.')}`;

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, {
        fullName: fullName.trim(),
        documentId: documentId.trim() || editingEmployee.documentId,
        email: editingEmployee.email || `${finalUsername}@legendsgym.com`,
        phone: phone.trim() || editingEmployee.phone,
        avatarUrl: avatarUrl || DEFAULT_EMPLOYEE_AVATAR,
        role,
        username: finalUsername,
        password: password.trim() || editingEmployee.password || '123456',
        pin: pin.trim() || editingEmployee.pin || '1234',
        jobTitle: jobTitle.trim() || editingEmployee.jobTitle,
        shift,
        salaryMonthly: editingEmployee.salaryMonthly ?? 12000,
      });
    } else {
      addEmployee({
        fullName: fullName.trim(),
        documentId: documentId.trim() || `${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `${finalUsername}@legendsgym.com`,
        phone: phone.trim() || '+52 55 0000 0000',
        avatarUrl: avatarUrl || DEFAULT_EMPLOYEE_AVATAR,
        role,
        username: finalUsername,
        password: password.trim() || '123456',
        pin: pin.trim() || '1234',
        jobTitle: jobTitle.trim() || (role === 'admin' ? 'Administrador' : role === 'trainer' ? 'Entrenador de Piso' : 'Recepcionista'),
        shift,
        status: 'active',
        hireDate: new Date().toISOString().slice(0, 10),
        salaryMonthly: 12000,
      });
    }

    setShowAddModal(false);
    setEditingEmployee(null);
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
                Administración del staff operativo: credenciales de acceso, roles, turnos y sueldos.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm shadow-glow-gold transition-all"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>Nuevo Empleado</span>
        </button>
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
            placeholder="Buscar por nombre, usuario, puesto..."
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
                <th className="p-4">Rol & Usuario</th>
                <th className="p-4">Turno Asignado</th>
                <th className="p-4">Sueldo Base</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gym-border/40 text-sm">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gym-surface/40 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.avatarUrl || DEFAULT_EMPLOYEE_AVATAR}
                        alt={emp.fullName}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = DEFAULT_EMPLOYEE_AVATAR;
                        }}
                        className="w-10 h-10 rounded-full object-cover border border-gym-border shrink-0 bg-gym-surface"
                      />
                      <div>
                        <div 
                          onClick={() => handleOpenEditModal(emp)}
                          className="font-bold text-white text-xs hover:text-amber-400 cursor-pointer transition-colors"
                          title="Clic para editar"
                        >
                          {emp.fullName}
                        </div>
                        <div className="text-[11px] text-gym-muted font-mono">{emp.id} • {emp.phone}</div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="font-semibold text-white text-xs block">{emp.jobTitle}</span>
                    <span className="text-[10px] text-gym-muted">Desde {emp.hireDate}</span>
                  </td>

                  <td className="p-4">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border inline-block ${
                      emp.role === 'admin'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : emp.role === 'receptionist'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {emp.role === 'admin' ? 'Administrador' : emp.role === 'receptionist' ? 'Recepción' : 'Coach / Trainer'}
                    </span>
                    {emp.username ? (
                      <div className="text-[11px] text-gray-300 font-mono mt-1 flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-amber-400/80 shrink-0" />
                        <span className="text-amber-400 font-bold">@{emp.username}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-gym-muted italic mt-0.5">Sin usuario</div>
                    )}
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
                        updateEmployee(emp.id, { status: emp.status === 'active' ? 'inactive' : 'active' });
                      }}
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                        emp.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30'
                      }`}
                      title="Clic para cambiar estado"
                    >
                      {emp.status === 'active' ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditModal(emp)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/30 text-xs font-bold transition-all shadow-sm group cursor-pointer"
                        title="Editar empleado, rol y credenciales"
                      >
                        <Edit3 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar al empleado ${emp.fullName}?`)) {
                            deleteEmployee(emp.id);
                          }
                        }}
                        className="p-1.5 rounded-xl bg-gym-surface hover:bg-red-500/20 text-gym-muted hover:text-red-400 border border-gym-border/60 hover:border-red-500/30 transition-all cursor-pointer"
                        title="Eliminar empleado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar / Editar Empleado */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-lg overflow-hidden shadow-2xl relative my-6 max-h-[92vh] flex flex-col">
            
            {/* Header del Modal */}
            <div className="p-4 border-b border-gym-border flex items-center justify-between bg-gym-surface/40 shrink-0">
              <div className="flex items-center gap-2">
                {editingEmployee ? (
                  <Edit3 className="w-5 h-5 text-amber-400" />
                ) : (
                  <UserPlus className="w-5 h-5 text-amber-400" />
                )}
                <h3 className="font-bold text-base text-white">
                  {editingEmployee ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingEmployee(null);
                }} 
                className="text-gym-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario con scroll independiente */}
            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Sección de Foto de Perfil: Subir y Eliminar */}
              <div className="bg-gym-surface/50 p-4 rounded-xl border border-gym-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-white block">
                      Foto de Perfil del Empleado:
                    </label>
                    <p className="text-[11px] text-gym-muted">
                      Sube una fotografía desde tu equipo o elimínala.
                    </p>
                  </div>

                  {/* Botones de acción directa */}
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
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                      title="Subir imagen desde tu equipo"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Foto</span>
                    </button>

                    {avatarUrl && avatarUrl !== DEFAULT_EMPLOYEE_AVATAR && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                        title="Eliminar foto de perfil asignada"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar Foto</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Previsualización Activa */}
                <div className="flex items-center gap-3.5 bg-gym-card/60 p-3 rounded-xl border border-gym-border/80">
                  <div className="relative group shrink-0">
                    <img
                      src={avatarUrl || DEFAULT_EMPLOYEE_AVATAR}
                      alt="Foto del empleado"
                      className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-md ring-2 ring-amber-500/30 bg-gym-surface cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                      title="Clic para cambiar imagen"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[9px] font-bold"
                      title="Cambiar imagen"
                    >
                      <Camera className="w-4 h-4 mb-0.5" />
                      <span>Cambiar</span>
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">
                        {avatarUrl === DEFAULT_EMPLOYEE_AVATAR ? 'Silueta Predeterminada' : 'Foto Asignada'}
                      </span>
                      {avatarUrl !== DEFAULT_EMPLOYEE_AVATAR ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Foto activa
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                          Sin foto
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gym-muted mt-1 leading-snug">
                      {avatarUrl === DEFAULT_EMPLOYEE_AVATAR 
                        ? 'Haz clic en "Subir Foto" o sobre la silueta para cargar una fotografía desde tu equipo.'
                        : 'Fotografía activa para el perfil del colaborador en el sistema.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Datos Personales */}
              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej. Andrés Navarro López"
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* APARTADO: CREDENCIALES & ROL DE ACCESO AL SISTEMA */}
              <div className="bg-gym-surface/60 p-4 rounded-xl border border-amber-500/40 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-gym-border/60">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">
                        Acceso al Sistema & Credenciales
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-gym-muted">
                        Configura el rol que tendrá en el sistema, su usuario y contraseña.
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Seguridad
                  </span>
                </div>

                {/* 1. Selección de Rol que tendrá */}
                <div>
                  <label className="text-xs font-bold text-white block mb-1.5">
                    Rol que tendrá en el sistema: *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        id: 'receptionist' as UserRole,
                        title: 'Recepción / Caja',
                        badge: 'Recepción',
                        desc: 'Ventas POS, arqueo de caja y cobros',
                        borderSelected: 'border-blue-400 bg-blue-500/15 text-blue-300',
                        badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                      },
                      {
                        id: 'trainer' as UserRole,
                        title: 'Coach / Trainer',
                        badge: 'Coach',
                        desc: 'Expedientes, clases y entrenamientos',
                        borderSelected: 'border-emerald-400 bg-emerald-500/15 text-emerald-300',
                        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                      },
                      {
                        id: 'admin' as UserRole,
                        title: 'Administrador',
                        badge: 'Admin',
                        desc: 'Control total, nómina, finanzas y roles',
                        borderSelected: 'border-amber-400 bg-amber-500/15 text-amber-300',
                        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                      },
                    ].map((r) => {
                      const isSelected = role === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRole(r.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? `${r.borderSelected} ring-1 ring-amber-400/40 shadow-sm`
                              : 'border-gym-border bg-gym-surface/40 hover:border-gray-500 text-gym-muted'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${r.badgeBg}`}>
                              {r.badge}
                            </span>
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-amber-400 bg-amber-400' : 'border-gray-500'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                            </div>
                          </div>
                          <div className="font-bold text-xs text-white">{r.title}</div>
                          <div className="text-[10px] text-gym-muted mt-0.5 leading-tight">{r.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Campos de Usuario, Contraseña y PIN */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-gym-muted block mb-1">
                      Nombre de Usuario *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 text-xs font-mono font-bold">
                        @
                      </span>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        placeholder="andres.navarro"
                        className="w-full pl-8 pr-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <span className="text-[10px] text-gym-muted block mt-0.5">Identificador único</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gym-muted block">
                        Contraseña *
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
                        title="Generar contraseña automática"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Generar</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!editingEmployee}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={editingEmployee ? 'Vacío = mantener actual' : '••••••••'}
                        className="w-full pl-3 pr-10 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gym-muted hover:text-white transition-colors"
                        title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-gym-muted block mt-0.5">Clave de acceso</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gym-muted block mb-1">
                      PIN Rápido (4 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="1234"
                      className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted font-mono focus:outline-none focus:border-amber-400 tracking-widest text-center"
                    />
                    <span className="text-[10px] text-gym-muted block mt-0.5">Acceso rápido en caja</span>
                  </div>
                </div>
              </div>

              {/* Cargo y Puesto */}
              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">Puesto / Cargo Laboral</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Ej. Entrenador de Piso / Líder de Mostrador"
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Turno y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="text-xs font-semibold text-gym-muted block mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+52 55..."
                    className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gym-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingEmployee(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gym-surface text-xs font-semibold text-gym-muted hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold"
                >
                  {editingEmployee ? 'Guardar Cambios' : 'Guardar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
