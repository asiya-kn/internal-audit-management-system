import { useState } from 'react';
import {
  FileText, Plus, Search, Edit2, Trash2, Eye, CheckCircle2, Clock,
  AlertTriangle, XCircle, RefreshCw,
} from 'lucide-react';
import {
  EVIDENCE_TYPES, EVIDENCE_REVIEW_STATUSES,
  type EvidenceType, type EvidenceReviewStatus,
  type EvidenceFilters, type EvidenceSummaryDto, type EvidenceDetailDto,
} from '@iams/shared';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  useEvidenceList, useEvidenceDetail, useEvidenceDashboard,
  useCreateEvidence, useUpdateEvidence, useDeleteEvidence, useReviewEvidence,
} from '../hooks/useEvidence';
import { useEngagementList } from '../hooks/useEngagements';
import { useControlTestList } from '../hooks/useControlTests';
import { useFindingList } from '../hooks/useFindings';
import { useActionPlanList } from '../hooks/useActionPlans';
import { useAuditUniverseList } from '../hooks/useAuditUniverse';
import { EvidenceForm } from '../components/ui/EvidenceForm';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner, PageLoading } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const reviewStatusStyles: Record<EvidenceReviewStatus, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-600',
  IN_REVIEW: 'bg-warning-50 text-warning-700',
  REVISION_REQUESTED: 'bg-error-50 text-error-700',
  ACCEPTED: 'bg-success-50 text-success-700',
  REJECTED: 'bg-error-100 text-error-800',
};

const reviewStatusLabels: Record<EvidenceReviewStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  REVISION_REQUESTED: 'Revision Requested',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

const evidenceTypeLabels: Record<EvidenceType, string> = {
  WORKING_PAPER: 'Working Paper',
  DOCUMENT: 'Document',
  EMAIL: 'Email',
  SCREENSHOT: 'Screenshot',
  DATA_FILE: 'Data File',
  REPORT: 'Report',
  INTERVIEW_NOTE: 'Interview Note',
  MEMO: 'Memo',
  OTHER: 'Other',
};

