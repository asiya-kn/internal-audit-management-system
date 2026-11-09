import { useMemo, useState } from 'react';
import { Plus, Search, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  useAuditUniverseList,
  useAuditUniverseDetail,
  useCreateAuditUniverse,
  useUpdateAuditUniverse,
  useSetAuditUniverseStatus,
  useDeleteAuditUniverse,
} from '../hooks/useAuditUniverse';
import { AuditUniverseForm } from '../components/ui/AuditUniverseForm';
import { AuditUniverseDetailDrawer } from '../components/ui/AuditUniverseDetailDrawer';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { PageLoading } from '../components/ui/Spinner';
import { ErrorState } from '../components/ui/ErrorState';
import { ApiError } from '../lib/api';
import type {
  AuditUniverseFilters,
  AuditUniverseSummaryDto,
  AuditEntityType,
  AuditEntityStatus,
  CreateAuditUniverseRequest,
} from '@iams/shared';

const statusStyles: Record<AuditEntityStatus, string> = {
  ACTIVE: 'bg-success-50 text-success-700',
  INACTIVE: 'bg-neutral-100 text-neutral-600',
  ARCHIVED: 'bg-warning-50 text-warning-700',
};

const entityTypeLabels: Record<AuditEntityType, string> = {
  ORGANIZATION: 'Organization',
  EXECUTIVE_MANAGEMENT: 'Executive Management',
  DEPARTMENT: 'Department',
  BOARD_OF_DIRECTORS: 'Board of Directors',
  SECTOR: 'Sector',
  SYSTEM: 'System',
  PROJECT: 'Project',
  THIRD_PARTY: 'Third Party',
  DIVISION: 'Division',
};

type FormState =
  | { mode: 'create' }
  | { mode: 'edit'; id: string }
  | { mode: 'closed' };

type ConfirmState =
  | { type: 'delete'; id: string; name: string }
  | { type: 'status'; id: string; name: string; status: AuditEntityStatus }
  | null;

