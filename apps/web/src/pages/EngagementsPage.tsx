import { useState } from 'react';
import {
  FolderKanban, Plus, Search, Edit2, Trash2, Eye,
  Users, Clock, CheckCircle2, AlertCircle, PlayCircle, ClipboardList,
} from 'lucide-react';
import {
  ENGAGEMENT_STATUSES, ENGAGEMENT_TYPES, canTransitionEngagement,
  type EngagementFilters, type EngagementSummaryDto, type EngagementDetailDto,
  type EngagementStatus, type EngagementType,
} from '@iams/shared';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  useEngagementList, useEngagementDetail, useEngagementDashboard,
  useCreateEngagement, useUpdateEngagement, useDeleteEngagement, useTransitionEngagement,
} from '../hooks/useEngagements';
import { useAuditUniverseList } from '../hooks/useAuditUniverse';
import { useRiskList } from '../hooks/useRisks';
import { useAuditPlanList, useAuditPlanDetail } from '../hooks/useAuditPlans';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Spinner, PageLoading } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EngagementForm } from '../components/ui/EngagementForm';
import { ChevronDown } from 'lucide-react';

const statusStyles: Record<EngagementStatus, string> = {
  PLANNED: 'bg-neutral-100 text-neutral-700',
  ASSIGNED: 'bg-primary-50 text-primary-700',
  IN_PROGRESS: 'bg-primary-100 text-primary-800',
  IN_REVIEW: 'bg-warning-50 text-warning-700',
  COMPLETED: 'bg-success-100 text-success-800',
  CANCELLED: 'bg-neutral-100 text-neutral-500',
  ON_HOLD: 'bg-warning-50 text-warning-700',
};

const statusLabels: Record<EngagementStatus, string> = {
  PLANNED: 'Planned', ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review', COMPLETED: 'Completed', CANCELLED: 'Cancelled', ON_HOLD: 'On Hold',
};

const typeLabels: Record<EngagementType, string> = {
  INTERNAL_AUDIT: 'Internal Audit', COMPLIANCE_AUDIT: 'Compliance Audit',
  IT_AUDIT: 'IT Audit', OPERATIONAL_AUDIT: 'Operational Audit',
  FINANCIAL_AUDIT: 'Financial Audit', FOLLOW_UP: 'Follow-up',
  SPECIAL_REVIEW: 'Special Review', AD_HOC: 'Ad Hoc',
};

