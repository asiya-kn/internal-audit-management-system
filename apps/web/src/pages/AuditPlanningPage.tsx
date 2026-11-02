import { useState } from 'react';
import {
  CalendarCheck, Plus, Search, Edit2, Trash2, Eye,
  AlertCircle, ClipboardList, Clock, CheckCircle2, Target, TrendingUp,
} from 'lucide-react';
import {
  AUDIT_PLAN_STATUSES, AUDIT_PRIORITIES, canTransition,
  type AuditPlanFilters, type AuditPlanSummaryDto, type AuditPlanDetailDto,
  type AuditPlanStatus, type AuditPriority, type CreateAuditPlanRequest,
} from '@iams/shared';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  useAuditPlanList, useAuditPlanDetail, useAuditPlanDashboard,
  useCreateAuditPlan, useUpdateAuditPlan, useDeleteAuditPlan, useTransitionAuditPlan,
} from '../hooks/useAuditPlans';
import { useAuditUniverseList } from '../hooks/useAuditUniverse';
import { useRiskList } from '../hooks/useRisks';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Spinner, PageLoading } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { AuditPlanForm } from '../components/ui/AuditPlanForm';
import { ChevronDown } from 'lucide-react';

const statusStyles: Record<AuditPlanStatus, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-700',
  IN_REVIEW: 'bg-warning-50 text-warning-700',
  APPROVED: 'bg-success-50 text-success-700',
  SCHEDULED: 'bg-primary-50 text-primary-700',
  IN_PROGRESS: 'bg-primary-100 text-primary-800',
  COMPLETED: 'bg-success-100 text-success-800',
  CANCELLED: 'bg-neutral-100 text-neutral-500',
};

const priorityStyles: Record<AuditPriority, string> = {
  CRITICAL: 'bg-error-50 text-error-700 border-error-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  MEDIUM: 'bg-warning-50 text-warning-700 border-warning-200',
  LOW: 'bg-success-50 text-success-700 border-success-200',
};

