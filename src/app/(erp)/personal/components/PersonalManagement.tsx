'use client';
import { calcCostoEmpleado, calcResumenNomina, diasVacacionesPorAntiguedad } from '@/lib/laboralMX';
import NominaTab from './NominaTab';
import { useBranch } from '@/hooks/useBranch';
import { useRolePermissions, invalidatePermissionsCache } from '@/hooks/useRolePermissions';
import { useAuth, AppRole, BUILTIN_ROLES } from '@/contexts/AuthContext';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';



import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, Users, Phone, Calendar, ChevronDown,
  UserCheck, UserX, DollarSign, TrendingUp, Clock, Shield, Key, Eye, EyeOff,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'Administrador' | 'Gerente' | 'Cajero' | 'Mesero' | 'Cocinero' | 'Ayudante de Cocina' | 'Repartidor';
type Status = 'activo' | 'inactivo';
type FilterStatus = 'Todos' | 'Activos' | 'Inactivos';
type SalaryFrequency = 'mensual' | 'quincenal' | 'semanal';

interface Employee {
  id: string;
  name: string;
  role: Role;
  phone: string;
  hireDate: string;
  status: Status;
  salary: number;
  salaryFrequency: SalaryFrequency;
  numeroEmpleado?: number;
  branchId: string;   // sucursal a la que pertenece
  // Campos legales
  rfc: string;
  nss: string;
  curp: string;
  fechaNacimiento: string;
  direccion: string;
  tipoContrato: string;
  fechaBaja: string;
  motivoBaja: string;
  // Pago
  banco: string;
  cuentaBancaria: string;
  clabe: string;
  // Emergencia
  contactoEmergenciaNombre: string;
  contactoEmergenciaTel: string;
  departamento: string;
}

const ROLES: Role[] = ['Administrador', 'Gerente', 'Cajero', 'Mesero', 'Cocinero', 'Ayudante de Cocina', 'Repartidor'];
const FILTER_STATUSES: FilterStatus[] = ['Todos', 'Activos', 'Inactivos'];
const SALARY_FREQUENCIES: { value: SalaryFrequency; label: string }[] = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'semanal', label: 'Semanal' },
];

const ROLE_COLORS: Record<Role, string> = {
  Administrador: 'bg-amber-900/40 text-amber-300',
  Gerente: 'bg-blue-900/40 text-blue-300',
  Cajero: 'bg-purple-900/40 text-purple-300',
  Mesero: 'bg-green-900/40 text-green-300',
  Cocinero: 'bg-red-900/40 text-red-300',
  'Ayudante de Cocina': 'bg-orange-900/40 text-orange-300',
  Repartidor: 'bg-teal-900/40 text-teal-300',
};