function SummaryCard({
  icon, label, value, tone,
}: {
  icon: React.ReactNode; label: string; value: number | string;
  tone: 'neutral' | 'primary' | 'success' | 'warning' | 'error';
}) {
  const tones = {
    neutral: 'bg-neutral-50 text-neutral-700',
    primary: 'bg-primary-50 text-primary-700',
    success: 'bg-success-50 text-success-700',
    warning: 'bg-warning-50 text-warning-700',
    error: 'bg-error-50 text-error-700',
  };
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
          <p className="text-xl font-bold text-neutral-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function EvidenceTrackerPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const canCreate = hasPermission('evidence.create');
  const canUpdate = hasPermission('evidence.update');
  const canReview = hasPermission('evidence.review');

  const [filters, setFilters] = useState<EvidenceFilters>({ page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' });
  const [searchInput, setSearchInput] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listQuery = useEvidenceList(filters);
  const dashboardQuery = useEvidenceDashboard();
  const detailQuery = useEvidenceDetail(detailId);
  const engagementsQuery = useEngagementList({ pageSize: 100 });
  const controlTestsQuery = useControlTestList({ pageSize: 100 });
  const findingsQuery = useFindingList({ pageSize: 100 });
  const actionPlansQuery = useActionPlanList({ pageSize: 100 });
  const auditEntitiesQuery = useAuditUniverseList({ pageSize: 100 });

  const createMutation = useCreateEvidence();
  const updateMutation = useUpdateEvidence(editingId ?? '');
  const deleteMutation = useDeleteEvidence();
  const reviewMutation = useReviewEvidence();

  const engagements = engagementsQuery.data?.items ?? [];
  const controlTests = controlTestsQuery.data?.items ?? [];
  const findings = findingsQuery.data?.items ?? [];
  const actionPlans = actionPlansQuery.data?.items ?? [];
  const auditEntities = auditEntitiesQuery.data?.items ?? [];
  const isFormLoading = formMode === 'create' ? createMutation.isPending : updateMutation.isPending;

  function applySearch() {
    setFilters((f) => ({ ...f, search: searchInput.trim() || undefined, page: 1 }));
  }

  function handleCreate() {
    setFormMode('create');
    setEditingId(null);
    setFormOpen(true);
  }

  function handleEdit(item: EvidenceSummaryDto) {
    setFormMode('edit');
    setEditingId(item.id);
    setDetailId(null);
    setFormOpen(true);
  }

  function handleSubmit(values: Parameters<typeof createMutation.mutate>[0]) {
    if (formMode === 'create') {
      createMutation.mutate(values, {
        onSuccess: () => { toast('Evidence created successfully', 'success'); setFormOpen(false); },
        onError: (e) => toast(e.message, 'error'),
      });
    } else if (editingId) {
      updateMutation.mutate(values, {
        onSuccess: () => { toast('Evidence updated successfully', 'success'); setFormOpen(false); },
        onError: (e) => toast(e.message, 'error'),
      });
    }
  }

  function handleReview(reviewStatus: EvidenceReviewStatus, reviewComments?: string) {
    if (!editingId) return;
    reviewMutation.mutate(
      { id: editingId, data: { reviewStatus, reviewComments } },
      {
        onSuccess: () => { toast(`Review status set to ${reviewStatusLabels[reviewStatus]}`, 'success'); setFormOpen(false); },
        onError: (e) => toast(e.message, 'error'),
      },
    );
  }

  function handleDeleteConfirm() {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => { toast('Evidence deleted', 'success'); setDeleteId(null); },
      onError: (e) => toast(e.message, 'error'),
    });
  }

  const dashboard = dashboardQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Evidence Tracker</h1>
          <p className="mt-1 text-sm text-neutral-500">Centralized audit evidence and working-paper management with review workflows</p>
        </div>
        {canCreate && (
          <Button onClick={handleCreate}><Plus className="h-4 w-4" />New Evidence</Button>
        )}
      </div>

      {dashboard ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard icon={<FileText className="h-5 w-5" />} label="Total Records" value={dashboard.totalEvidence} tone="neutral" />
          <SummaryCard icon={<Clock className="h-5 w-5" />} label="In Review" value={dashboard.inReviewCount} tone="warning" />
          <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Accepted" value={dashboard.acceptedCount} tone="success" />
          <SummaryCard icon={<AlertTriangle className="h-5 w-5" />} label="Pending Review" value={dashboard.pendingReviewCount} tone="error" />
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
              placeholder="Search by reference, title, description..." />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600">Type</label>
            <select className="input" value={filters.evidenceType ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, evidenceType: (v.target.value || undefined) as EvidenceType | undefined, page: 1 }))}>
              <option value="">All Types</option>
              {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{evidenceTypeLabels[t]}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600">Review Status</label>
            <select className="input" value={filters.reviewStatus ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, reviewStatus: (v.target.value || undefined) as EvidenceReviewStatus | undefined, page: 1 }))}>
              <option value="">All Statuses</option>
              {EVIDENCE_REVIEW_STATUSES.map((s) => <option key={s} value={s}>{reviewStatusLabels[s]}</option>)}
            </select>
          </div>
          <Button variant="secondary" onClick={applySearch}><Search className="h-4 w-4" />Search</Button>
        </div>
      </div>

      {listQuery.isLoading ? (
        <PageLoading />
      ) : listQuery.isError ? (
        <ErrorState message="Failed to load evidence" onRetry={() => listQuery.refetch()} />
      ) : listQuery.data && listQuery.data.items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Evidence</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Linked To</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Review Status</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Reviewer</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Collected</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {listQuery.data.items.map((item) => (
                <tr key={item.id} className="cursor-pointer hover:bg-neutral-50" onClick={() => setDetailId(item.id)}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{item.title}</div>
                    <div className="text-xs text-neutral-500">{item.reference}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-600">{evidenceTypeLabels[item.evidenceType]}</td>
                  <td className="px-4 py-3 text-xs">
                    {item.engagementReference && <div className="text-primary-600">{item.engagementReference}</div>}
                    {item.controlTestReference && <div className="text-neutral-600">{item.controlTestReference}</div>}
                    {item.findingReference && <div className="text-error-600">{item.findingReference}</div>}
                    {item.actionPlanReference && <div className="text-warning-600">{item.actionPlanReference}</div>}
                    {!item.engagementReference && !item.controlTestReference && !item.findingReference && !item.actionPlanReference && <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${reviewStatusStyles[item.reviewStatus]}`}>{reviewStatusLabels[item.reviewStatus]}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-700">{item.reviewerName ?? <span className="text-neutral-400">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-neutral-600">
                    {item.collectionDate ? new Date(item.collectionDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" onClick={() => setDetailId(item.id)} title="View"><Eye className="h-4 w-4" /></button>
                      {canUpdate && (
                        <button className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" onClick={() => handleEdit(item)} title="Edit"><Edit2 className="h-4 w-4" /></button>
                      )}
                      {canUpdate && item.reviewStatus === 'DRAFT' && (
                        <button className="rounded-md p-1.5 text-neutral-400 hover:bg-error-50 hover:text-error-600" onClick={() => setDeleteId(item.id)} title="Delete"><Trash2 className="h-4 w-4" /></button>
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
          icon={<FileText className="h-12 w-12" />}
          title="No evidence records found"
          description="Register your first evidence or working paper to start documenting audit procedures and supporting materials."
          action={canCreate ? <Button onClick={handleCreate}><Plus className="h-4 w-4" />New Evidence</Button> : undefined}
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

      <EvidenceForm
        open={formOpen}
        mode={formMode}
        initialValues={formMode === 'edit' ? detailQuery.data ?? undefined : undefined}
        engagements={engagements}
        controlTests={controlTests}
        findings={findings}
        actionPlans={actionPlans}
        auditEntities={auditEntities}
        onSubmit={handleSubmit}
        onCancel={() => setFormOpen(false)}
        loading={isFormLoading}
        serverError={formMode === 'create' ? createMutation.error?.message : updateMutation.error?.message}
        canReview={canReview}
        onReview={handleReview}
      />

      {detailId && detailQuery.data && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={() => setDetailId(null)}>
          <div className="fixed inset-0 bg-neutral-900/50" />
          <div className="relative z-10 w-full max-w-2xl rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-neutral-900">{detailQuery.data.title}</h2>
              <button className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100" onClick={() => setDetailId(null)}><XCircle className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-neutral-500">Reference:</span> <span className="font-medium">{detailQuery.data.reference}</span></div>
                <div><span className="text-neutral-500">Type:</span> <span className="font-medium">{evidenceTypeLabels[detailQuery.data.evidenceType]}</span></div>
                <div><span className="text-neutral-500">Review Status:</span> <span className={`badge ${reviewStatusStyles[detailQuery.data.reviewStatus]}`}>{reviewStatusLabels[detailQuery.data.reviewStatus]}</span></div>
                <div><span className="text-neutral-500">Collected:</span> <span>{detailQuery.data.collectionDate ? new Date(detailQuery.data.collectionDate).toLocaleDateString() : '—'}</span></div>
                <div><span className="text-neutral-500">Source:</span> <span>{detailQuery.data.source ?? '—'}</span></div>
                <div><span className="text-neutral-500">Submitter:</span> <span>{detailQuery.data.submittedByName ?? '—'}</span></div>
                <div><span className="text-neutral-500">Reviewer:</span> <span>{detailQuery.data.reviewerName ?? '—'}</span></div>
                <div><span className="text-neutral-500">Reviewed:</span> <span>{detailQuery.data.reviewedAt ? new Date(detailQuery.data.reviewedAt).toLocaleDateString() : '—'}</span></div>
              </div>
              {detailQuery.data.description && <div><span className="text-neutral-500">Description:</span><p className="mt-1 text-neutral-700">{detailQuery.data.description}</p></div>}
              {detailQuery.data.documentReference && <div><span className="text-neutral-500">Document Reference:</span> <span className="ml-2 font-mono text-xs">{detailQuery.data.documentReference}</span></div>}
              {detailQuery.data.reviewComments && <div><span className="text-neutral-500">Review Comments:</span><p className="mt-1 text-neutral-700">{detailQuery.data.reviewComments}</p></div>}
              {detailQuery.data.notes && <div><span className="text-neutral-500">Notes:</span><p className="mt-1 text-neutral-700">{detailQuery.data.notes}</p></div>}
              <div className="border-t border-neutral-200 pt-3">
                <p className="mb-2 text-xs font-medium text-neutral-500">Linked Records</p>
                <div className="space-y-1 text-xs">
                  {detailQuery.data.engagementReference && <div className="text-primary-600">Engagement: {detailQuery.data.engagementReference}</div>}
                  {detailQuery.data.controlTestReference && <div className="text-neutral-600">Control Test: {detailQuery.data.controlTestReference}</div>}
                  {detailQuery.data.findingReference && <div className="text-error-600">Finding: {detailQuery.data.findingReference}</div>}
                  {detailQuery.data.actionPlanReference && <div className="text-warning-600">Action Plan: {detailQuery.data.actionPlanReference}</div>}
                  {detailQuery.data.auditEntityName && <div className="text-neutral-600">Entity: {detailQuery.data.auditEntityCode} — {detailQuery.data.auditEntityName}</div>}
                  {!detailQuery.data.engagementReference && !detailQuery.data.controlTestReference && !detailQuery.data.findingReference && !detailQuery.data.actionPlanReference && !detailQuery.data.auditEntityName && <span className="text-neutral-400">No linked records</span>}
                </div>
              </div>
            </div>
            {canUpdate && (
              <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-3">
                <Button variant="secondary" onClick={() => { handleEdit(detailQuery.data); }}>
                  <Edit2 className="h-4 w-4" />Edit
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Evidence"
        message="Are you sure you want to delete this evidence record? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
