import { useState } from 'react';
import {
  CheckSquare, Plus, Search, Edit2, Trash2, Eye,
  AlertTriangle, CheckCircle2, Clock, ShieldCheck, MessageSquare,
} from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import {
  ACTION_PLAN_STATUSES, ACTION_PLAN_PRIORITIES,
  canTransitionActionPlan,
  type ActionPlanFilters, type ActionPlanSummaryDto, type ActionPlanDetailDto,
  type ActionPlanStatus, type ActionPlanPriority,
} from '@iams/shared';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  useActionPlanList, useActionPlanDetail, useActionPlanDashboard,
  useCreateActionPlan, useUpdateActionPlan, useDeleteActionPlan,
  useTransitionActionPlan, useAddActionPlanProgressUpdate, useVerifyActionPlan,
} from '../hooks/useActionPlans';
import { useAuditUniverseList } from '../hooks/useAuditUniverse';
import { useEngagementList } from '../hooks/useEngagements';
import { useFindingList } from '../hooks/useFindings';
import { useControlTestList } from '../hooks/useControlTests';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Spinner, PageLoading } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ActionPlanForm } from '../components/ui/ActionPlanForm';

const statusStyles: Record<ActionPlanStatus, string> = {
  OPEN: 'bg-primary-50 text-primary-700',
  IN_PROGRESS: 'bg-warning-50 text-warning-700',
  PENDING_VERIFICATION: 'bg-neutral-100 text-neutral-700',
  COMPLETED: 'bg-success-50 text-success-700',
  OVERDUE: 'bg-error-50 text-error-700',
  CANCELLED: 'bg-neutral-100 text-neutral-400',
};

const statusLabels: Record<ActionPlanStatus, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In Progress', PENDING_VERIFICATION: 'Pending Verification',
  COMPLETED: 'Completed', OVERDUE: 'Overdue', CANCELLED: 'Cancelled',
};

const priorityStyles: Record<ActionPlanPriority, string> = {
  CRITICAL: 'bg-error-100 text-error-800',
  HIGH: 'bg-error-50 text-error-700',
  MEDIUM: 'bg-warning-50 text-warning-700',
  LOW: 'bg-neutral-100 text-neutral-600',
};

const priorityLabels: Record<ActionPlanPriority, string> = {
  CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low',
};