function formatDate(iso: string): string {
  if (!iso) return '—';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

const AVATAR_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
function avatarColor(id: string): string {
  const idx = id.charCodeAt(id.length - 1) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function toMonthlySalary(salary: number, freq: SalaryFrequency): number {
  if (freq === 'mensual') return salary;
  if (freq === 'quincenal') return salary * 2;
  if (freq === 'semanal') return salary * 4.33;
  return salary;
}


const DEPARTAMENTOS_DEFAULT = [
  'Cocina', 'Bar', 'Sala', 'Caja / POS', 'Administración',
  'Entrega / Delivery', 'Limpieza', 'Seguridad', 'Gerencia',
];

const emptyForm = (): Omit<Employee, 'id'> => ({
  name: '', role: 'Mesero', phone: '', hireDate: '', status: 'activo',
  salary: 0, salaryFrequency: 'mensual', branchId: '',
  rfc: '', nss: '', curp: '', fechaNacimiento: '', direccion: '',
  tipoContrato: 'planta', fechaBaja: '', motivoBaja: '',
  banco: '', cuentaBancaria: '', clabe: '',
  contactoEmergenciaNombre: '', contactoEmergenciaTel: '', departamento: '',
});

// ─── Shift Schedule Types ─────────────────────────────────────────────────────

type ShiftType = 'matutino' | 'vespertino' | 'nocturno' | 'descanso';

interface EmployeeShift {
  employeeId: string;
  day: string;
  shift: ShiftType;
}

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const SHIFT_CONFIG: Record<ShiftType, { label: string; color: string; bg: string }> = {
  matutino: { label: 'Matutino', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  vespertino: { label: 'Vespertino', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  nocturno: { label: 'Nocturno', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  descanso: { label: 'Descanso', color: 'rgba(255,255,255,0.45)', bg: 'rgba(107,114,128,0.1)' },
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <tr className="border-b animate-pulse" style={{ borderColor: '#243f72' }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.07)', width: i === 0 ? '160px' : '80px' }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <tr>
      <td colSpan={7} className="py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>
            <Users size={28} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <p className="text-base font-semibold text-white mb-1">No hay empleados registrados</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Agrega a tu equipo de trabajo para gestionar el personal del restaurante.</p>
          </div>
          <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
            <Plus size={16} />Agregar primer empleado
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PersonalManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('Todos');
  const [filterRole, setFilterRole] = useState<Role | 'Todos'>('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Employee, 'id'>>(emptyForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof Omit<Employee, 'id'>, string>>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'empleados' | 'turnos' | 'asistencia' | 'nomina' | 'acceso' | 'permisos'>('empleados');

  // ─── Estados para tab Acceso al sistema ───────────────────────────────────
  const [appUsers, setAppUsers] = useState<any[]>([]);
  const [loadingAppUsers, setLoadingAppUsers] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  // ─── Estados para tab Roles & Permisos ────────────────────────────────────
  const [allRolePerms, setAllRolePerms] = useState<Record<string, Record<string,boolean>>>({});
  const [savingPerms, setSavingPerms] = useState(false);
  const [selectedPermRole, setSelectedPermRole] = useState<string>('mesero');
  const [shifts, setShifts] = useState<EmployeeShift[]>([]);
  const [shiftSavedAt, setShiftSavedAt] = useState<number | null>(null);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [attendance, setAttendance] = useState<{id:string;employeeId:string;employeeName:string;date:string;checkIn:string|null;checkOut:string|null;hoursWorked:number|null}[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingShift, setSavingShift] = useState(false);

  const supabase = createClient();

  const { activeBranchId } = useBranch();
  const { appUser } = useAuth();

  // Sucursales disponibles
  const [branches, setBranches] = useState<{id:string;name:string}[]>([]);
  useEffect(() => {
    const tid = appUser?.tenantId ?? getTenantId();
    if (!tid) return;
    supabase.from('branches').select('id,name').eq('tenant_id', tid).eq('is_active', true).order('name')
      .then(({ data }) => setBranches(data ?? []));
  }, [appUser?.tenantId]);

  // ─── Funciones tab Acceso al sistema ─────────────────────────────────────
  const fetchAppUsers = useCallback(async () => {
    setLoadingAppUsers(true);
    const { data } = await supabase.from('app_users')
      .select('id, full_name, username, app_role, is_active, branch_id, employee_id')
      .eq('tenant_id', getTenantId())
      .neq('app_role', 'superadmin')
      .order('full_name');
    setAppUsers(data ?? []);
    setLoadingAppUsers(false);
  }, []);

  async function handleSavePin(userId: string) {
    if (newPin.length < 4) { toast.error('El PIN debe tener al menos 4 dígitos'); return; }
    setSavingPin(true);
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(newPin));
    const hashed = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    const { error } = await supabase.from('app_users').update({ pin: hashed }).eq('id', userId);
    setSavingPin(false);
    if (error) { toast.error('Error al guardar PIN'); return; }
    toast.success('PIN actualizado');
    setEditingUserId(null);
    setNewPin('');
  }

  async function handleToggleUserActive(userId: string, current: boolean) {
    await supabase.from('app_users').update({ is_active: !current }).eq('id', userId);
    await fetchAppUsers();
    toast.success(current ? 'Usuario desactivado' : 'Usuario activado');
  }

  async function handleChangeRole(userId: string, role: string) {
    await supabase.from('app_users').update({ app_role: role }).eq('id', userId);
    await fetchAppUsers();
    toast.success('Rol actualizado');
  }

  // ─── Funciones tab Roles & Permisos ───────────────────────────────────────
  const PAGE_KEYS = [
    { key: 'dashboard',    label: 'Dashboard' },
    { key: 'pos',          label: 'Punto de Venta' },
    { key: 'orders',       label: 'Gestión de Órdenes' },
    { key: 'cocina',       label: 'Cocina / KDS' },
    { key: 'corte',        label: 'Corte de Caja' },
    { key: 'inventario',   label: 'Inventario' },
    { key: 'menu',         label: 'Menú' },
    { key: 'personal',     label: 'Personal' },
    { key: 'reportes',     label: 'Reportes' },
    { key: 'gastos',       label: 'Gastos' },
    { key: 'lealtad',      label: 'Lealtad' },
    { key: 'proveedores',  label: 'Proveedores' },
    { key: 'sucursales',   label: 'Multi-Sucursal' },
    { key: 'configuracion',label: 'Configuración' },
  ];

  const fetchAllPerms = useCallback(async () => {
    const roles = ['gerente','cajero','mesero','cocinero','ayudante_cocina','repartidor'];
    const { data } = await supabase.from('role_permissions')
      .select('role, page_key, can_access')
      .eq('tenant_id', getTenantId())
      .in('role', roles);
    const map: Record<string,Record<string,boolean>> = {};
    roles.forEach(r => { map[r] = {}; });
    (data ?? []).forEach((row: any) => {
      if (!map[row.role]) map[row.role] = {};
      map[row.role][row.page_key] = row.can_access;
    });
    setAllRolePerms(map);
  }, []);

  async function handleSavePerms() {
    setSavingPerms(true);
    const rows = Object.entries(allRolePerms).flatMap(([role, perms]) =>
      Object.entries(perms).map(([page_key, can_access]) => ({
        tenant_id: getTenantId(), role, page_key, can_access,
      }))
    );
    await supabase.from('role_permissions').upsert(rows, { onConflict: 'tenant_id,role,page_key' });
    invalidatePermissionsCache();
    setSavingPerms(false);
    toast.success('Permisos guardados');
  }

  function togglePerm(role: string, key: string) {
    setAllRolePerms(prev => ({
      ...prev,
      [role]: { ...prev[role], [key]: !prev[role]?.[key] },
    }));
  }

  const ROLE_LABELS_ES: Record<string,string> = {
    admin:'Administrador', gerente:'Gerente', cajero:'Cajero',
    mesero:'Mesero', cocinero:'Cocinero', ayudante_cocina:'Ayudante de Cocina', repartidor:'Repartidor',
  };
  const APP_ROLES_SELECTABLES = ['gerente','cajero','mesero','cocinero','ayudante_cocina','repartidor'];

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (() => {
      const q = supabase.from('employees').select('*').eq('tenant_id', getTenantId());
      // Mostrar los de la sucursal activa Y los compartidos (branch_id NULL).
      // Un empleado compartido debe verse en todas las sucursales.
      return activeBranchId ? q.or(`branch_id.eq.${activeBranchId},branch_id.is.null`) : q;
    })().order('name');
    if (error) {
      toast.error('Error al cargar personal. Verifica tu conexión.');
      setLoading(false);
      return;
    }
    if (data) {
      setEmployees(data.map((e) => ({
        id: e.id,
        name: e.name,
        role: e.role as Role,
        phone: e.phone,
        hireDate: e.hire_date || '',
        status: e.status as Status,
        salary: Number(e.salary ?? 0),
        salaryFrequency: (e.salary_frequency ?? 'mensual') as SalaryFrequency,
        rfc: (e as any).rfc ?? '',
        nss: (e as any).nss ?? '',
        curp: (e as any).curp ?? '',
        fechaNacimiento: (e as any).fecha_nacimiento ?? '',
        direccion: (e as any).direccion ?? '',
        tipoContrato: (e as any).tipo_contrato ?? 'planta',
        fechaBaja: (e as any).fecha_baja ?? '',
        motivoBaja: (e as any).motivo_baja ?? '',
        banco: (e as any).banco ?? '',
        cuentaBancaria: (e as any).cuenta_bancaria ?? '',
        clabe: (e as any).clabe ?? '',
        contactoEmergenciaNombre: (e as any).contacto_emergencia_nombre ?? '',
        contactoEmergenciaTel: (e as any).contacto_emergencia_tel ?? '',
        departamento: (e as any).departamento ?? '',
        branchId: (e as any).branch_id ?? '',
      })));
    }
    setLoading(false);
  }, []);

  const fetchShifts = useCallback(async () => {
    setShiftsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_shifts')
        .select('employee_id, day, shift')
        .eq('tenant_id', getTenantId());
      if (error) throw error;
      setShifts((data || []).map((s: any) => ({
        employeeId: s.employee_id,
        day: s.day,
        shift: s.shift as ShiftType,
      })));
    } catch {
      // Table may not exist yet — silently ignore
    }
    setShiftsLoading(false);
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  useEffect(() => {
    if (activeTab === 'turnos') fetchShifts();
    if (activeTab === 'acceso') fetchAppUsers();
    if (activeTab === 'permisos') fetchAllPerms();
  }, [activeTab, fetchShifts, fetchAppUsers, fetchAllPerms]);

  const activeCount = useMemo(() => employees.filter((e) => e.status === 'activo').length, [employees]);
  const inactiveCount = useMemo(() => employees.filter((e) => e.status === 'inactivo').length, [employees]);

  // Payroll calculations
  const totalMonthlyPayroll = useMemo(() => {
    return employees
      .filter((e) => e.status === 'activo')
      .reduce((sum, e) => sum + toMonthlySalary(e.salary, e.salaryFrequency), 0);
  }, [employees]);

  const avgSalary = useMemo(() => {
    const active = employees.filter((e) => e.status === 'activo' && e.salary > 0);
    if (active.length === 0) return 0;
    return active.reduce((sum, e) => sum + toMonthlySalary(e.salary, e.salaryFrequency), 0) / active.length;
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) || emp.role.toLowerCase().includes(search.toLowerCase()) || emp.phone.includes(search);
      const matchesStatus = filterStatus === 'Todos' || (filterStatus === 'Activos' && emp.status === 'activo') || (filterStatus === 'Inactivos' && emp.status === 'inactivo');
      const matchesRole = filterRole === 'Todos' || emp.role === filterRole;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [employees, search, filterStatus, filterRole]);

  function openAdd() { setEditingId(null); setForm(emptyForm()); setFormErrors({}); setModalOpen(true); }
  function openEdit(emp: Employee) {
    setEditingId(emp.id);
    setForm({ name: emp.name, role: emp.role, phone: emp.phone, hireDate: emp.hireDate, status: emp.status, salary: emp.salary, salaryFrequency: emp.salaryFrequency, rfc: emp.rfc, nss: emp.nss, curp: emp.curp, fechaNacimiento: emp.fechaNacimiento, direccion: emp.direccion, tipoContrato: emp.tipoContrato, fechaBaja: emp.fechaBaja, motivoBaja: emp.motivoBaja, banco: emp.banco, cuentaBancaria: emp.cuentaBancaria, clabe: emp.clabe, contactoEmergenciaNombre: emp.contactoEmergenciaNombre, contactoEmergenciaTel: emp.contactoEmergenciaTel, departamento: emp.departamento, branchId: emp.branchId ?? '' });
    setFormErrors({});
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditingId(null); setForm(emptyForm()); setFormErrors({}); }

  function validate(): boolean {
    const errors: Partial<Record<keyof Omit<Employee, 'id'>, string>> = {};
    if (!form.name.trim()) errors.name = 'El nombre es requerido';
    if (!form.phone.trim()) errors.phone = 'El teléfono es requerido';
    if (!form.hireDate) errors.hireDate = 'La fecha de contratación es requerida';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const tid = getTenantId();

    if (editingId) {
      const { error } = await supabase.from('employees').update({
        name: form.name, role: form.role, phone: form.phone,
        rfc: form.rfc, nss: form.nss, curp: form.curp,
        fecha_nacimiento: form.fechaNacimiento || null,
        direccion: form.direccion,
        tipo_contrato: form.tipoContrato,
        fecha_baja: form.fechaBaja || null,
        motivo_baja: form.motivoBaja,
        banco: form.banco, cuenta_bancaria: form.cuentaBancaria, clabe: form.clabe,
        contacto_emergencia_nombre: form.contactoEmergenciaNombre,
        contacto_emergencia_tel: form.contactoEmergenciaTel,
        departamento: form.departamento,
        hire_date: form.hireDate || null, status: form.status,
        salary: form.salary, salary_frequency: form.salaryFrequency,
        branch_id: form.branchId || null,
        updated_at: new Date().toISOString(),
      }).eq('id', editingId);
      if (error) { toast.error('Error al actualizar empleado.'); return; }
    } else {
      // 1. Crear el empleado
      const { data: empData, error } = await supabase.from('employees').insert({
        tenant_id: tid,
        name: form.name, role: form.role, phone: form.phone,
        hire_date: form.hireDate || null, status: form.status,
        salary: form.salary, salary_frequency: form.salaryFrequency,
        branch_id: form.branchId || null,
      }).select('id').single();
      if (error) { toast.error('Error al agregar empleado.'); return; }

      // 2. Crear acceso al sistema automáticamente (PIN = 12345 por defecto)
      if (empData?.id) {
        const defaultPin = '12345';
        const encoder = new TextEncoder();
        const buf = await crypto.subtle.digest('SHA-256', encoder.encode(defaultPin + 'aldente_salt_2024'));
        const hashed = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');

        const username = form.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 20)
          + '_' + Math.floor(Math.random() * 1000);

        const roleToAppRole: Record<string, string> = {
          'Administrador': 'admin',
          'Gerente': 'gerente',
          'Cajero': 'cajero',
          'Mesero': 'mesero',
          'Cocinero': 'cocinero',
          'Ayudante de Cocina': 'ayudante_cocina',
          'Repartidor': 'repartidor',
        };

        await supabase.from('app_users').insert({
          tenant_id: tid,
          employee_id: empData.id,
          full_name: form.name,
          username,
          pin: hashed,
          app_role: roleToAppRole[form.role] ?? 'mesero',
          branch_id: form.branchId || null,
          is_active: true,
        });
        toast.success(`Empleado creado. PIN temporal: 12345 — cámbialo en Configuración → Usuarios`);
      }
    }
    closeModal();
    await fetchEmployees();
  }

  async function handleDelete() {
    if (!deleteId) return;
    // Borrar PRIMERO el acceso al sistema (app_user) — si no, queda huérfano
    // y el empleado conservaría su login aunque ya no esté en Personal.
    const { error: accessErr } = await supabase.from('app_users')
      .delete().eq('employee_id', deleteId).eq('tenant_id', getTenantId());
    if (accessErr) {
      toast.error('Error al eliminar el acceso del empleado.');
      return;
    }
    const { error } = await supabase.from('employees').delete().eq('id', deleteId);
    if (error) { toast.error('Error al eliminar empleado.'); return; }
    // Borrar también sus turnos asignados
    await supabase.from('employee_shifts').delete().eq('employee_id', deleteId);
    setDeleteId(null);
    toast.success('Empleado y su acceso eliminados.');
    await fetchEmployees();
  }

  async function toggleStatus(id: string) {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    const { error } = await supabase.from('employees').update({ status: emp.status === 'activo' ? 'inactivo' : 'activo', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Error al cambiar estado del empleado.'); return; }
    await fetchEmployees();
  }

  function updateForm<K extends keyof Omit<Employee, 'id'>>(key: K, value: Omit<Employee, 'id'>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  const fetchAttendance = useCallback(async (date: string) => {
    setAttendanceLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_attendance')
        .select('*, employees(name)')
        .eq('tenant_id', getTenantId())
        .eq('date', date)
        .order('check_in', { ascending: true });
      if (error) throw error;
      setAttendance((data || []).map((r: any) => ({
        id: r.id,
        employeeId: r.employee_id,
        employeeName: r.employees?.name ?? '—',
        date: r.date,
        checkIn: r.check_in,
        checkOut: r.check_out,
        hoursWorked: r.hours_worked,
      })));
    } catch { /* tabla puede no existir aún */ }
    finally { setAttendanceLoading(false); }
  }, [supabase]);

  useEffect(() => {
    if (activeTab === 'asistencia') fetchAttendance(selectedDate);
  }, [activeTab, selectedDate, fetchAttendance]);

  const handleCheckIn = async (employeeId: string) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0,5);
    const { error } = await supabase.from('employee_attendance').insert({
      employee_id: employeeId, date: dateStr, check_in: timeStr,
      tenant_id: getTenantId(),
    });
    if (error) { toast.error('Error al registrar entrada: ' + error.message); return; }
    toast.success('Entrada registrada');
    fetchAttendance(selectedDate);
  };

  const handleCheckOut = async (recordId: string, checkIn: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = timeStr.split(':').map(Number);
    let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    // Si el resultado es negativo, el turno cruzó medianoche (ej: entrada 22:00, salida 02:00)
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const hoursWorked = Math.round(totalMinutes / 60 * 100) / 100;
    const { error } = await supabase.from('employee_attendance')
      .update({ check_out: timeStr, hours_worked: hoursWorked, updated_at: new Date().toISOString() })
      .eq('id', recordId);
    if (error) { toast.error('Error al registrar salida: ' + error.message); return; }
    toast.success(`Salida registrada · ${hoursWorked}h trabajadas`);
    fetchAttendance(selectedDate);
  };

  async function handleShiftChange(employeeId: string, day: string, shift: ShiftType) {
    setSavingShift(true);
    try {
      const { error } = await supabase
        .from('employee_shifts')
        .upsert(
          { employee_id: employeeId, day, shift, updated_at: new Date().toISOString() },
          { onConflict: 'employee_id,day' }
        );
      if (error) throw error;
      setShifts((prev) => {
        const filtered = prev.filter((s) => !(s.employeeId === employeeId && s.day === day));
        return [...filtered, { employeeId, day, shift }];
      });
      // Confirmación visual: el cambio se guardó solo (no hace falta botón)
      setShiftSavedAt(Date.now());
    } catch {
      toast.error('Error al guardar turno. Si persiste, falta correr el fix de permisos en la base.');
    }
    setSavingShift(false);
  }

  function getShift(employeeId: string, day: string): ShiftType {
    return shifts.find((s) => s.employeeId === employeeId && s.day === day)?.shift ?? 'descanso';
  }

  function openShiftSchedule() {
    setActiveTab('turnos');
  }

  function openEmployeeList() {
    setActiveTab('empleados');
  }

  function getShiftColor(shift: ShiftType): string {
    return SHIFT_CONFIG[shift].color;
  }

  function getShiftBg(shift: ShiftType): string {
    return SHIFT_CONFIG[shift].bg;
  }

  function getShiftLabel(shift: ShiftType): string {
    return SHIFT_CONFIG[shift].label;
  }

  const deleteTarget = employees.find((e) => e.id === deleteId);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0f1e38' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#243f72', backgroundColor: '#0f1e38' }}>
        <div>
          <h1 className="text-xl font-bold text-white">Personal</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Gestión de empleados y recursos humanos</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
          <Plus size={16} />Agregar Empleado
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 pt-3 pb-0 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
        {[
          { key: 'empleados', label: '👥 Empleados' },
          { key: 'turnos', label: '📅 Turnos' },
          { key: 'asistencia', label: '✅ Asistencia' },
          { key: 'acceso', label: '🔐 Acceso al sistema' },
          { key: 'permisos', label: '🛡️ Roles & Permisos' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className="px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-150"
            style={{
              borderColor: activeTab === tab.key ? '#f59e0b' : 'transparent',
              color: activeTab === tab.key ? '#f59e0b' : 'rgba(255,255,255,0.5)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'empleados' ? (
        <>
          {/* Stats bar */}
          <div className="flex items-center gap-6 px-6 py-3 border-b flex-shrink-0 flex-wrap" style={{ borderColor: '#243f72', backgroundColor: '#132240' }}>
            <div className="flex items-center gap-2">
              <Users size={16} style={{ color: '#f59e0b' }} />
              <span className="text-sm text-white font-semibold">{loading ? '…' : employees.length}</span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>empleados totales</span>
            </div>
            {!loading && (
              <>
                <div className="flex items-center gap-2">
                  <UserCheck size={14} className="text-green-400" />
                  <span className="text-sm text-green-400 font-semibold">{activeCount}</span>
                  <span className="text-sm text-green-400">activos</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserX size={14} className="text-red-400" />
                  <span className="text-sm text-red-400 font-semibold">{inactiveCount}</span>
                  <span className="text-sm text-red-400">inactivos</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <DollarSign size={14} style={{ color: '#f59e0b' }} />
                  <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
                    Nómina mensual: ${totalMonthlyPayroll.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                  {avgSalary > 0 && (
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      · Promedio: ${avgSalary.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mes
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 px-6 py-3 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48 max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.35)' }} />
                <input type="text" placeholder="Buscar empleado..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: '#1a2f52', border: '1px solid #243f72', color: 'rgba(255,255,255,0.85)' }} />
              </div>
              <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                {FILTER_STATUSES.map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)} className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all" style={{ backgroundColor: filterStatus === s ? '#f59e0b' : 'transparent', color: filterStatus === s ? '#1B3A6B' : 'rgba(255,255,255,0.6)' }}>{s}</button>
                ))}
              </div>
              <div className="relative">
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as Role | 'Todos')} className="pl-3 pr-8 py-2 rounded-lg text-sm outline-none appearance-none" style={{ backgroundColor: '#1a2f52', border: '1px solid #243f72', color: 'rgba(255,255,255,0.85)' }}>
                  <option value="Todos" style={{ backgroundColor: '#162d55' }}>Todos los roles</option>
                  {ROLES.map((r) => <option key={r} value={r} style={{ backgroundColor: '#162d55' }}>{r}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.4)' }} />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {/* Grid de cards de empleados */}
            <div style={{ padding: '16px 20px' }}>
              {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ height: 140, borderRadius: 14, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />
                  ))}
                </div>
              ) : employees.length === 0 ? (
                <EmptyState onAdd={openAdd} />
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                  {search ? `Sin resultados para "${search}"` : 'No hay empleados con este filtro'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {filtered.map((emp) => (
                    <div key={emp.id} style={{ background: '#162d55', border: `1px solid ${emp.status === 'activo' ? '#243f72' : 'rgba(239,68,68,0.2)'}`, borderRadius: 14, padding: '14px 16px', opacity: emp.status === 'activo' ? 1 : 0.7, transition: 'all 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.border = `1px solid ${emp.status === 'activo' ? '#2d4f8a' : 'rgba(239,68,68,0.4)'}`)}
                      onMouseLeave={e => (e.currentTarget.style.border = `1px solid ${emp.status === 'activo' ? '#243f72' : 'rgba(239,68,68,0.2)'}`)}>
                      {/* Header de la card */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarColor(emp.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#1B3A6B', flexShrink: 0 }}>
                          {getInitials(emp.name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</span>
                            {emp.numeroEmpleado && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>#{emp.numeroEmpleado}</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_COLORS[emp.role]}`}>{emp.role}</span>
                            {emp.departamento && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{emp.departamento}</span>}
                          </div>
                        </div>
                        {/* Status toggle */}
                        <button onClick={() => toggleStatus(emp.id)}
                          style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: emp.status === 'activo' ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(239,68,68,0.3)', background: emp.status === 'activo' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', color: emp.status === 'activo' ? '#34d399' : '#f87171', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {emp.status === 'activo' ? <UserCheck size={11} /> : <UserX size={11} />}
                          {emp.status === 'activo' ? 'Activo' : 'Inactivo'}
                        </button>
                      </div>
                      {/* Datos secundarios */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                        {emp.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                            <Phone size={11} style={{ flexShrink: 0 }} /> {emp.phone}
                          </div>
                        )}
                        {emp.hireDate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                            <Calendar size={11} style={{ flexShrink: 0 }} /> Desde {formatDate(emp.hireDate)}
                          </div>
                        )}
                        {emp.salary > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                            <span style={{ color: '#34d399', fontWeight: 700, fontFamily: 'monospace' }}>${emp.salary.toLocaleString('es-MX')}</span>
                            <span style={{ color: 'rgba(255,255,255,0.35)' }}>{emp.salaryFrequency}</span>
                          </div>
                        )}
                      </div>
                      {/* Acciones */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <button onClick={() => openEdit(emp)}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12 }}>
                          <Pencil size={12} /> Editar
                        </button>
                        <button onClick={() => setDeleteId(emp.id)}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'none', color: '#f87171', cursor: 'pointer', fontSize: 12 }}>
                          <Trash2 size={12} /> Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Payroll summary footer */}
          {!loading && employees.length > 0 && (
            <div className="flex items-center gap-6 px-6 py-3 border-t flex-shrink-0 flex-wrap" style={{ borderColor: '#243f72', backgroundColor: '#132240' }}>
              <div className="flex items-center gap-2">
                <TrendingUp size={14} style={{ color: '#f59e0b' }} />
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Resumen de nómina (empleados activos):</span>
              </div>
              {ROLES.map((role) => {
                const roleEmps = employees.filter((e) => e.role === role && e.status === 'activo' && e.salary > 0);
                if (roleEmps.length === 0) return null;
                const total = roleEmps.reduce((s, e) => s + toMonthlySalary(e.salary, e.salaryFrequency), 0);
                return (
                  <div key={role} className="flex items-center gap-1.5">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{role}:</span>
                    <span className="text-xs font-mono font-semibold text-white">${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}/mes</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ─── Turnos Semanales Tab ─── */
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Turnos Semanales</h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Los cambios se guardan solos al elegir el turno.
                {savingShift && <span style={{ color: '#f59e0b', marginLeft: 6 }}>Guardando…</span>}
                {!savingShift && shiftSavedAt && <span style={{ color: '#4ade80', marginLeft: 6 }}>✓ Guardado</span>}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Legend */}
              {Object.entries(SHIFT_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {shiftsLoading || loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f59e0b', borderTopColor: 'transparent' }} />
            </div>
          ) : employees.filter((e) => e.status === 'activo').length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Clock size={32} style={{ color: 'rgba(255,255,255,0.2)' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No hay empleados activos para asignar turnos</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: '#243f72' }}>
              <table className="w-full">
                <thead style={{ backgroundColor: '#132240' }}>
                  <tr className="border-b" style={{ borderColor: '#243f72' }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide sticky left-0 z-10" style={{ color: 'rgba(255,255,255,0.45)', backgroundColor: '#132240', minWidth: '160px' }}>Empleado</th>
                    {DAYS_OF_WEEK.map((day) => (
                      <th key={day} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.45)', minWidth: '110px' }}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.filter((e) => e.status === 'activo').map((emp) => (
                    <tr key={emp.id} className="border-b" style={{ borderColor: '#1a2f52' }}>
                      <td className="px-4 py-3 sticky left-0 z-10" style={{ backgroundColor: '#0f1e38' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: avatarColor(emp.id), color: '#1B3A6B' }}>
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white leading-tight">{emp.name}</p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{emp.role}</p>
                          </div>
                        </div>
                      </td>
                      {DAYS_OF_WEEK.map((day) => {
                        const currentShift = getShift(emp.id, day);
                        const cfg = SHIFT_CONFIG[currentShift];
                        return (
                          <td key={day} className="px-2 py-2 text-center">
                            <div className="relative">
                              <select
                                value={currentShift}
                                onChange={(e) => handleShiftChange(emp.id, day, e.target.value as ShiftType)}
                                disabled={savingShift}
                                className="w-full px-2 py-1.5 rounded-lg text-xs font-semibold outline-none appearance-none text-center cursor-pointer transition-all"
                                style={{
                                  backgroundColor: cfg.bg,
                                  color: cfg.color,
                                  border: `1px solid ${cfg.color}40`,
                                }}
                              >
                                {Object.entries(SHIFT_CONFIG).map(([key, c]) => (
                                  <option key={key} value={key} style={{ backgroundColor: '#162d55', color: c.color }}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Asistencia Tab ─── */}
      {activeTab === 'nomina' && (
        <NominaTab employees={employees} />
      )}
      {activeTab === 'asistencia' && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header con selector de fecha */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
            <div>
              <h2 className="text-base font-bold text-white">Control de Asistencia</h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Registra entradas y salidas del personal
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: '#1a2f52', border: '1px solid #243f72', color: '#f1f5f9' }}
              />
            </div>
          </div>

          {/* KPIs rápidos */}
          {(() => {
            const present = attendance.filter(a => a.checkIn).length;
            const withCheckout = attendance.filter(a => a.checkOut).length;
            const avgHours = withCheckout > 0
              ? (attendance.filter(a => a.hoursWorked).reduce((s, a) => s + (a.hoursWorked ?? 0), 0) / withCheckout).toFixed(1)
              : '—';
            return (
              <div className="grid grid-cols-3 gap-4 px-6 py-4 flex-shrink-0">
                {[
                  { label: 'Presentes hoy', value: present, color: '#22c55e' },
                  { label: 'Ya salieron', value: withCheckout, color: '#3b82f6' },
                  { label: 'Hrs promedio', value: avgHours, color: '#f59e0b' },
                ].map(kpi => (
                  <div key={kpi.label} className="rounded-xl p-3 text-center"
                    style={{ backgroundColor: '#1a2f52', border: '1px solid #243f72' }}>
                    <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{kpi.label}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Lista de empleados activos con botones de checkin/checkout */}
          <div className="flex-1 overflow-auto px-6 pb-4">
            {attendanceLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f59e0b', borderTopColor: 'transparent' }} />
              </div>
            ) : (
              <div className="space-y-2">
                {employees.filter(e => e.status === 'activo').map(emp => {
                  const record = attendance.find(a => a.employeeId === emp.id);
                  const hasIn  = !!record?.checkIn;
                  const hasOut = !!record?.checkOut;
                  return (
                    <div key={emp.id} className="flex items-center gap-4 px-4 py-3 rounded-xl"
                      style={{
                        backgroundColor: hasOut ? 'rgba(59,130,246,0.08)' : hasIn ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${hasOut ? 'rgba(59,130,246,0.2)' : hasIn ? 'rgba(34,197,94,0.2)' : '#243f72'}`,
                      }}>
                      {/* Indicador */}
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${hasOut ? 'bg-blue-400' : hasIn ? 'bg-green-400' : 'bg-gray-600'}`} />
                      {/* Nombre y rol */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{emp.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{emp.role}</p>
                      </div>
                      {/* Horario registrado */}
                      <div className="text-right flex-shrink-0 mr-2">
                        {hasIn && (
                          <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            {record!.checkIn}
                            {hasOut && <> → {record!.checkOut}</>}
                          </p>
                        )}
                        {record?.hoursWorked != null && (
                          <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
                            {record.hoursWorked}h trabajadas
                          </p>
                        )}
                        {!hasIn && (
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin registro</p>
                        )}
                      </div>
                      {/* Botones */}
                      {!hasIn ? (
                        <button
                          onClick={() => handleCheckIn(emp.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                          <UserCheck size={13} /> Entrada
                        </button>
                      ) : !hasOut ? (
                        <button
                          onClick={() => handleCheckOut(record!.id, record!.checkIn!)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                          <UserX size={13} /> Salida
                        </button>
                      ) : (
                        <span className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                          ✓ Completo
                        </span>
                      )}
                    </div>
                  );
                })}
                {employees.filter(e => e.status === 'activo').length === 0 && (
                  <p className="text-center text-sm py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    No hay empleados activos registrados
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
              <h2 className="font-bold text-white text-lg">{editingId ? 'Editar empleado' : 'Agregar empleado'}</h2>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#162d55]/10" style={{ color: 'rgba(255,255,255,0.5)' }}><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Nombre completo <span className="text-red-400">*</span></label>
                <input type="text" value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Ej. Carlos Mendoza" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: formErrors.name ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Rol</label>
                  <div className="relative">
                    <select value={form.role} onChange={(e) => updateForm('role', e.target.value as Role)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}>
                      {ROLES.map((r) => <option key={r} value={r} style={{ backgroundColor: '#162d55' }}>{r}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.4)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Estado</label>
                  <div className="relative">
                    <select value={form.status} onChange={(e) => updateForm('status', e.target.value as Status)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}>
                      <option value="activo" style={{ backgroundColor: '#162d55' }}>Activo</option>
                      <option value="inactivo" style={{ backgroundColor: '#162d55' }}>Inactivo</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.4)' }} />
                  </div>
                </div>
              </div>

              {/* Sucursal — solo si hay más de una */}
              {branches.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Sucursal asignada
                  </label>
                  <div className="relative">
                    <select value={form.branchId} onChange={(e) => updateForm('branchId', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}>
                      <option value="" style={{ backgroundColor: '#162d55' }}>— Todas las sucursales (Administrador) —</option>
                      {branches.map(b => <option key={b.id} value={b.id} style={{ backgroundColor: '#162d55' }}>{b.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.4)' }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    El empleado solo verá datos de esta sucursal al iniciar sesión. Los administradores pueden ver todas.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Teléfono <span className="text-red-400">*</span></label>
                <input type="text" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} placeholder="55 1234 5678" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: formErrors.phone ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                {formErrors.phone && <p className="text-xs text-red-400 mt-1">{formErrors.phone}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Fecha de contratación <span className="text-red-400">*</span></label>
                <input type="date" value={form.hireDate} onChange={(e) => updateForm('hireDate', e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: formErrors.hireDate ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.12)', color: 'white', colorScheme: 'dark' }} />
                {formErrors.hireDate && <p className="text-xs text-red-400 mt-1">{formErrors.hireDate}</p>}
              </div>
              {/* Salary section */}
              <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign size={14} style={{ color: '#f59e0b' }} />
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#f59e0b' }}>Salario</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Monto (MXN)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>$</span>
                      <input type="number" min={0} step={100} value={form.salary || ''} onChange={(e) => updateForm('salary', parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Frecuencia de pago</label>
                    <div className="relative">
                      <select value={form.salaryFrequency} onChange={(e) => updateForm('salaryFrequency', e.target.value as SalaryFrequency)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}>
                        {SALARY_FREQUENCIES.map((f) => <option key={f.value} value={f.value} style={{ backgroundColor: '#162d55' }}>{f.label}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.4)' }} />
                    </div>
                  </div>
                </div>
                {form.salary > 0 && (
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Equivalente mensual: <span className="font-semibold" style={{ color: '#34d399' }}>
                      ${toMonthlySalary(form.salary, form.salaryFrequency).toLocaleString('es-MX', { minimumFractionDigits: 0 })}/mes
                    </span>
                  </p>
                )}
              </div>
              {/* Datos legales */}
              <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#60a5fa' }}>📋 Datos legales y fiscales</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'RFC', key: 'rfc', placeholder: 'GOCA850101ABC' },
                    { label: 'NSS (Núm. Seguridad Social)', key: 'nss', placeholder: '12345678901' },
                    { label: 'CURP', key: 'curp', placeholder: 'GOCA850101HMCRCR01' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{f.label}</label>
                      <input className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" placeholder={f.placeholder}
                        value={(form as any)[f.key]} onChange={e => updateForm(f.key as any, e.target.value.toUpperCase())}
                        style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                    </div>
                  ))}
                  {/* Departamento como lista desplegable */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Departamento / Área</label>
                    <select className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      value={form.departamento}
                      onChange={e => updateForm('departamento', e.target.value)}
                      style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}>
                      <option value="" style={{ backgroundColor: '#162d55' }}>Sin departamento</option>
                      {DEPARTAMENTOS_DEFAULT.map(d => (
                        <option key={d} value={d} style={{ backgroundColor: '#162d55' }}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Fecha de nacimiento</label>
                    <input type="date" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" value={form.fechaNacimiento}
                      onChange={e => updateForm('fechaNacimiento', e.target.value)}
                      style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Tipo de contrato</label>
                    <select className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" value={form.tipoContrato}
                      onChange={e => updateForm('tipoContrato', e.target.value)}
                      style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}>
                      {[['planta','Planta (indefinido)'],['temporal','Temporal'],['tiempo_parcial','Tiempo parcial'],['confianza','Confianza'],['honorarios','Honorarios / Freelance'],['otro','Otro']].map(([v,l]) =>
                        <option key={v} value={v} style={{ backgroundColor: '#162d55' }}>{l}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Dirección</label>
                    <input className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" placeholder="Calle, colonia, ciudad"
                      value={form.direccion} onChange={e => updateForm('direccion', e.target.value)}
                      style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                  </div>
                </div>
              </div>

              {/* Datos bancarios */}
              <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#34d399' }}>🏦 Datos bancarios (pago de nómina)</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Banco', key: 'banco', placeholder: 'BBVA, Santander, HSBC...' },
                    { label: 'Número de cuenta', key: 'cuentaBancaria', placeholder: '1234567890' },
                    { label: 'CLABE interbancaria', key: 'clabe', placeholder: '012345678901234567' },
                  ].map(f => (
                    <div key={f.key} className={f.key === 'clabe' ? 'col-span-2' : ''}>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{f.label}</label>
                      <input className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" placeholder={f.placeholder}
                        value={(form as any)[f.key]} onChange={e => updateForm(f.key as any, e.target.value)}
                        style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Contacto de emergencia */}
              <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#f87171' }}>🆘 Contacto de emergencia</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Nombre</label>
                    <input className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" placeholder="Nombre del familiar"
                      value={form.contactoEmergenciaNombre} onChange={e => updateForm('contactoEmergenciaNombre', e.target.value)}
                      style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Teléfono</label>
                    <input className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" placeholder="55 1234 5678" type="tel"
                      value={form.contactoEmergenciaTel} onChange={e => updateForm('contactoEmergenciaTel', e.target.value)}
                      style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                  </div>
                </div>
              </div>

            </div>
            <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: '#243f72' }}>
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
                {editingId ? 'Guardar cambios' : 'Agregar empleado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Eliminar empleado</h3>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>
              ¿Estás seguro de que deseas eliminar a <span className="font-semibold text-white">"{deleteTarget.name}"</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Acceso al sistema ─────────────────────────────────────────── */}
      {activeTab === 'acceso' && (
        <div className="flex flex-col h-full overflow-y-auto p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-1">Acceso al sistema</h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
              Gestiona PINs y roles de acceso de cada empleado. El PIN se usa para entrar al sistema desde la pantalla de login.
            </p>
          </div>
          {loadingAppUsers ? (
            <div className="flex justify-center py-12">
              <div style={{ width:28, height:28, borderRadius:'50%', border:'2px solid rgba(201,150,58,0.2)', borderTopColor:'#c9963a', animation:'spin .7s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {appUsers.map(u => (
                <div key={u.id} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'14px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    {/* Avatar */}
                    <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(201,150,58,0.15)', border:'1.5px solid rgba(201,150,58,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'#c9963a', flexShrink:0 }}>
                      {u.full_name.split(' ').slice(0,2).map((n:string)=>n[0]).join('').toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:'#f1f5f9' }}>{u.full_name}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:2 }}>@{u.username}</div>
                    </div>
                    {/* Rol selector */}
                    <select value={u.app_role} onChange={e => handleChangeRole(u.id, e.target.value)}
                      style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#f1f5f9', fontSize:12, cursor:'pointer' }}>
                      {APP_ROLES_SELECTABLES.map(r => (
                        <option key={r} value={r} style={{ background:'#1a2535' }}>{ROLE_LABELS_ES[r]}</option>
                      ))}
                    </select>
                    {/* Activo/Inactivo */}
                    <button onClick={() => handleToggleUserActive(u.id, u.is_active)}
                      style={{ padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:600,
                        background: u.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: u.is_active ? '#22c55e' : '#ef4444' }}>
                      {u.is_active ? '● Activo' : '○ Inactivo'}
                    </button>
                    {/* Editar PIN */}
                    <button onClick={() => { setEditingUserId(editingUserId === u.id ? null : u.id); setNewPin(''); setShowPin(false); }}
                      style={{ padding:'6px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.7)', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                      <Key size={12}/> PIN
                    </button>
                  </div>
                  {/* Formulario de PIN */}
                  {editingUserId === u.id && (
                    <div style={{ marginTop:12, padding:'12px', background:'rgba(255,255,255,0.04)', borderRadius:10, display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ position:'relative', flex:1 }}>
                        <input
                          type={showPin ? 'text' : 'password'}
                          value={newPin}
                          onChange={e => setNewPin(e.target.value.replace(/\D/g,''))}
                          maxLength={8}
                          placeholder="Nuevo PIN (4-8 dígitos)"
                          style={{ width:'100%', padding:'8px 36px 8px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.07)', color:'#f1f5f9', fontSize:13, boxSizing:'border-box' }}
                        />
                        <button onClick={() => setShowPin(p=>!p)} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', padding:0 }}>
                          {showPin ? <EyeOff size={14}/> : <Eye size={14}/>}
                        </button>
                      </div>
                      <button onClick={() => handleSavePin(u.id)} disabled={savingPin || newPin.length < 4}
                        style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'#c9963a', color:'#000', fontSize:12, fontWeight:700, cursor:'pointer', opacity: newPin.length < 4 ? 0.5 : 1 }}>
                        {savingPin ? '...' : 'Guardar'}
                      </button>
                      <button onClick={() => setEditingUserId(null)} style={{ padding:'8px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.5)', fontSize:12, cursor:'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {appUsers.length === 0 && (
                <div style={{ textAlign:'center', padding:'48px 0', color:'rgba(255,255,255,0.3)', fontSize:13 }}>
                  No hay usuarios de acceso configurados. Crea empleados en el tab Empleados y se generarán automáticamente.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Roles & Permisos ───────────────────────────────────────────── */}
      {activeTab === 'permisos' && (
        <div className="flex flex-col h-full overflow-y-auto p-6">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Roles & Permisos</h2>
              <p style={{ color:'rgba(255,255,255,0.45)', fontSize:13 }}>
                Define qué secciones puede ver cada rol. El Administrador siempre tiene acceso total.
              </p>
            </div>
            <button onClick={handleSavePerms} disabled={savingPerms}
              style={{ padding:'10px 20px', borderRadius:10, border:'none', background:'#c9963a', color:'#000', fontSize:13, fontWeight:700, cursor:'pointer', opacity: savingPerms ? 0.7 : 1 }}>
              {savingPerms ? 'Guardando...' : '💾 Guardar permisos'}
            </button>
          </div>

          {/* Selector de rol */}
          <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
            {APP_ROLES_SELECTABLES.map(role => (
              <button key={role} onClick={() => setSelectedPermRole(role)}
                style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${selectedPermRole === role ? 'rgba(201,150,58,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  background: selectedPermRole === role ? 'rgba(201,150,58,0.12)' : 'rgba(255,255,255,0.04)',
                  color: selectedPermRole === role ? '#c9963a' : 'rgba(255,255,255,0.6)', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                {ROLE_LABELS_ES[role]}
              </button>
            ))}
          </div>

          {/* Grid de permisos */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:8 }}>
            {PAGE_KEYS.map(page => {
              const hasAccess = allRolePerms[selectedPermRole]?.[page.key] ?? false;
              return (
                <button key={page.key} onClick={() => togglePerm(selectedPermRole, page.key)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:12,
                    border:`1px solid ${hasAccess ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.07)'}`,
                    background: hasAccess ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)', cursor:'pointer', textAlign:'left' }}>
                  <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${hasAccess ? '#22c55e' : 'rgba(255,255,255,0.2)'}`,
                    background: hasAccess ? '#22c55e' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {hasAccess && <span style={{ color:'#000', fontSize:11, fontWeight:900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:13, fontWeight:500, color: hasAccess ? '#f1f5f9' : 'rgba(255,255,255,0.5)' }}>{page.label}</span>
                </button>
              );
            })}
          </div>
          <p style={{ marginTop:16, fontSize:11, color:'rgba(255,255,255,0.3)' }}>
            * Los cambios se aplican en la siguiente sesión del empleado.
          </p>
        </div>
      )}

    </div>
  );
}