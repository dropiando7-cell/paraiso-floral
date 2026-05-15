'use client';

import React, { useState } from 'react';
import { User, Organization, Role, RoleTemplate } from '@prisma/client';
import { createUser, deleteUser, editUser, createRoleTemplate, updateRoleTemplate, deleteRoleTemplate, sendManualWelcomeEmail } from './actions';
import { Plus, Trash2, Pencil, ShieldAlert, Check, X, Building2, Shield, User as UserIcon, Tag, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Mail, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

type UserWithOrg = User & { organization: Organization };

interface UserManagementProps {
    initialUsers: UserWithOrg[];
    organizations: Organization[];
    roleTemplates: RoleTemplate[];
    currentUserId: string;
    currentUserRole: string;
}

export function UserManagement({ initialUsers, organizations, roleTemplates, currentUserId, currentUserRole }: UserManagementProps) {
    const router = useRouter();
    const [users, setUsers] = useState<UserWithOrg[]>(initialUsers);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Pagination & Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Form State for User
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [authType, setAuthType] = useState<'CLASSIC'>('CLASSIC');
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>('USER');
    const [customRoleName, setCustomRoleName] = useState<string | null>(null);
    const [organizationId, setOrganizationId] = useState(organizations[0]?.id || '');
    const [accessibleModules, setAccessibleModules] = useState<string[]>([]);

    // Form State for Role Template
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleBase, setNewRoleBase] = useState<Role>('USER');
    const [newRoleModules, setNewRoleModules] = useState<string[]>(['/']);

    const roles = Object.keys({
        SUPER_ADMIN: 'SUPER_ADMIN',
        ORG_ADMIN: 'ORG_ADMIN',
        USER: 'USER',
        CHECKIN_KIDS: 'CHECKIN_KIDS',
        CHECKIN_KIDS_ADMIN: 'CHECKIN_KIDS_ADMIN',
        MEDICAL_STAFF: 'MEDICAL_STAFF',
        EXECUTIVE_ASSISTANT: 'EXECUTIVE_ASSISTANT',
        INVENTARIO_EDITOR: 'INVENTARIO_EDITOR',
        RECEPCION: 'RECEPCION',
        TECNICO: 'TECNICO',
        GERENTE: 'GERENTE'
    }) as Role[];

    const roleTextMapping: Record<Role, string> = {
        SUPER_ADMIN: 'SUPER_ADMIN',
        ORG_ADMIN: 'ORG_ADMIN',
        USER: 'USER',
        CHECKIN_KIDS: 'CHECKIN_KIDS',
        CHECKIN_KIDS_ADMIN: 'CHECKIN_KIDS_ADMIN',
        MEDICAL_STAFF: 'MEDICAL_STAFF',
        EXECUTIVE_ASSISTANT: 'EXECUTIVE_ASSISTANT',
        INVENTARIO_EDITOR: 'Editor de Inventario',
        RECEPCION: 'Soporte - Recepción',
        TECNICO: 'Soporte - Técnico',
        GERENTE: 'Soporte - Gerencia'
    } as Record<Role, string>;

    const availableModules = [
        { id: '/', label: 'Portal Bioelectrónica' },
        { id: '/inventario-ia', label: 'Inventario IA' },
        { id: '/rentas', label: 'Rentas de Equipos' },
        { id: '/graficas', label: 'Gráficas e Informes' },
        { id: '/inventario', label: 'Control de Inventario' },
        { id: '/inventario/modelos', label: 'Catálogo de Modelos' },
        { id: '/inventario/entradas', label: 'Entradas / Compras' },
        { id: '/inventario/salidas', label: 'Salidas / Descargas' },
        { id: '/inventario/kardex', label: 'Kardex de Movimientos' },
        { id: '/precios', label: 'Gestor de Precios' },
        { id: '/admin/areas', label: 'Ubicaciones y Sucursales' },
        { id: '/inventario/historico', label: 'Inventario Histórico (Odoo)' },
        { id: '/contactos', label: 'Directorio de Contactos' },
        { id: '/soporte', label: 'Soporte y Reparaciones' },
        { id: '/cotizaciones', label: 'Cotizaciones' },
        { id: '/facturas', label: 'Facturación' },
        { id: '/caja-chica', label: 'Caja Chica' }
    ];


    const handleRoleChange = (selectedValue: string) => {
        // Check if it's a template
        const template = roleTemplates.find(t => t.name === selectedValue);
        if (template) {
            setRole(template.baseRole);
            setCustomRoleName(template.name);
            setAccessibleModules(template.accessibleModules);
            return;
        }

        // It's a base role
        const newRole = selectedValue as Role;
        setRole(newRole);
        setCustomRoleName(null);
        // Auto-select modules based on role (or if restricted by admin)
        if (currentUserRole === 'CHECKIN_KIDS_ADMIN') {
            setAccessibleModules(['/checkin']);
            return;
        }

        if (newRole === 'SUPER_ADMIN') {
            setAccessibleModules(availableModules.map(m => m.id));
        } else if (newRole === 'CHECKIN_KIDS') {
            setAccessibleModules(['/checkin']);
        } else if (newRole === 'MEDICAL_STAFF') {
            setAccessibleModules(['/', '/medico']);
        } else if (newRole === 'INVENTARIO_EDITOR') {
            setAccessibleModules(['/', '/inventario/historico']);
        } else if (newRole === 'RECEPCION' || newRole === 'TECNICO' || newRole === 'GERENTE') {
            setAccessibleModules(['/', '/soporte', '/inventario']);
        } else {
            setAccessibleModules(['/']);
        }
    };

    const toggleModule = (moduleId: string, isForTemplate = false) => {
        if (isForTemplate) {
            setNewRoleModules(prev =>
                prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
            );
        } else {
            setAccessibleModules(prev =>
                prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
            );
        }
    };

    const handleResendEmail = async (userId: string) => {
        setSendingEmailId(userId);
        setError(null);
        try {
            const result = await sendManualWelcomeEmail(userId);
            if (result.success) {
                alert(result.message);
            } else {
                setError(result.error || 'Error desconocido');
            }
        } catch (err) {
            setError('Error inesperado al enviar correo.');
        } finally {
            setSendingEmailId(null);
        }
    };

    const handleOpenCreate = () => {
        setEditingUserId(null);
        setAuthType('CLASSIC');
        setEmail('');
        setFirstName('');
        setLastName('');
        setPassword('');

        if (currentUserRole === 'CHECKIN_KIDS_ADMIN') {
            setRole('CHECKIN_KIDS');
            setAccessibleModules(['/checkin']);
        } else {
            setRole('USER');
            setAccessibleModules(['/']);
        }

        setCustomRoleName(null);
        setOrganizationId(organizations[0]?.id || '');
        setError(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (user: UserWithOrg) => {
        setEditingUserId(user.id);
        setAuthType('CLASSIC'); // Edit doesn't allow changing auth type or password easily here
        setEmail(user.email);
        setPassword('');
        setRole(user.role);
        setCustomRoleName(user.customRoleName || null);
        setOrganizationId(user.organizationId);
        setAccessibleModules(user.accessibleModules || []);
        setError(null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (editingUserId) {
            const res = await editUser(editingUserId, { role, customRoleName, organizationId, accessibleModules });
            if (!res.success) {
                setError(res.error || 'Ocurrió un error al editar');
                setLoading(false);
                return;
            }
        } else {
            const res = await createUser({
                email,
                firstName: authType === 'CLASSIC' ? firstName : undefined,
                lastName: authType === 'CLASSIC' ? lastName : undefined,
                password: authType === 'CLASSIC' ? password : undefined,
                role,
                customRoleName,
                organizationId,
                accessibleModules
            });
            if (!res.success) {
                setError(res.error || 'Ocurrió un error al crear');
                setLoading(false);
                return;
            }
        }

        // Refresh data via Server Component to get the nested Org easily, or manually append
        setIsModalOpen(false);
        setLoading(false);
        router.refresh();
    };

    const handleOpenCreateRole = () => {
        setEditingRoleId(null);
        setNewRoleName('');
        setNewRoleBase('USER');
        setNewRoleModules(['/']);
        setError(null);
        setIsRoleModalOpen(true);
    };

    const handleOpenEditRole = (template: RoleTemplate) => {
        setEditingRoleId(template.id);
        setNewRoleName(template.name);
        setNewRoleBase(template.baseRole);
        setNewRoleModules(template.accessibleModules);
        setError(null);
        setIsRoleModalOpen(true);
    };

    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (editingRoleId) {
            const res = await updateRoleTemplate(editingRoleId, {
                name: newRoleName,
                baseRole: newRoleBase,
                organizationId,
                accessibleModules: newRoleModules
            });

            if (!res.success) {
                setError(res.error || 'Error al actualizar la plantilla de rol.');
                setLoading(false);
                return;
            }
        } else {
            const res = await createRoleTemplate({
                name: newRoleName,
                baseRole: newRoleBase,
                organizationId,
                accessibleModules: newRoleModules
            });

            if (!res.success) {
                setError(res.error || 'Error al crear la plantilla de rol.');
                setLoading(false);
                return;
            }
        }

        setIsRoleModalOpen(false);
        setLoading(false);
        router.refresh();
    };

    const handleDeleteTemplate = async (id: string, roleName: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el Rol Personalizado "${roleName}"?\nLos usuarios que lo tengan volverán a su rol base.`)) return;

        const res = await deleteRoleTemplate(id, organizationId);
        if (!res.success) {
            alert(res.error || 'Error al eliminar el rol');
            return;
        }
        router.refresh();
    };

    const handleDelete = async (id: string, userEmail: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar el usuario ${userEmail}?`)) return;

        // Optimistic UI could be done here, but let's keep it simple
        const res = await deleteUser(id);
        if (!res.success) {
            alert(res.error || 'Error al eliminar');
            return;
        }
        router.refresh();
    };

    // --- Search & Pagination Logic ---
    const filteredUsers = initialUsers.filter(u => {
        const query = searchQuery.toLowerCase();
        const customRoleRaw = u.customRoleName || '';
        return (
            u.email.toLowerCase().includes(query) ||
            u.role.toLowerCase().includes(query) ||
            customRoleRaw.toLowerCase().includes(query) ||
            u.organization.name.toLowerCase().includes(query)
        );
    });

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-blue-600" />
                        Gestión de Usuarios Autorizados
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Solo los correos aquí registrados podrán ingresar a Sistemas Elim.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    {currentUserRole === 'SUPER_ADMIN' && (
                        <button
                            onClick={handleOpenCreateRole}
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm"
                        >
                            <Tag className="w-4 h-4" />
                            <span className="hidden sm:inline">Crear Rol</span>
                        </button>
                    )}
                    <button
                        onClick={handleOpenCreate}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Añadir Usuario</span>
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-white">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por correo, rol u organización..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1); // Reset page on new search
                        }}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Correo Electrónico</th>
                            <th className="px-6 py-4">Rol en el Sistema</th>
                            <th className="px-6 py-4">Organización</th>
                            <th className="px-6 py-4">Fecha de Alta</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedUsers.length > 0 ? (
                            paginatedUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-700">
                                        {u.email}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium 
                    ${u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                                u.role === 'CHECKIN_KIDS' || u.customRoleName ? 'bg-pink-100 text-pink-700 border border-pink-200' :
                                                    u.role === 'MEDICAL_STAFF' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                                                        'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                            <Shield className="w-3 h-3" />
                                            {u.customRoleName || roleTextMapping[u.role] || u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-slate-400" />
                                        {u.organization?.name}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleResendEmail(u.id)}
                                                disabled={sendingEmailId === u.id}
                                                className="text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                                title="Reenviar correo de bienvenida manual"
                                            >
                                                {sendingEmailId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleOpenEdit(u)}
                                                className="text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50"
                                                title="Editar usuario"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(u.id, u.email)}
                                                disabled={u.id === currentUserId}
                                                className="text-slate-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                                title={u.id === currentUserId ? "No puedes eliminarte a ti mismo" : "Eliminar usuario"}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                                    No se encontraron usuarios que coincidan con la búsqueda.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between text-sm gap-4">
                    <span className="text-slate-500">
                        Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredUsers.length)} de {filteredUsers.length} registros
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent"
                            title="Primera página"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent"
                            title="Página anterior"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <span className="px-3 py-1 bg-slate-50 rounded-lg font-medium text-slate-700">
                            {currentPage} de {totalPages}
                        </span>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent"
                            title="Página siguiente"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent"
                            title="Última página"
                        >
                            <ChevronsRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {currentUserRole === 'SUPER_ADMIN' && roleTemplates.length > 0 && (
                <div className="mt-8">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                            <Tag className="w-5 h-5 text-indigo-600" />
                            Roles Personalizados
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Plantillas de roles que has creado para asignar permisos específicos.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Nombre del Rol</th>
                                    <th className="px-6 py-4">Rol Base</th>
                                    <th className="px-6 py-4">Módulos Permitidos</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {roleTemplates.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            {t.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                <Shield className="w-3 h-3" />
                                                {roleTextMapping[t.baseRole] || t.baseRole}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {t.accessibleModules.length} módulos
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenEditRole(t)}
                                                    className="text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-indigo-50"
                                                    title="Editar rol"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTemplate(t.id, t.name)}
                                                    className="text-slate-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
                                                    title="Eliminar rol permanentemente"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 shrink-0">
                            <h3 className="font-semibold text-slate-800">
                                {editingUserId ? 'Editar Usuario' : 'Añadir Nuevo Usuario'}
                            </h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
                            {error && (
                                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex gap-3 items-start">
                                    <ShieldAlert className="w-5 h-5 shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Correo Electrónico
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        disabled={!!editingUserId}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="ej. usuario@dominio.com"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                    <p className="text-xs text-slate-500 mt-1.5">
                                        {editingUserId ? "El correo no se puede cambiar ya que está vinculado al usuario." :
                                            "El usuario iniciará sesión con Correo y Contraseña."}
                                    </p>
                                </div>

                                {!editingUserId && authType === 'CLASSIC' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Contraseña Inicial
                                        </label>
                                        <input
                                            type="text"
                                            required={authType === 'CLASSIC'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="ej. Segura2026*"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                        />
                                        <div className="text-xs text-slate-500 mt-1">
                                            Asegúrate de compartir esta contraseña con el usuario. Mínimo 6 caracteres.
                                        </div>
                                    </div>
                                )}

                                {!editingUserId && authType === 'CLASSIC' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                                            <input
                                                type="text"
                                                disabled={!!editingUserId}
                                                value={firstName}
                                                onChange={e => setFirstName(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow bg-white disabled:bg-slate-50 disabled:text-slate-500"
                                                placeholder="Ej. Juan"
                                                required={!editingUserId}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
                                            <input
                                                type="text"
                                                disabled={!!editingUserId}
                                                value={lastName}
                                                onChange={e => setLastName(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow bg-white disabled:bg-slate-50 disabled:text-slate-500"
                                                placeholder="Ej. Pérez"
                                                required={!editingUserId}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Rol en el Sistema
                                    </label>
                                    <select
                                        value={customRoleName || role}
                                        onChange={(e) => handleRoleChange(e.target.value)}
                                        disabled={currentUserRole === 'CHECKIN_KIDS_ADMIN'}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                                    >
                                        <optgroup label="Roles Base">
                                            {currentUserRole === 'CHECKIN_KIDS_ADMIN' ? (
                                                <option value="CHECKIN_KIDS">
                                                    {roleTextMapping['CHECKIN_KIDS']}
                                                </option>
                                            ) : (
                                                roles.map((r) => (
                                                    <option key={r} value={r}>
                                                        {roleTextMapping[r] || r}
                                                    </option>
                                                ))
                                            )}
                                        </optgroup>
                                        {currentUserRole === 'SUPER_ADMIN' && roleTemplates.length > 0 && (
                                            <optgroup label="Roles Personalizados">
                                                {roleTemplates.map((t) => (
                                                    <option key={`tpl-${t.name}`} value={t.name}>
                                                        {t.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Módulos Permitidos (Checklist)
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                                        {availableModules.map((module) => (
                                            <label key={module.id} className="flex items-start gap-2 cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors">
                                                <input
                                                    type="checkbox"
                                                    disabled={role === 'SUPER_ADMIN' || !!customRoleName || currentUserRole === 'CHECKIN_KIDS_ADMIN'}
                                                    checked={role === 'SUPER_ADMIN' || accessibleModules.includes(module.id)}
                                                    onChange={() => toggleModule(module.id)}
                                                    className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                                <span className="text-sm text-slate-600 leading-tight">{module.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1.5">
                                        {role === 'SUPER_ADMIN' ? 'Los Super Administradores tienen acceso a todo.' :
                                            customRoleName ? 'Los módulos de un rol personalizado están bloqueados y predefinidos por su plantilla.' :
                                                'Elige a qué pantallas podrá entrar el usuario.'}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Organización
                                    </label>
                                    <select
                                        value={organizationId}
                                        onChange={(e) => setOrganizationId(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-white"
                                    >
                                        {organizations.map((org) => (
                                            <option key={org.id} value={org.id}>
                                                {org.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !email || !organizationId || (authType === 'CLASSIC' && !password && !editingUserId)}
                                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] text-sm"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : editingUserId ? (
                                        'Guardar Cambios'
                                    ) : (
                                        'Autorizar Usuario'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isRoleModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 shrink-0">
                            <h3 className="font-semibold text-slate-800">
                                {editingRoleId ? 'Editar Rol Personalizado' : 'Crear Nuevo Rol'}
                            </h3>
                            <button type="button" onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTemplate} className="p-6 overflow-y-auto">
                            {error && (
                                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex gap-3 items-start">
                                    <ShieldAlert className="w-5 h-5 shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Nombre del Rol
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        placeholder="ej. Recepción"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-sm"
                                    />
                                    <p className="text-xs text-slate-500 mt-1.5">Este nombre aparecerá en la página para que lo elijas.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Módulos Permitidos para este Rol
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                                        {availableModules.map((module) => (
                                            <label key={module.id} className="flex items-start gap-2 cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors">
                                                <input
                                                    type="checkbox"
                                                    disabled={newRoleBase === 'SUPER_ADMIN'}
                                                    checked={newRoleBase === 'SUPER_ADMIN' || newRoleModules.includes(module.id)}
                                                    onChange={() => toggleModule(module.id, true)}
                                                    className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 disabled:opacity-50"
                                                />
                                                <span className="text-sm text-slate-600 leading-tight">{module.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsRoleModalOpen(false)}
                                    className="px-4 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !newRoleName}
                                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] text-sm"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        'Guardar Rol'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