export function ActionPlansPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const canCreate = hasPermission('actions.create');
  const canUpdate = hasPermission('actions.update');
  const canFollowUp = hasPermission('actions.follow_up');
  const canVerify = hasPermission('actions.verify');

  const [filters, setFilters] = useState<ActionPlanFilters>({ page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' });
  const [searchInput, setSearchInput] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [transitionState, setTransitionState] = useState<{ id: string; status: ActionPlanStatus } | null>(null);
  const [updateState, setUpdateState] = useState<{ id: string } | null>(null);
  const [verifyState, setVerifyState] = useState<{ id: string } | null>(null);

  const listQuery = useActionPlanList(filters);
  const dashboardQuery = useActionPlanDashboard();
  const detailQuery = useActionPlanDetail(detailId);
  const auditEntitiesQuery = useAuditUniverseList({ pageSize: 100 });
  const engagementsQuery = useEngagementList({ pageSize: 100 });
  const findingsQuery = useFindingList({ pageSize: 100 });
  const controlTestsQuery = useControlTestList({ pageSize: 100 });
  const createMutation = useCreateActionPlan();
  const updateMutation = useUpdateActionPlan(editingId ?? '');
  const deleteMutation = useDeleteActionPlan();
  const transitionMutation = useTransitionActionPlan();
  const updateMutationApi = useAddActionPlanProgressUpdate();
  const verifyMutation = useVerifyActionPlan();

  const auditEntities = auditEntitiesQuery.data?.items ?? [];
  const engagements = engagementsQuery.data?.items ?? [];
  const findings = findingsQuery.data?.items ?? [];
  const controlTests = controlTestsQuery.data?.items ?? [];
  const isFormLoading = formMode === 'create' ? createMutation.isPending : updateMutation.isPending;

  function applySearch() {
    setFilters((f) => ({ ...f, search: searchInput.trim() || undefined, page: 1 }));
  }

  function handleCreate() {
    setFormMode('create');
    setEditingId(null);
    setFormOpen(true);
  }

  function handleEdit(plan: ActionPlanSummaryDto) {
    setFormMode('edit');
    setEditingId(plan.id);
    setDetailId(null);
    setFormOpen(true);
  }

  function handleSubmit(values: Parameters<typeof createMutation.mutate>[0]) {
    if (formMode === 'create') {
      createMutation.mutate(values, {
        onSuccess: () => { toast('Action plan created successfully', 'success'); setFormOpen(false); },
        onError: (e) => toast(e.message, 'error'),
      });
    } else if (editingId) {
      updateMutation.mutate(values, {
        onSuccess: () => { toast('Action plan updated successfully', 'success'); setFormOpen(false); },
        onError: (e) => toast(e.message, 'error'),
      });
    }
  }

  function handleDeleteConfirm() {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => { toast('Action plan deleted', 'success'); setDeleteId(null); },
      onError: (e) => toast(e.message, 'error'),
    });
  }

  function handleTransitionConfirm() {
    if (!transitionState) return;
    transitionMutation.mutate(
      { id: transitionState.id, status: transitionState.status },
      {
        onSuccess: () => { toast(`Status changed to ${statusLabels[transitionState.status]}`, 'success'); setTransitionState(null); },
        onError: (e) => toast(e.message, 'error'),
      },
    );
  }

  const dashboard = dashboardQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Action Plans</h1>
          <p className="mt-1 text-sm text-neutral-500">Track agreed corrective actions linked to findings and control test results</p>
        </div>
        {canCreate && (
          <Button onClick={handleCreate}><Plus className="h-4 w-4" />New Action Plan</Button>
        )}
      </div>

      {dashboard ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard icon={<CheckSquare className="h-5 w-5" />} label="Total Plans" value={dashboard.totalPlans} tone="neutral" />
          <SummaryCard icon={<Clock className="h-5 w-5" />} label="In Progress" value={dashboard.inProgressCount} tone="primary" />
          <SummaryCard icon={<AlertTriangle className="h-5 w-5" />} label="Overdue" value={dashboard.overdueCount} tone="error" />
          <SummaryCard icon={<ShieldCheck className="h-5 w-5" />} label="Pending Verification" value={dashboard.pendingVerificationCount} tone="success" />
        </div>
      ) : dashboardQuery.isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : null}

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input label="Search" name="search" value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
              placeholder="Search by reference, title, description…" />
          </div>
          <FilterSelect label="Status" value={filters.status ?? ''}
            onChange={(v) => setFilters((f) => ({ ...f, status: (v || undefined) as ActionPlanStatus | undefined, page: 1 }))}
            options={ACTION_PLAN_STATUSES} labels={statusLabels} />
          <FilterSelect label="Priority" value={filters.priority ?? ''}
            onChange={(v) => setFilters((f) => ({ ...f, priority: (v || undefined) as ActionPlanPriority | undefined, page: 1 }))}
            options={ACTION_PLAN_PRIORITIES} labels={priorityLabels} />
          <Button variant="secondary" onClick={applySearch}><Search className="h-4 w-4" />Search</Button>
        </div>
      </div>

      {listQuery.isLoading ? (
        <PageLoading />
      ) : listQuery.isError ? (
        <ErrorState message="Failed to load action plans" onRetry={() => listQuery.refetch()} />
      ) : listQuery.data && listQuery.data.items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Action Plan</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Linked To</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Priority</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Owner</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Target Date</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Progress</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {listQuery.data.items.map((plan) => (
                <tr key={plan.id} className="cursor-pointer hover:bg-neutral-50" onClick={() => setDetailId(plan.id)}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{plan.title}</div>
                    <div className="text-xs text-neutral-500">{plan.reference}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {plan.findingReference && <div className="text-error-600">{plan.findingReference}</div>}
                    {plan.controlTestReference && <div className="text-primary-600">{plan.controlTestReference}</div>}
                    {!plan.findingReference && !plan.controlTestReference && <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="px-4 py-3"><span className={`badge ${priorityStyles[plan.priority]}`}>{priorityLabels[plan.priority]}</span></td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusStyles[plan.status]}`}>{statusLabels[plan.status]}</span>
                    {plan.isOverdue && <span className="badge bg-error-50 text-error-700 ml-1"><AlertTriangle className="h-3 w-3" />Overdue</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-700">
                    {plan.responsibleOwnerName ?? <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-600">
                    {plan.targetDate ? new Date(plan.targetDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded bg-neutral-100 overflow-hidden">
                        <div className="h-full bg-primary-500" style={{ width: `${plan.progressPct}%` }} />
                      </div>
                      <span className="text-xs text-neutral-600">{plan.progressPct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" onClick={() => setDetailId(plan.id)} title="View"><Eye className="h-4 w-4" /></button>
                      {canUpdate && (
                        <button className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" onClick={() => handleEdit(plan)} title="Edit"><Edit2 className="h-4 w-4" /></button>
                      )}
                      {canUpdate && (plan.status === 'OPEN' || plan.status === 'CANCELLED') && (
                        <button className="rounded-md p-1.5 text-neutral-400 hover:bg-error-50 hover:text-error-600" onClick={() => setDeleteId(plan.id)} title="Delete"><Trash2 className="h-4 w-4" /></button>
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
          icon={<CheckSquare className="h-12 w-12" />}
          title="No action plans found"
          description="Create your first corrective action plan to track remediation work linked to audit findings."
          action={canCreate ? <Button onClick={handleCreate}><Plus className="h-4 w-4" />New Action Plan</Button> : undefined}
        />
      )}

      {listQuery.data && listQuery.data.total > (filters.pageSize ?? 20) && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Showing {((filters.page ?? 1) - 1) * (filters.pageSize ?? 20) + 1}–{Math.min((filters.page ?? 1) * (filters.pageSize ?? 20), listQuery.data.total)} of {listQuery.data.total}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={(filters.page ?? 1) <= 1} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={(filters.page ?? 1) * (filters.pageSize ?? 20) >= listQuery.data.total} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}>Next</Button>
          </div>
        </div>
      )}

      <ActionPlanForm
        open={formOpen}
        mode={formMode}
        initialValues={formMode === 'edit' ? detailQuery.data ?? undefined : undefined}
        auditEntities={auditEntities}
        engagements={engagements}
        findings={findings}
        controlTests={controlTests}
        onSubmit={handleSubmit}
        onCancel={() => setFormOpen(false)}
        loading={isFormLoading}
        serverError={formMode === 'create' ? createMutation.error?.message : updateMutation.error?.message}
      />

      <DetailModal
        open={Boolean(detailId)}
        plan={detailQuery.data ?? null}
        loading={detailQuery.isLoading}
        onClose={() => setDetailId(null)}
        canEdit={canUpdate}
        canFollowUp={canFollowUp}
        canVerify={canVerify}
        onEdit={() => { if (detailQuery.data) { handleEdit(detailQuery.data); } }}
        onTransition={(status) => { setDetailId(null); setTransitionState({ id: detailId ?? '', status }); }}
        onAddUpdate={() => { setDetailId(null); setUpdateState({ id: detailId ?? '' }); }}
        onVerify={() => { setDetailId(null); setVerifyState({ id: detailId ?? '' }); }}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Action Plan"
        message="Are you sure you want to delete this action plan? Only open or cancelled plans can be deleted."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmDialog
        open={Boolean(transitionState)}
        title={`Move to ${transitionState ? statusLabels[transitionState.status] : ''}`}
        message={`Confirm status change to ${transitionState ? statusLabels[transitionState.status] : ''}?`}
        confirmLabel="Confirm"
        variant="primary"
        onConfirm={handleTransitionConfirm}
        onCancel={() => setTransitionState(null)}
      />

      <ProgressUpdateDialog
        open={Boolean(updateState)}
        loading={updateMutationApi.isPending}
        onConfirm={(note, progressPct) => {
          if (!updateState) return;
          updateMutationApi.mutate(
            { id: updateState.id, data: { note, progressPct: progressPct !== undefined ? progressPct : undefined } },
            {
              onSuccess: () => { toast('Progress update added', 'success'); setUpdateState(null); },
              onError: (e) => toast(e.message, 'error'),
            },
          );
        }}
        onCancel={() => setUpdateState(null)}
      />

      <VerifyDialog
        open={Boolean(verifyState)}
        loading={verifyMutation.isPending}
        onConfirm={(notes) => {
          if (!verifyState) return;
          verifyMutation.mutate(
            { id: verifyState.id, data: { verificationNotes: notes.trim() || undefined } },
            {
              onSuccess: () => { toast('Action plan verified and completed', 'success'); setVerifyState(null); },
              onError: (e) => toast(e.message, 'error'),
            },
          );
        }}
        onCancel={() => setVerifyState(null)}
      />
    </div>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone: 'neutral' | 'error' | 'primary' | 'success' }) {
  const toneClasses = {
    neutral: 'bg-neutral-50 text-neutral-700',
    error: 'bg-error-50 text-error-700',
    primary: 'bg-primary-50 text-primary-700',
    success: 'bg-success-50 text-success-700',
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

function FilterSelect({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[]; labels: Record<string, string> }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <select className="input appearance-none pr-9" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">All</option>
          {options.map((o) => <option key={o} value={o}>{labels[o] ?? o}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      </div>
    </div>
  );
}

function DetailModal({
  open, plan, loading, onClose, onEdit, onTransition, onAddUpdate, onVerify, canEdit, canFollowUp, canVerify,
}: {
  open: boolean;
  plan: ActionPlanDetailDto | null;
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onTransition: (status: ActionPlanStatus) => void;
  onAddUpdate: () => void;
  onVerify: () => void;
  canEdit: boolean;
  canFollowUp: boolean;
  canVerify: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Action Plan Details" size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12"><Spinner /></div>
      ) : plan ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${statusStyles[plan.status]}`}>{statusLabels[plan.status]}</span>
            <span className={`badge ${priorityStyles[plan.priority]}`}>Priority: {priorityLabels[plan.priority]}</span>
            {plan.isOverdue && <span className="badge bg-error-50 text-error-700"><AlertTriangle className="h-3 w-3" />Overdue</span>}
            {plan.completedAt && <span className="badge bg-success-50 text-success-700"><CheckCircle2 className="h-3 w-3" />Completed {new Date(plan.completedAt).toLocaleDateString()}</span>}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-neutral-900">{plan.title}</h3>
            <p className="mt-1 text-sm text-neutral-500">{plan.reference}</p>
            {plan.auditEntityCode && <p className="mt-1 text-xs text-neutral-400">{plan.auditEntityCode} — {plan.auditEntityName}</p>}
            {plan.findingReference && <p className="mt-1 text-xs text-error-600">Finding: {plan.findingReference} — {plan.findingTitle}</p>}
            {plan.controlTestReference && <p className="mt-1 text-xs text-primary-600">Control Test: {plan.controlTestReference}</p>}
            {plan.engagementReference && <p className="mt-1 text-xs text-primary-600">Engagement: {plan.engagementReference}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <DetailMetric label="Responsible Owner" value={plan.responsibleOwnerName ?? '—'} />
            <DetailMetric label="Reviewer" value={plan.reviewerName ?? '—'} />
            <DetailMetric label="Target Date" value={plan.targetDate ? new Date(plan.targetDate).toLocaleDateString() : '—'} />
            <DetailMetric label="Verified" value={plan.verifiedAt ? new Date(plan.verifiedAt).toLocaleDateString() : '—'} />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-700">Agreed Corrective Action</h4>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{plan.description}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-700">Progress</h4>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-3 flex-1 rounded bg-neutral-100 overflow-hidden">
                <div className="h-full bg-primary-500 transition-all" style={{ width: `${plan.progressPct}%` }} />
              </div>
              <span className="text-sm font-semibold text-neutral-900">{plan.progressPct}%</span>
            </div>
          </div>

          {plan.managementJustification && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700">Management Justification</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{plan.managementJustification}</p>
            </div>
          )}

          {plan.proposedRectification && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700">Proposed Rectification</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{plan.proposedRectification}</p>
            </div>
          )}

          {plan.verificationNotes && (
            <div className="rounded-lg border border-success-200 bg-success-50 p-3">
              <h4 className="text-sm font-semibold text-success-800">Verification Notes</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{plan.verificationNotes}</p>
            </div>
          )}

          {plan.updates.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700">Progress Updates</h4>
              <div className="mt-2 space-y-3">
                {plan.updates.map((u) => (
                  <div key={u.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-neutral-700">{u.updatedByName ?? 'System'}</span>
                      <span className="text-xs text-neutral-400">{new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{u.note}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded bg-neutral-200 overflow-hidden">
                        <div className="h-full bg-primary-400" style={{ width: `${u.progressPct}%` }} />
                      </div>
                      <span className="text-xs text-neutral-500">{u.progressPct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {canEdit && plan.status !== 'COMPLETED' && plan.status !== 'CANCELLED' && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <h4 className="text-sm font-semibold text-neutral-700">Actions</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {canFollowUp && (
                  <Button size="sm" variant="secondary" onClick={onAddUpdate}>
                    <MessageSquare className="h-3.5 w-3.5" />Add Progress Update
                  </Button>
                )}
                {canVerify && plan.status === 'PENDING_VERIFICATION' && (
                  <Button size="sm" variant="secondary" onClick={onVerify}>
                    <ShieldCheck className="h-3.5 w-3.5" />Verify & Complete
                  </Button>
                )}
                {ACTION_PLAN_STATUSES.filter((s) => canTransitionActionPlan(plan.status, s)).map((s) => (
                  <Button key={s} size="sm" variant="secondary" onClick={() => onTransition(s)}>
                    {s === 'CANCELLED' && <Trash2 className="h-3.5 w-3.5" />}
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
        <div className="py-12 text-center text-sm text-neutral-500">Action plan details could not be loaded.</div>
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

function ProgressUpdateDialog({
  open, loading, onConfirm, onCancel,
}: {
  open: boolean;
  loading?: boolean;
  onConfirm: (note: string, progressPct?: number) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState('');
  const [progressPct, setProgressPct] = useState('');
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) { setNote(''); setProgressPct(''); }
  }

  return (
    <Modal open={open} onClose={onCancel} title="Add Progress Update">
      <div className="space-y-4">
        <div>
          <label htmlFor="update-note" className="label">Update Note</label>
          <textarea id="update-note" className="input min-h-[100px]" value={note} onChange={(e) => setNote(e.target.value)} maxLength={10000} placeholder="Describe the progress made on this corrective action..." />
        </div>
        <div>
          <label htmlFor="update-progress" className="label">Progress Percentage (optional)</label>
          <Input name="progressPct" type="number" value={progressPct} onChange={(e) => setProgressPct(e.target.value)} placeholder="0-100" />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onConfirm(note.trim(), progressPct ? Number(progressPct) : undefined)} loading={loading} disabled={!note.trim()}>Add Update</Button>
        </div>
      </div>
    </Modal>
  );
}

function VerifyDialog({
  open, loading, onConfirm, onCancel,
}: {
  open: boolean;
  loading?: boolean;
  onConfirm: (notes: string) => void;
  onCancel: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setNotes('');
  }

  return (
    <Modal open={open} onClose={onCancel} title="Verify Action Plan">
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">Confirm that the corrective action has been implemented and is operating effectively.</p>
        <div>
          <label htmlFor="verify-notes" className="label">Verification Notes (optional)</label>
          <textarea id="verify-notes" className="input min-h-[100px]" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={10000} placeholder="Add verification comments..." />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onConfirm(notes)} loading={loading}>Verify & Complete</Button>
        </div>
      </div>
    </Modal>
  );
}