export function EngagementsPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const canCreate = hasPermission('engagements.create');
  const canUpdate = hasPermission('engagements.update');
  const canAssign = hasPermission('engagements.assign');

  const [filters, setFilters] = useState<EngagementFilters>({ page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' });
  const [searchInput, setSearchInput] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formPlanId, setFormPlanId] = useState<string | null>(null);

  const listQuery = useEngagementList(filters);
  const dashboardQuery = useEngagementDashboard();
  const detailQuery = useEngagementDetail(detailId);
  const auditEntitiesQuery = useAuditUniverseList({ pageSize: 100 });
  const risksQuery = useRiskList({ pageSize: 100 });
  const auditPlansQuery = useAuditPlanList({ pageSize: 100, status: 'APPROVED' });
  const planDetailQuery = useAuditPlanDetail(formPlanId);
  const createMutation = useCreateEngagement();
  const updateMutation = useUpdateEngagement(editingId ?? '');
  const deleteMutation = useDeleteEngagement();
  const transitionMutation = useTransitionEngagement();

  const auditEntities = auditEntitiesQuery.data?.items ?? [];
  const risks = risksQuery.data?.items ?? [];
  const auditPlans = auditPlansQuery.data?.items ?? [];
  const isFormLoading = formMode === 'create' ? createMutation.isPending : updateMutation.isPending;

  function applySearch() {
    setFilters((f) => ({ ...f, search: searchInput.trim() || undefined, page: 1 }));
  }

  function handleCreate() {
    setFormMode('create');
    setEditingId(null);
    setFormPlanId(null);
    setFormOpen(true);
  }

  function handleEdit(eng: EngagementSummaryDto) {
    setFormMode('edit');
    setEditingId(eng.id);
    setFormPlanId(eng.auditPlanId);
    setDetailId(null);
    setFormOpen(true);
  }

  function handleSubmit(values: Parameters<typeof createMutation.mutate>[0]) {
    if (formMode === 'create') {
      createMutation.mutate(values, {
        onSuccess: () => { toast('Engagement created successfully', 'success'); setFormOpen(false); },
        onError: (e) => toast(e.message, 'error'),
      });
    } else if (editingId) {
      updateMutation.mutate(values, {
        onSuccess: () => { toast('Engagement updated successfully', 'success'); setFormOpen(false); },
        onError: (e) => toast(e.message, 'error'),
      });
    }
  }

  function handleDeleteConfirm() {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => { toast('Engagement deleted', 'success'); setDeleteId(null); },
      onError: (e) => toast(e.message, 'error'),
    });
  }

  function handleTransition(id: string, status: EngagementStatus) {
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
          <h1 className="text-2xl font-bold text-neutral-900">Audit Engagements</h1>
          <p className="mt-1 text-sm text-neutral-500">Track and manage audit engagement lifecycle</p>
        </div>
        {canCreate && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            New Engagement
          </Button>
        )}
      </div>

      {dashboard ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard icon={<FolderKanban className="h-5 w-5" />} label="Total" value={dashboard.totalEngagements} tone="neutral" />
          <SummaryCard icon={<PlayCircle className="h-5 w-5" />} label="Active" value={dashboard.activeCount} tone="primary" />
          <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Completed" value={dashboard.completedCount} tone="success" />
          <SummaryCard icon={<AlertCircle className="h-5 w-5" />} label="Overdue" value={dashboard.overdueEngagements} tone="error" />
        </div>
      ) : dashboardQuery.isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : null}

      {dashboard && dashboard.totalEngagements > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-800">Status Distribution</h3>
          <div className="mt-4 space-y-2">
            {ENGAGEMENT_STATUSES.filter((s) => dashboard.byStatus[s] > 0).map((status) => {
              const count = dashboard.byStatus[status];
              const pct = dashboard.totalEngagements > 0 ? (count / dashboard.totalEngagements) * 100 : 0;
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
          {dashboard.plannedFromAuditPlan > 0 && (
            <p className="mt-4 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
              {dashboard.plannedFromAuditPlan} engagement(s) created from approved audit plans
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input label="Search" name="search" value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
              placeholder="Search by reference, title, entity…" />
          </div>
          <FilterSelect label="Status" value={filters.status ?? ''}
            onChange={(v) => setFilters((f) => ({ ...f, status: (v || undefined) as EngagementStatus | undefined, page: 1 }))}
            options={ENGAGEMENT_STATUSES} labels={statusLabels} />
          <FilterSelect label="Type" value={filters.type ?? ''}
            onChange={(v) => setFilters((f) => ({ ...f, type: (v || undefined) as EngagementType | undefined, page: 1 }))}
            options={ENGAGEMENT_TYPES} labels={typeLabels} />
          <Button variant="secondary" onClick={applySearch}><Search className="h-4 w-4" />Search</Button>
        </div>
      </div>

      {listQuery.isLoading ? (
        <PageLoading />
      ) : listQuery.isError ? (
        <ErrorState message="Failed to load engagements" onRetry={() => listQuery.refetch()} />
      ) : listQuery.data && listQuery.data.items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Engagement</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Audit Entity</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Lead Auditor</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Dates</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Team</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {listQuery.data.items.map((eng) => (
                <tr key={eng.id} className="cursor-pointer hover:bg-neutral-50" onClick={() => setDetailId(eng.id)}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{eng.title}</div>
                    <div className="text-xs text-neutral-500">{eng.reference}{eng.auditPlanReference ? ` · from ${eng.auditPlanReference}` : ''}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    <div className="text-xs font-medium">{eng.auditEntityCode}</div>
                    <div className="text-xs text-neutral-500">{eng.auditEntityName}</div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-neutral-600">{typeLabels[eng.type]}</span></td>
                  <td className="px-4 py-3"><span className={`badge ${statusStyles[eng.status]}`}>{statusLabels[eng.status]}</span></td>
                  <td className="px-4 py-3 text-xs text-neutral-700">
                    {eng.leadAuditorName ?? <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-600">
                    {eng.startDate ? new Date(eng.startDate).toLocaleDateString() : '—'}
                    {eng.endDate ? ` → ${new Date(eng.endDate).toLocaleDateString()}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    {eng.teamMemberCount > 0 ? (
                      <span className="badge bg-primary-50 text-primary-700"><Users className="h-3 w-3" />{eng.teamMemberCount}</span>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" onClick={() => setDetailId(eng.id)} title="View"><Eye className="h-4 w-4" /></button>
                      {canUpdate && (
                        <button className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" onClick={() => handleEdit(eng)} title="Edit"><Edit2 className="h-4 w-4" /></button>
                      )}
                      {canUpdate && (eng.status === 'PLANNED' || eng.status === 'CANCELLED') && (
                        <button className="rounded-md p-1.5 text-neutral-400 hover:bg-error-50 hover:text-error-600" onClick={() => setDeleteId(eng.id)} title="Delete"><Trash2 className="h-4 w-4" /></button>
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
          icon={<FolderKanban className="h-12 w-12" />}
          title="No audit engagements found"
          description="Create your first audit engagement to start tracking audit fieldwork and execution."
          action={canCreate ? <Button onClick={handleCreate}><Plus className="h-4 w-4" />New Engagement</Button> : undefined}
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

      <EngagementForm
        open={formOpen}
        mode={formMode}
        initialValues={formMode === 'edit' ? detailQuery.data ?? undefined : undefined}
        auditEntities={auditEntities}
        risks={risks}
        auditPlans={auditPlans}
        planDetail={formMode === 'create' ? planDetailQuery.data ?? null : null}
        onPlanChange={(planId) => setFormPlanId(planId)}
        onSubmit={handleSubmit}
        onCancel={() => { setFormOpen(false); setFormPlanId(null); }}
        loading={isFormLoading}
        serverError={formMode === 'create' ? createMutation.error?.message : updateMutation.error?.message}
      />

      <DetailModal
        open={Boolean(detailId)}
        engagement={detailQuery.data ?? null}
        loading={detailQuery.isLoading}
        onClose={() => setDetailId(null)}
        canEdit={canUpdate}
        canAssign={canAssign}
        onEdit={() => { if (detailQuery.data) { handleEdit(detailQuery.data); } }}
        onTransition={(status) => { if (detailId) { handleTransition(detailId, status); } }}
        transitioning={transitionMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Audit Engagement"
        message="Are you sure you want to delete this engagement? Only planned or cancelled engagements can be deleted."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
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
  open, engagement, loading, onClose, onEdit, onTransition, canEdit, canAssign, transitioning,
}: {
  open: boolean;
  engagement: EngagementDetailDto | null;
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onTransition: (status: EngagementStatus) => void;
  canEdit: boolean;
  canAssign: boolean;
  transitioning: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Engagement Details" size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12"><Spinner /></div>
      ) : engagement ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${statusStyles[engagement.status]}`}>{statusLabels[engagement.status]}</span>
            <span className="badge bg-neutral-100 text-neutral-700">{typeLabels[engagement.type]}</span>
            {engagement.closedAt && (
              <span className="badge bg-success-50 text-success-700"><CheckCircle2 className="h-3 w-3" />Closed {new Date(engagement.closedAt).toLocaleDateString()}</span>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-neutral-900">{engagement.title}</h3>
            <p className="mt-1 text-sm text-neutral-500">{engagement.reference}</p>
            <p className="mt-1 text-xs text-neutral-400">{engagement.auditEntityCode} — {engagement.auditEntityName}</p>
            {engagement.auditPlanReference && <p className="mt-1 text-xs text-primary-600">From audit plan: {engagement.auditPlanReference}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <DetailMetric label="Lead Auditor" value={engagement.leadAuditorName ?? '—'} />
            <DetailMetric label="Planned Start" value={engagement.startDate ? new Date(engagement.startDate).toLocaleDateString() : '—'} />
            <DetailMetric label="Planned End" value={engagement.endDate ? new Date(engagement.endDate).toLocaleDateString() : '—'} />
            <DetailMetric label="Closed By" value={engagement.closedByName ?? '—'} />
          </div>

          {engagement.riskTitle && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <div className="text-xs font-medium text-neutral-500">Linked Risk</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-900">{engagement.riskTitle}</span>
                {engagement.riskInherentLevel && <span className="badge bg-error-50 text-error-700">Inherent: {engagement.riskInherentLevel}</span>}
                {engagement.riskResidualLevel && <span className="badge bg-warning-50 text-warning-700">Residual: {engagement.riskResidualLevel}</span>}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-neutral-700">Objectives</h4>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{engagement.objectives}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-700">Scope</h4>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{engagement.scope}</p>
          </div>

          {engagement.methodology && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700">Methodology</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{engagement.methodology}</p>
            </div>
          )}

          {engagement.closureNotes && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700">Closure Notes</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{engagement.closureNotes}</p>
            </div>
          )}

          {engagement.teamMembers.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700">Team Members</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {engagement.teamMembers.map((tm) => (
                  <span key={tm.userId} className="badge bg-primary-50 text-primary-700">
                    <Users className="h-3 w-3" />
                    {tm.userName} · {tm.role.replace(/_/g, ' ').toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {canAssign && engagement.status !== 'COMPLETED' && engagement.status !== 'CANCELLED' && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <h4 className="text-sm font-semibold text-neutral-700">Workflow Actions</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {ENGAGEMENT_STATUSES.filter((s) => canTransitionEngagement(engagement.status, s)).map((s) => (
                  <Button key={s} size="sm" variant="secondary" loading={transitioning} onClick={() => onTransition(s)}>
                    {s === 'COMPLETED' && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {s === 'IN_PROGRESS' && <PlayCircle className="h-3.5 w-3.5" />}
                    {s === 'IN_REVIEW' && <ClipboardList className="h-3.5 w-3.5" />}
                    {s === 'CANCELLED' && <Trash2 className="h-3.5 w-3.5" />}
                    {s === 'ON_HOLD' && <Clock className="h-3.5 w-3.5" />}
                    Move to {statusLabels[s]}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            {canEdit && engagement.status !== 'COMPLETED' && engagement.status !== 'CANCELLED' && (
              <Button onClick={onEdit}><Edit2 className="h-4 w-4" />Edit</Button>
            )}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-neutral-500">Engagement details could not be loaded.</div>
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