export function AuditUniversePage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const canCreate = hasPermission('audit_universe.create');
  const canUpdate = hasPermission('audit_universe.update');
  const canDelete = hasPermission('audit_universe.delete');

  const [filters, setFilters] = useState<AuditUniverseFilters>({ page: 1, pageSize: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [formState, setFormState] = useState<FormState>({ mode: 'closed' });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [serverError, setServerError] = useState('');

  const listQuery = useAuditUniverseList(filters);
  const detailQuery = useAuditUniverseDetail(detailId);

  const createMutation = useCreateAuditUniverse();
  const updateMutation = useUpdateAuditUniverse(
    formState.mode === 'edit' ? formState.id : '',
  );
  const statusMutation = useSetAuditUniverseStatus(confirm?.type === 'status' ? confirm.id : '');
  const deleteMutation = useDeleteAuditUniverse();

  // Parents list for the form's parent dropdown (top-level + active entities from current list)
  const parents = useMemo<AuditUniverseSummaryDto[]>(() => {
    return listQuery.data?.items ?? [];
  }, [listQuery.data]);

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

  function handleFormSubmit(values: CreateAuditUniverseRequest) {
    setServerError('');
    if (formState.mode === 'create') {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast('Audit entity created', 'success');
          handleCloseForm();
        },
        onError: (err: ApiError) => {
          setServerError(err.message);
        },
      });
    } else if (formState.mode === 'edit') {
      updateMutation.mutate(values, {
        onSuccess: () => {
          toast('Audit entity updated', 'success');
          handleCloseForm();
        },
        onError: (err: ApiError) => {
          setServerError(err.message);
        },
      });
    }
  }

  function handleStatusChange(id: string, name: string, status: AuditEntityStatus) {
    setConfirm({ type: 'status', id, name, status });
  }

  function handleDelete(id: string, name: string) {
    setConfirm({ type: 'delete', id, name });
  }

  function executeConfirm() {
    if (!confirm) return;
    if (confirm.type === 'delete') {
      deleteMutation.mutate(confirm.id, {
        onSuccess: () => {
          toast('Audit entity deleted', 'success');
          setConfirm(null);
        },
        onError: (err: ApiError) => {
          toast(err.message, 'error');
          setConfirm(null);
        },
      });
    } else if (confirm.type === 'status') {
      statusMutation.mutate(confirm.status, {
        onSuccess: () => {
          toast(`Entity set to ${confirm.status}`, 'success');
          setConfirm(null);
        },
        onError: (err: ApiError) => {
          toast(err.message, 'error');
          setConfirm(null);
        },
      });
    }
  }

  if (listQuery.isLoading) return <PageLoading />;
  if (listQuery.isError) {
    return <ErrorState message="Failed to load audit universe" onRetry={() => listQuery.refetch()} />;
  }

  const data = listQuery.data;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const editingEntity = formState.mode === 'edit'
    ? detailQuery.data
    : undefined;

  const formInitialValues: Partial<CreateAuditUniverseRequest> | undefined =
    formState.mode === 'edit' && editingEntity
      ? {
          code: editingEntity.code,
          name: editingEntity.name,
          description: editingEntity.description ?? undefined,
          entityType: editingEntity.entityType,
          status: editingEntity.status,
          parentId: editingEntity.parentId ?? undefined,
          businessProcess: editingEntity.businessProcess ?? undefined,
          department: editingEntity.department ?? undefined,
          riskRating: editingEntity.riskRating ?? undefined,
          notes: editingEntity.notes ?? undefined,
          ownerId: editingEntity.ownerId ?? undefined,
        }
      : undefined;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Audit Universe</h1>
          <p className="text-sm text-neutral-500">
            Catalog of auditable entities, organizational units, processes, and systems.
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            Add Entity
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search by name, code, or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch();
            }}
            aria-label="Search audit universe"
          />
        </div>

        <div className="relative">
          <select
            className="input appearance-none pr-9"
            value={filters.entityType ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                entityType: (e.target.value || undefined) as AuditEntityType | undefined,
                page: 1,
              }))
            }
            aria-label="Filter by entity type"
          >
            <option value="">All Types</option>
            {(Object.keys(entityTypeLabels) as AuditEntityType[]).map((t) => (
              <option key={t} value={t}>
                {entityTypeLabels[t]}
              </option>
            ))}
          </select>
          <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-neutral-400" />
        </div>

        <div className="relative">
          <select
            className="input appearance-none pr-9"
            value={filters.status ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                status: (e.target.value || undefined) as AuditEntityStatus | undefined,
                page: 1,
              }))
            }
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-neutral-400" />
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            checked={Boolean(filters.includeArchived)}
            onChange={(e) =>
              setFilters((f) => ({ ...f, includeArchived: e.target.checked, page: 1 }))
            }
          />
          Include archived
        </label>

        <Button variant="secondary" size="sm" onClick={applySearch}>
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
          <Building2 className="mb-4 h-12 w-12 text-neutral-300" />
          <h3 className="text-lg font-semibold text-neutral-900">No audit entities found</h3>
          <p className="mt-1.5 max-w-sm text-sm text-neutral-500">
            {filters.search || filters.entityType || filters.status
              ? 'Try adjusting your filters or search terms.'
              : 'Get started by adding your first auditable entity.'}
          </p>
          {canCreate && (
            <Button className="mt-6" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Add Entity
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700">Department</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700">Parent</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((entity) => (
                  <tr key={entity.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-900">{entity.code}</td>
                    <td className="px-4 py-3 text-neutral-900">
                      <button
                        className="text-left font-medium text-primary-700 hover:underline"
                        onClick={() => setDetailId(entity.id)}
                      >
                        {entity.name}
                      </button>
                      {entity.childCount > 0 && (
                        <span className="ml-2 text-xs text-neutral-400">
                          ({entity.childCount} child{entity.childCount === 1 ? '' : 'ren'})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {entityTypeLabels[entity.entityType]}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{entity.department ?? '—'}</td>
                    <td className="px-4 py-3 text-neutral-600">{entity.parentName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusStyles[entity.status]}`}>
                        {entity.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
                          onClick={() => setDetailId(entity.id)}
                          aria-label="View details"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canUpdate && (
                          <>
                            <button
                              className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
                              onClick={() => handleOpenEdit(entity.id)}
                              aria-label="Edit entity"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {entity.status !== 'ACTIVE' && (
                              <button
                                className="rounded-md p-1.5 text-success-600 hover:bg-success-50"
                                onClick={() => handleStatusChange(entity.id, entity.name, 'ACTIVE')}
                                aria-label="Activate entity"
                                title="Activate"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                            {entity.status === 'ACTIVE' && (
                              <button
                                className="rounded-md p-1.5 text-warning-600 hover:bg-warning-50"
                                onClick={() => handleStatusChange(entity.id, entity.name, 'INACTIVE')}
                                aria-label="Deactivate entity"
                                title="Deactivate"
                              >
                                <span className="block h-4 w-4 text-center text-xs font-bold leading-4">—</span>
                              </button>
                            )}
                          </>
                        )}
                        {canDelete && (
                          <button
                            className="rounded-md p-1.5 text-error-600 hover:bg-error-50"
                            onClick={() => handleDelete(entity.id, entity.name)}
                            aria-label="Delete entity"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-neutral-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create / Edit form */}
      <AuditUniverseForm
        open={formState.mode !== 'closed'}
        mode={formState.mode === 'edit' ? 'edit' : 'create'}
        initialValues={formInitialValues}
        parents={parents}
        excludeId={formState.mode === 'edit' ? formState.id : undefined}
        onSubmit={handleFormSubmit}
        onCancel={handleCloseForm}
        loading={createMutation.isPending || updateMutation.isPending}
        serverError={serverError}
      />

      {/* Detail drawer */}
      <AuditUniverseDetailDrawer
        open={Boolean(detailId)}
        entity={detailQuery.data ?? null}
        loading={detailQuery.isLoading}
        onClose={() => setDetailId(null)}
        onEdit={() => detailId && handleOpenEdit(detailId)}
        canEdit={canUpdate}
      />

      {/* Confirm dialog */}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.type === 'delete' ? 'Delete Audit Entity' : 'Change Status'}
        message={
          confirm?.type === 'delete'
            ? `Are you sure you want to delete "${confirm.name}"? This action cannot be undone.`
            : confirm?.type === 'status'
              ? `Set "${confirm.name}" to ${confirm.status}?`
              : ''
        }
        confirmLabel={confirm?.type === 'delete' ? 'Delete' : 'Confirm'}
        variant={confirm?.type === 'delete' ? 'danger' : 'primary'}
        onConfirm={executeConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
