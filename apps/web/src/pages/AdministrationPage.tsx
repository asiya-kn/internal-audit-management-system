import { useMemo, useState } from 'react';
import {
  Plus, Search, Eye, Pencil, ChevronLeft, ChevronRight,
  Users, Shield, ScrollText, BarChart3, CheckCircle2, XCircle,
  AlertTriangle, Lock, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  useAdminUserList,
  useAdminUserDetail,
  useAdminRoles,
  useAdminPermissions,
  useAdminAuditLogs,
  useAdminStats,
  useCreateAdminUser,
  useUpdateAdminUser,
  useSetAdminUserActive,
  useUpdateRolePermissions,
} from '../hooks/useAdmin';
import { UserForm } from '../components/ui/UserForm';
import { UserDetailDrawer } from '../components/ui/UserDetailDrawer';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { PageLoading } from '../components/ui/Spinner';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { ApiError } from '../lib/api';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { formatDate } from '../lib/preferences';
import type {
  AdminUserFilters,
  AdminUserSummaryDto,
  CreateAdminUserRequest,
  AuditLogFilters,
} from '@iams/shared';

type Tab = 'users' | 'roles' | 'audit-logs';
type FormState = { mode: 'create' } | { mode: 'edit'; id: string } | { mode: 'closed' };
type ConfirmState =
  | { type: 'activate'; id: string; name: string; isActive: boolean }
  | null;

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-50 ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-neutral-900">{value}</p>
          <p className="text-xs text-neutral-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function AdministrationPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const canViewUsers = hasPermission('users.view');
  const canCreateUsers = hasPermission('users.create');
  const canUpdateUsers = hasPermission('users.update');
  const canViewRoles = hasPermission('roles.view');
  const canManageRoles = hasPermission('roles.manage');
  const canViewLogs = hasPermission('activity_logs.view');

  const [tab, setTab] = useState<Tab>('users');

  // User list state
  const { preferences } = useUserPreferences();
  const [filters, setFilters] = useState<AdminUserFilters>({ page: 1, pageSize: preferences.tablePageSize });
  const [searchInput, setSearchInput] = useState('');
  const [formState, setFormState] = useState<FormState>({ mode: 'closed' });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [serverError, setServerError] = useState('');

  // Audit log filters
  const [logFilters, setLogFilters] = useState<AuditLogFilters>({ page: 1, pageSize: preferences.tablePageSize });
  const [logCategory, setLogCategory] = useState('');

  // Role permission editing
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());

  // Queries
  const listQuery = useAdminUserList(filters);
  const detailQuery = useAdminUserDetail(detailId);
  const rolesQuery = useAdminRoles();
  const permissionsQuery = useAdminPermissions();
  const statsQuery = useAdminStats();
  const logsQuery = useAdminAuditLogs(logFilters);

  // Mutations
  const createMutation = useCreateAdminUser();
  const updateMutation = useUpdateAdminUser(formState.mode === 'edit' ? formState.id : '');
  const activeMutation = useSetAdminUserActive();
  const rolePermMutation = useUpdateRolePermissions();

  const roles = useMemo(() => rolesQuery.data?.items ?? [], [rolesQuery.data]);
  const allPermissions = useMemo(() => permissionsQuery.data ?? [], [permissionsQuery.data]);

  function applySearch() {
    setFilters((f) => ({ ...f, search: searchInput.trim() || undefined, page: 1 }));
  }

  function handlePageChange(newPage: number) {
    setFilters((f) => ({ ...f, page: newPage }));
  }

  function handleOpenCreate() {
    setServerError('');
    setFormState({ mode: 'create' });
  }

  function handleOpenEdit(id: string) {
    setServerError('');
    setDetailId(null);
    setFormState({ mode: 'edit', id });
  }

  function handleCloseForm() {
    setFormState({ mode: 'closed' });
    setServerError('');
  }

  function handleFormSubmit(values: CreateAdminUserRequest) {
    setServerError('');
    if (formState.mode === 'create') {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast('User created successfully', 'success');
          handleCloseForm();
        },
        onError: (err: ApiError) => setServerError(err.message),
      });
    } else if (formState.mode === 'edit') {
      const updateData: Record<string, unknown> = { ...values };
      if (!values.password) delete updateData.password;
      updateMutation.mutate(updateData as Parameters<typeof updateMutation.mutate>[0], {
        onSuccess: () => {
          toast('User updated successfully', 'success');
          handleCloseForm();
        },
        onError: (err: ApiError) => setServerError(err.message),
      });
    }
  }

  function handleToggleActive(user: AdminUserSummaryDto) {
    setConfirm({ type: 'activate', id: user.id, name: `${user.firstName} ${user.lastName}`, isActive: user.isActive });
  }

  function executeConfirm() {
    if (!confirm) return;
    const newActive = !confirm.isActive;
    activeMutation.mutate(
      { id: confirm.id, isActive: newActive },
      {
        onSuccess: () => {
          toast(`User ${newActive ? 'activated' : 'deactivated'}`, 'success');
          setConfirm(null);
        },
        onError: (err: ApiError) => {
          toast(err.message, 'error');
          setConfirm(null);
        },
      },
    );
  }

  function handleEditRolePermissions(roleId: string, currentPermIds: string[]) {
    setEditingRoleId(roleId);
    setSelectedPermIds(new Set(currentPermIds));
  }

  function togglePermission(permId: string) {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  }

  function saveRolePermissions() {
    if (!editingRoleId) return;
    rolePermMutation.mutate(
      { roleId: editingRoleId, data: { permissionIds: Array.from(selectedPermIds) } },
      {
        onSuccess: () => {
          toast('Role permissions updated', 'success');
          setEditingRoleId(null);
          setSelectedPermIds(new Set());
        },
        onError: (err: ApiError) => {
          toast(err.message, 'error');
        },
      },
    );
  }

  // Permission gate
  if (!canViewUsers && !canViewRoles && !canViewLogs) {
    return (
      <EmptyState
        icon={<Lock className="h-12 w-12" />}
        title="Access Restricted"
        description="You do not have permission to access the Administration module."
      />
    );
  }

  if (tab === 'users' && listQuery.isLoading) return <PageLoading />;

  const availableTabs: { key: Tab; label: string; hasPerm: boolean }[] = [
    { key: 'users', label: 'Users', hasPerm: canViewUsers },
    { key: 'roles', label: 'Roles & Permissions', hasPerm: canViewRoles },
    { key: 'audit-logs', label: 'Audit Logs', hasPerm: canViewLogs },
  ];

  const editingUser = formState.mode === 'edit' ? detailQuery.data : undefined;
  const formInitialValues = editingUser
    ? {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email,
        roles: editingUser.roles,
        isActive: editingUser.isActive,
      }
    : undefined;

  const userData = listQuery.data;
  const userItems = userData?.items ?? [];
  const totalUsers = userData?.total ?? 0;
  const userPage = filters.page ?? 1;
  const userPageSize = filters.pageSize ?? 20;
  const userTotalPages = Math.max(1, Math.ceil(totalUsers / userPageSize));

  const logData = logsQuery.data;
  const logItems = logData?.items ?? [];
  const logTotal = logData?.total ?? 0;
  const logPage = logFilters.page ?? 1;
  const logPageSize = logFilters.pageSize ?? 20;
  const logTotalPages = Math.max(1, Math.ceil(logTotal / logPageSize));

  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Administration</h1>
        <p className="text-sm text-neutral-500">
          Manage users, roles, permissions, and review system activity.
        </p>
      </div>

      {/* Stats */}
      {canViewUsers && stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          <StatCard icon={<Users className="h-5 w-5 text-primary-600" />} label="Total Users" value={stats.totalUsers} color="text-primary-600" />
          <StatCard icon={<CheckCircle2 className="h-5 w-5 text-success-600" />} label="Active" value={stats.activeUsers} color="text-success-600" />
          <StatCard icon={<XCircle className="h-5 w-5 text-neutral-500" />} label="Inactive" value={stats.inactiveUsers} color="text-neutral-500" />
          <StatCard icon={<Shield className="h-5 w-5 text-primary-600" />} label="Roles" value={stats.totalRoles} color="text-primary-600" />
          <StatCard icon={<Lock className="h-5 w-5 text-primary-600" />} label="Permissions" value={stats.totalPermissions} color="text-primary-600" />
          <StatCard icon={<CheckCircle2 className="h-5 w-5 text-success-600" />} label="Logins (7d)" value={stats.recentLogins} color="text-success-600" />
          <StatCard icon={<AlertTriangle className="h-5 w-5 text-warning-600" />} label="Failed (7d)" value={stats.failedLoginAttempts} color="text-warning-600" />
          <StatCard icon={<BarChart3 className="h-5 w-5 text-neutral-500" />} label="Audit Logs" value={stats.totalAuditLogs} color="text-neutral-500" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200">
        {availableTabs.filter((t) => t.hasPerm).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-primary-600 text-primary-700'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && canViewUsers && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                className="input pl-9"
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
                aria-label="Search users"
              />
            </div>
            <div className="relative">
              <select
                className="input appearance-none pr-9"
                value={filters.isActive === undefined ? '' : String(filters.isActive)}
                onChange={(e) => setFilters((f) => ({
                  ...f,
                  isActive: e.target.value === '' ? undefined : e.target.value === 'true',
                  page: 1,
                }))}
                aria-label="Filter by status"
              >
                <option value="">All Statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
            <Button variant="secondary" size="sm" onClick={applySearch}>
              <Search className="h-4 w-4" /> Search
            </Button>
            {canCreateUsers && (
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" /> Add User
              </Button>
            )}
          </div>

          {/* Users table */}
          {listQuery.isError ? (
            <ErrorState message="Failed to load users" onRetry={() => listQuery.refetch()} />
          ) : userItems.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="No users found"
              description={filters.search || filters.isActive !== undefined ? 'Try adjusting your filters.' : 'No users have been created yet.'}
              action={canCreateUsers ? <Button onClick={handleOpenCreate}><Plus className="h-4 w-4" /> Add User</Button> : undefined}
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50">
                      <th className="px-4 py-3 text-left font-semibold text-neutral-700">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-700">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-700">Roles</th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-700">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-700">Last Login</th>
                      <th className="px-4 py-3 text-right font-semibold text-neutral-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {userItems.map((user) => (
                      <tr key={user.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 font-medium text-neutral-900">
                          <button
                            className="text-left text-primary-700 hover:underline"
                            onClick={() => setDetailId(user.id)}
                          >
                            {user.firstName} {user.lastName}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{user.email}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length > 0 ? (
                              user.roles.map((r) => (
                                <span key={r.id} className="badge bg-primary-50 text-primary-700">{r.name}</span>
                              ))
                            ) : (
                              <span className="text-xs text-neutral-400">No roles</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${user.isActive ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-600'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-600">
                          {user.lastLoginAt ? formatDate(user.lastLoginAt, preferences.dateFormat) : 'Never'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
                              onClick={() => setDetailId(user.id)}
                              aria-label="View details"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {canUpdateUsers && (
                              <>
                                <button
                                  className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
                                  onClick={() => handleOpenEdit(user.id)}
                                  aria-label="Edit user"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  className={`rounded-md p-1.5 ${user.isActive ? 'text-warning-600 hover:bg-warning-50' : 'text-success-600 hover:bg-success-50'}`}
                                  onClick={() => handleToggleActive(user)}
                                  aria-label={user.isActive ? 'Deactivate user' : 'Activate user'}
                                  title={user.isActive ? 'Deactivate' : 'Activate'}
                                >
                                  {user.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-sm text-neutral-500">
                  Showing {(userPage - 1) * userPageSize + 1}–{Math.min(userPage * userPageSize, totalUsers)} of {totalUsers}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" disabled={userPage <= 1} onClick={() => handlePageChange(userPage - 1)}>
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm text-neutral-600">Page {userPage} of {userTotalPages}</span>
                  <Button variant="secondary" size="sm" disabled={userPage >= userTotalPages} onClick={() => handlePageChange(userPage + 1)}>
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* User form */}
          <UserForm
            open={formState.mode !== 'closed'}
            mode={formState.mode === 'edit' ? 'edit' : 'create'}
            initialValues={formInitialValues}
            roles={roles}
            onSubmit={handleFormSubmit}
            onCancel={handleCloseForm}
            loading={createMutation.isPending || updateMutation.isPending}
            serverError={serverError}
          />

          {/* Detail drawer */}
          <UserDetailDrawer
            open={Boolean(detailId)}
            user={detailQuery.data ?? null}
            loading={detailQuery.isLoading}
            onClose={() => setDetailId(null)}
            onEdit={() => detailId && handleOpenEdit(detailId)}
            canEdit={canUpdateUsers}
          />

          {/* Confirm dialog */}
          <ConfirmDialog
            open={Boolean(confirm)}
            title={confirm?.isActive ? 'Deactivate User' : 'Activate User'}
            message={confirm ? `Are you sure you want to ${confirm.isActive ? 'deactivate' : 'activate'} "${confirm.name}"?` : ''}
            confirmLabel={confirm?.isActive ? 'Deactivate' : 'Activate'}
            variant={confirm?.isActive ? 'danger' : 'primary'}
            onConfirm={executeConfirm}
            onCancel={() => setConfirm(null)}
          />
        </div>
      )}

      {/* Roles & Permissions tab */}
      {tab === 'roles' && canViewRoles && (
        <div className="space-y-4">
          {rolesQuery.isLoading ? (
            <PageLoading />
          ) : rolesQuery.isError ? (
            <ErrorState message="Failed to load roles" onRetry={() => rolesQuery.refetch()} />
          ) : roles.length === 0 ? (
            <EmptyState
              icon={<Shield className="h-12 w-12" />}
              title="No roles found"
              description="Roles are created during system setup. Contact your administrator."
            />
          ) : (
            <div className="space-y-4">
              {roles.map((role) => (
                <div key={role.id} className="card p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary-600" />
                        <h3 className="text-sm font-semibold text-neutral-900">{role.name}</h3>
                        <span className="badge bg-neutral-100 text-neutral-600">{role.userCount} user{role.userCount === 1 ? '' : 's'}</span>
                      </div>
                      {role.description && (
                        <p className="mt-1 text-xs text-neutral-500">{role.description}</p>
                      )}
                    </div>
                    {canManageRoles && editingRoleId !== role.id && (
                      <Button variant="secondary" size="sm" onClick={() => handleEditRolePermissions(role.id, role.permissions.map((p) => p.id))}>
                        <Pencil className="h-3.5 w-3.5" /> Edit Permissions
                      </Button>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {role.permissions.length > 0 ? (
                      role.permissions.map((p) => (
                        <span key={p.id} className="badge bg-primary-50 text-primary-700">{p.name}</span>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-400">No permissions assigned</span>
                    )}
                  </div>

                  {/* Permission editor */}
                  {editingRoleId === role.id && (
                    <div className="mt-4 border-t border-neutral-200 pt-4">
                      <h4 className="text-sm font-semibold text-neutral-800">Select Permissions</h4>
                      {permissionsQuery.isLoading ? (
                        <p className="mt-2 text-sm text-neutral-400">Loading permissions...</p>
                      ) : (
                        <>
                          <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-neutral-200 p-3">
                            {allPermissions.map((perm) => (
                              <label key={perm.id} className="flex items-start gap-2 text-sm text-neutral-700">
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                                  checked={selectedPermIds.has(perm.id)}
                                  onChange={() => togglePermission(perm.id)}
                                />
                                <div>
                                  <span className="font-medium">{perm.name}</span>
                                  {perm.description && (
                                    <span className="block text-xs text-neutral-400">{perm.description}</span>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                          <div className="mt-3 flex justify-end gap-2">
                            <Button variant="secondary" size="sm" onClick={() => { setEditingRoleId(null); setSelectedPermIds(new Set()); }}>
                              Cancel
                            </Button>
                            <Button size="sm" loading={rolePermMutation.isPending} onClick={saveRolePermissions}>
                              Save Permissions
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit Logs tab */}
      {tab === 'audit-logs' && canViewLogs && (
        <div className="space-y-4">
          {/* Log filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                className="input appearance-none pr-9"
                value={logCategory}
                onChange={(e) => {
                  setLogCategory(e.target.value);
                  setLogFilters((f) => ({ ...f, category: e.target.value || undefined, page: 1 }));
                }}
                aria-label="Filter by category"
              >
                <option value="">All Categories</option>
                <option value="auth">Auth</option>
                <option value="authorization">Authorization</option>
                <option value="admin">Admin</option>
                <option value="data_access">Data Access</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
            <div className="relative">
              <select
                className="input appearance-none pr-9"
                value={logFilters.success === undefined ? '' : String(logFilters.success)}
                onChange={(e) => setLogFilters((f) => ({
                  ...f,
                  success: e.target.value === '' ? undefined : e.target.value === 'true',
                  page: 1,
                }))}
                aria-label="Filter by result"
              >
                <option value="">All Results</option>
                <option value="true">Success Only</option>
                <option value="false">Failures Only</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>

          {/* Logs table */}
          {logsQuery.isLoading ? (
            <PageLoading />
          ) : logsQuery.isError ? (
            <ErrorState message="Failed to load audit logs" onRetry={() => logsQuery.refetch()} />
          ) : logItems.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="h-12 w-12" />}
              title="No audit logs found"
              description="System activity will appear here as users interact with the application."
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50">
                      <th className="px-4 py-3 text-left font-semibold text-neutral-700">Timestamp</th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-700">Action</th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-700">Category</th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-700">User</th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-700">IP</th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-700">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {logItems.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">
                          {formatDate(log.createdAt, preferences.dateFormat)}
                        </td>
                        <td className="px-4 py-3 font-medium text-neutral-900">{log.action}</td>
                        <td className="px-4 py-3">
                          <span className="badge bg-neutral-100 text-neutral-600">{log.category}</span>
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{log.userEmail ?? '—'}</td>
                        <td className="px-4 py-3 text-neutral-500 text-xs">{log.ip ?? '—'}</td>
                        <td className="px-4 py-3">
                          {log.success ? (
                            <span className="badge bg-success-50 text-success-700">Success</span>
                          ) : (
                            <span className="badge bg-error-50 text-error-700">Failed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Log pagination */}
              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-sm text-neutral-500">
                  Showing {(logPage - 1) * logPageSize + 1}–{Math.min(logPage * logPageSize, logTotal)} of {logTotal}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" disabled={logPage <= 1} onClick={() => setLogFilters((f) => ({ ...f, page: logPage - 1 }))}>
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm text-neutral-600">Page {logPage} of {logTotalPages}</span>
                  <Button variant="secondary" size="sm" disabled={logPage >= logTotalPages} onClick={() => setLogFilters((f) => ({ ...f, page: logPage + 1 }))}>
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