const statusLabels: Record<AuditPlanStatus, string> = {
  DRAFT: 'Draft', IN_REVIEW: 'In Review', APPROVED: 'Approved',
  SCHEDULED: 'Scheduled', IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

const priorityLabels: Record<AuditPriority, string> = {
  CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low',
};

export function AuditPlanningPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const canCreate = hasPermission('audit_plan.create');
  const canUpdate = hasPermission('audit_plan.update');
  const canApprove = hasPermission('audit_plan.approve');

  const [filters, setFilters] = useState<AuditPlanFilters>({ page: 1, pageSize: 20, sortBy: 'fiscalYear', sortOrder: 'desc' });
  const [searchInput, setSearchInput] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const plansQuery = useAuditPlanList(filters);
  const dashboardQuery = useAuditPlanDashboard();
  const detailQuery = useAuditPlanDetail(detailId);
  const auditEntitiesQuery = useAuditUniverseList({ pageSize: 100 });
  const risksQuery = useRiskList({ pageSize: 100 });
  const createMutation = useCreateAuditPlan();
  const updateMutation = useUpdateAuditPlan(editingId ?? '');
  const deleteMutation = useDeleteAuditPlan();
  const transitionMutation = useTransitionAuditPlan();

  const auditEntities = auditEntitiesQuery.data?.items ?? [];
  const risks = risksQuery.data?.items ?? [];
  const isFormLoading = formMode === 'create' ? createMutation.isPending : updateMutation.isPending;

  function applySearch() {
    setFilters((f) => ({ ...f, search: searchInput.trim() || undefined, page: 1 }));
  }

  function handleCreate() {
    setFormMode('create');
    setEditingId(null);
    setFormOpen(true);
  }

  function handleEdit(plan: AuditPlanSummaryDto) {
    setFormMode('edit');
    setEditingId(plan.id);
    setDetailId(null);
    setFormOpen(true);
  }

  function handleSubmitPlan(values: CreateAuditPlanRequest) {
    if (formMode === 'create') {
      createMutation.mutate(values, {
        onSuccess: () => { toast('Plan item created successfully', 'success'); setFormOpen(false); },
        onError: (e) => toast(e.message, 'error'),
      });
    } else if (editingId) {
      updateMutation.mutate(values, {
        onSuccess: () => { toast('Plan item updated successfully', 'success'); setFormOpen(false); },
        onError: (e) => toast(e.message, 'error'),
      });
    }
  }

  function handleDeleteConfirm() {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => { toast('Plan item deleted', 'success'); setDeleteId(null); },
      onError: (e) => toast(e.message, 'error'),
    });
  }

  function handleTransition(id: string, status: AuditPlanStatus) {
    transitionMutation.mutate({ id, status }, {
      onSuccess: () => { toast(`Status changed to ${statusLabels[status]}`, 'success'); },
      onError: (e) => toast(e.message, 'error'),
    });
  }

  const dashboard = dashboardQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Annual Audit Plan</h1>
          <p className="mt-1 text-sm text-neutral-500">Risk-based annual audit planning</p>
        </div>
        {canCreate && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Add Plan Item
          </Button>
        )}
      </div>

      {/* Dashboard summary */}
      {dashboard ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard icon={<CalendarCheck className="h-5 w-5" />} label="Total Plans" value={dashboard.totalPlans} tone="neutral" />
          <SummaryCard icon={<AlertCircle className="h-5 w-5" />} label="High Priority" value={dashboard.highPriorityCount} tone="error" />
          <SummaryCard icon={<Clock className="h-5 w-5" />} label="Pending Approval" value={dashboard.pendingApprovalCount} tone="warning" />
          <SummaryCard icon={<Target className="h-5 w-5" />} label="Entity Coverage" value={`${dashboard.entityCoverage.coveragePct}%`} tone="primary" />
        </div>
      ) : dashboardQuery.isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : null}

      {/* Status distribution */}
      {dashboard && dashboard.totalPlans > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-800">Plan Status Distribution</h3>
          <div className="mt-4 space-y-2">
            {AUDIT_PLAN_STATUSES.filter((s) => dashboard.byStatus[s] > 0).map((status) => {
              const count = dashboard.byStatus[status];
              const pct = dashboard.totalPlans > 0 ? (count / dashboard.totalPlans) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-2">
                  <span className="w-28 text-xs font-medium text-neutral-600">{statusLabels[status]}</span>
                  <div className="flex-1 h-5 rounded bg-neutral-100 overflow-hidden">
                    <div className={`h-full ${statusStyles[status].split(' ')[0]}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-neutral-700">{count}</span>
                </div>
              );
            })}
          </div>
          {dashboard.byFiscalYear.length > 0 && (
            <div className="mt-4 border-t border-neutral-100 pt-4">
              <h4 className="text-xs font-medium text-neutral-500">By Fiscal Year</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {dashboard.byFiscalYear.map((yr) => (
                  <span key={yr.fiscalYear} className="badge bg-primary-50 text-primary-700">
                    FY{yr.fiscalYear}: {yr.count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              label="Search"
              name="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
              placeholder="Search plan items, references, entities…"
            />
          </div>
          <FilterSelect label="Status" value={filters.status ?? ''} onChange={(v) => setFilters((f) => ({ ...f, status: (v || undefined) as AuditPlanStatus | undefined, page: 1 }))} options={AUDIT_PLAN_STATUSES} />
          <FilterSelect label="Priority" value={filters.priority ?? ''} onChange={(v) => setFilters((f) => ({ ...f, priority: (v || undefined) as AuditPriority | undefined, page: 1 }))} options={AUDIT_PRIORITIES} />
          <Button variant="secondary" onClick={applySearch}>
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </div>

      {/* Plans table */}
      {plansQuery.isLoading ? (
        <PageLoading />
      ) : plansQuery.isError ? (
        <ErrorState message="Failed to load audit plans" onRetry={() => plansQuery.refetch()} />
      ) : plansQuery.data && plansQuery.data.items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Plan Item</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Audit Entity</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Linked Risk</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Priority</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Lead Auditor</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Proposed Dates</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-700">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {plansQuery.data.items.map((plan) => (
                <tr key={plan.id} className="cursor-pointer hover:bg-neutral-50" onClick={() => setDetailId(plan.id)}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{plan.title}</div>
                    <div className="text-xs text-neutral-500">{plan.reference} · FY{plan.fiscalYear}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    <div className="text-xs font-medium">{plan.auditEntityCode}</div>
                    <div className="text-xs text-neutral-500">{plan.auditEntityName}</div>
                  </td>
                  <td className="px-4 py-3">
                    {plan.riskTitle ? (
                      <span className="text-xs text-neutral-600">{plan.riskTitle}</span>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge border ${priorityStyles[plan.priority]}`}>{priorityLabels[plan.priority]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusStyles[plan.status]}`}>{statusLabels[plan.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-neutral-700 text-xs">
                    {plan.leadAuditorName ?? <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-600">
                    {plan.proposedStartDate ? new Date(plan.proposedStartDate).toLocaleDateString() : '—'}
                    {plan.proposedEndDate ? ` → ${new Date(plan.proposedEndDate).toLocaleDateString()}` : ''}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" onClick={() => setDetailId(plan.id)} title="View">
                        <Eye className="h-4 w-4" />
                      </button>
                      {canUpdate && (
                        <button className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" onClick={() => handleEdit(plan)} title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      {canUpdate && (plan.status === 'DRAFT' || plan.status === 'CANCELLED') && (
                        <button className="rounded-md p-1.5 text-neutral-400 hover:bg-error-50 hover:text-error-600" onClick={() => setDeleteId(plan.id)} title="Delete">
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
      ) : (
        <EmptyState
          icon={<CalendarCheck className="h-12 w-12" />}
          title="No plan items found"
          description="Create your first plan item to start building the annual audit plan."
          action={canCreate ? <Button onClick={handleCreate}><Plus className="h-4 w-4" />Add Plan Item</Button> : undefined}
        />
      )}

      {/* Pagination */}
      {plansQuery.data && plansQuery.data.total > (filters.pageSize ?? 20) && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Showing {((filters.page ?? 1) - 1) * (filters.pageSize ?? 20) + 1}–{Math.min((filters.page ?? 1) * (filters.pageSize ?? 20), plansQuery.data.total)} of {plansQuery.data.total}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={(filters.page ?? 1) <= 1} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={(filters.page ?? 1) * (filters.pageSize ?? 20) >= plansQuery.data.total} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}>Next</Button>
          </div>
        </div>
      )}

      {/* Form modal */}
      <AuditPlanForm
        open={formOpen}
        mode={formMode}
        initialValues={formMode === 'edit' ? detailQuery.data ?? undefined : undefined}
        auditEntities={auditEntities}
        risks={risks}
        onSubmit={handleSubmitPlan}
        onCancel={() => setFormOpen(false)}
        loading={isFormLoading}
        serverError={formMode === 'create' ? createMutation.error?.message : updateMutation.error?.message}
      />

      {/* Detail modal */}
      <DetailModal
        open={Boolean(detailId)}
        plan={detailQuery.data ?? null}
        loading={detailQuery.isLoading}
        onClose={() => setDetailId(null)}
        canEdit={canUpdate}
        canApprove={canApprove}
        onEdit={() => { if (detailQuery.data) { handleEdit(detailQuery.data); } }}
        onTransition={(status) => { if (detailId) { handleTransition(detailId, status); } }}
        transitioning={transitionMutation.isPending}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Plan Item"
        message="Are you sure you want to delete this plan item? Only draft or cancelled plans can be deleted."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

// ---- Helper components ----

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone: 'neutral' | 'error' | 'primary' | 'warning' }) {
  const toneClasses = {
    neutral: 'bg-neutral-50 text-neutral-700',
    error: 'bg-error-50 text-error-700',
    primary: 'bg-primary-50 text-primary-700',
    warning: 'bg-warning-50 text-warning-700',
  };
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClasses[tone]}`}>{icon}</div>
        <div>
          <div className="text-2xl font-bold text-neutral-900">{value}</div>
          <div className="text-xs text-neutral-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <select className="input appearance-none pr-9" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">All</option>
          {options.map((o) => <option key={o} value={o}>{statusLabels[o as AuditPlanStatus] ?? priorityLabels[o as AuditPriority] ?? o}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      </div>
    </div>
  );
}

function DetailModal({
  open, plan, loading, onClose, onEdit, onTransition, canEdit, canApprove, transitioning,
}: {
  open: boolean;
  plan: AuditPlanDetailDto | null;
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onTransition: (status: AuditPlanStatus) => void;
  canEdit: boolean;
  canApprove: boolean;
  transitioning: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Plan Item Details" size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12"><Spinner /></div>
      ) : plan ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge border ${priorityStyles[plan.priority]}`}>{priorityLabels[plan.priority]} Priority</span>
            <span className={`badge ${statusStyles[plan.status]}`}>{statusLabels[plan.status]}</span>
            {plan.approvedAt && (
              <span className="badge bg-success-50 text-success-700">
                <CheckCircle2 className="h-3 w-3" />
                Approved {new Date(plan.approvedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-neutral-900">{plan.title}</h3>
            <p className="mt-1 text-sm text-neutral-500">{plan.reference} · FY{plan.fiscalYear}</p>
            <p className="mt-1 text-xs text-neutral-400">{plan.auditEntityCode} — {plan.auditEntityName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <DetailMetric label="Lead Auditor" value={plan.leadAuditorName ?? '—'} />
            <DetailMetric label="Approved By" value={plan.approvedByName ?? '—'} />
            <DetailMetric
              label="Proposed Start"
              value={plan.proposedStartDate ? new Date(plan.proposedStartDate).toLocaleDateString() : '—'}
            />
            <DetailMetric
              label="Proposed End"
              value={plan.proposedEndDate ? new Date(plan.proposedEndDate).toLocaleDateString() : '—'}
            />
          </div>

          {plan.riskTitle && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <div className="text-xs font-medium text-neutral-500">Linked Risk</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-900">{plan.riskTitle}</span>
                {plan.riskInherentLevel && <span className="badge bg-error-50 text-error-700">Inherent: {plan.riskInherentLevel}</span>}
                {plan.riskResidualLevel && <span className="badge bg-warning-50 text-warning-700">Residual: {plan.riskResidualLevel}</span>}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-neutral-700">Objectives</h4>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{plan.objectives}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-700">Scope</h4>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{plan.scope}</p>
          </div>

          {plan.notes && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700">Notes</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{plan.notes}</p>
            </div>
          )}

          {/* Workflow transitions */}
          {canApprove && plan.status !== 'COMPLETED' && plan.status !== 'CANCELLED' && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <h4 className="text-sm font-semibold text-neutral-700">Workflow Actions</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {AUDIT_PLAN_STATUSES.filter((s) => canTransition(plan.status, s)).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="secondary"
                    loading={transitioning}
                    onClick={() => onTransition(s)}
                  >
                    {s === 'APPROVED' && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {s === 'CANCELLED' && <Trash2 className="h-3.5 w-3.5" />}
                    {s === 'IN_REVIEW' && <ClipboardList className="h-3.5 w-3.5" />}
                    {s === 'SCHEDULED' && <CalendarCheck className="h-3.5 w-3.5" />}
                    {s === 'IN_PROGRESS' && <TrendingUp className="h-3.5 w-3.5" />}
                    {s === 'DRAFT' && <Edit2 className="h-3.5 w-3.5" />}
                    {s === 'COMPLETED' && <CheckCircle2 className="h-3.5 w-3.5" />}
                    Move to {statusLabels[s]}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            {canEdit && plan.status !== 'COMPLETED' && plan.status !== 'CANCELLED' && (
              <Button onClick={onEdit}><Edit2 className="h-4 w-4" />Edit</Button>
            )}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-neutral-500">Plan item details could not be loaded.</div>
      )}
    </Modal>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-neutral-900">{value}</div>
    </div>
  );
}
