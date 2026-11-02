import { useState } from 'react';
import {
  SlidersHorizontal, Plus, Search, Edit2, Trash2, Eye,
  AlertTriangle, CheckCircle2, Clock, FileWarning, Link2, Unlink, ClipboardCheck,
} from 'lucide-react';
import {
  CONTROL_TEST_STATUSES, CONTROL_TEST_OUTCOMES,
  canTransitionControlTest,
  type ControlTestFilters, type ControlTestSummaryDto, type ControlTestDetailDto,
  type ControlTestStatus, type ControlTestOutcome,
  type RecordControlTestResultRequest,
} from '@iams/shared';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  useControlTestList, useControlTestDetail, useControlTestDashboard,
  useCreateControlTest, useUpdateControlTest, useDeleteControlTest,
  useTransitionControlTest, useRecordControlTestResult, useReviewControlTest,
  useLinkControlTestFinding, useUnlinkControlTestFinding,
} from '../hooks/useControlTests';
import { useAuditUniverseList } from '../hooks/useAuditUniverse';
import { useEngagementList } from '../hooks/useEngagements';
import { useRiskList } from '../hooks/useRisks';
import { useFindingList } from '../hooks/useFindings';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Spinner, PageLoading } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ControlTestForm } from '../components/ui/ControlTestForm';
import { ChevronDown } from 'lucide-react';

const statusStyles: Record<ControlTestStatus, string> = {
  PLANNED: 'bg-neutral-100 text-neutral-700',
  IN_PROGRESS: 'bg-primary-50 text-primary-700',
  TESTED: 'bg-warning-50 text-warning-700',
  REVIEWED: 'bg-success-100 text-success-800',
  EXCEPTION: 'bg-error-50 text-error-700',
  CANCELLED: 'bg-neutral-100 text-neutral-400',
};

const statusLabels: Record<ControlTestStatus, string> = {
  PLANNED: 'Planned', IN_PROGRESS: 'In Progress', TESTED: 'Tested',
  REVIEWED: 'Reviewed', EXCEPTION: 'Exception', CANCELLED: 'Cancelled',
};

const outcomeStyles: Record<ControlTestOutcome, string> = {
  PASS: 'bg-success-50 text-success-700',
  FAIL: 'bg-error-50 text-error-700',
  PASS_WITH_EXCEPTION: 'bg-warning-50 text-warning-700',
  NOT_APPLICABLE: 'bg-neutral-100 text-neutral-500',
  INCONCLUSIVE: 'bg-neutral-100 text-neutral-600',
};

const outcomeLabels: Record<ControlTestOutcome, string> = {
  PASS: 'Pass', FAIL: 'Fail', PASS_WITH_EXCEPTION: 'Pass w/ Exception',
  NOT_APPLICABLE: 'N/A', INCONCLUSIVE: 'Inconclusive',
};

export function ControlTestingPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const canCreate = hasPermission('control_testing.create');
  const canUpdate = hasPermission('control_testing.update');
  const canReview = hasPermission('control_testing.review');

  const [filters, setFilters] = useState<ControlTestFilters>({ page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' });
  const [searchInput, setSearchInput] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [transitionState, setTransitionState] = useState<{ id: string; status: ControlTestStatus } | null>(null);
  const [resultState, setResultState] = useState<{ id: string } | null>(null);
  const [reviewState, setReviewState] = useState<{ id: string } | null>(null);
  const [linkState, setLinkState] = useState<{ id: string } | null>(null);

  const listQuery = useControlTestList(filters);
  const dashboardQuery = useControlTestDashboard();
  const detailQuery = useControlTestDetail(detailId);
  const auditEntitiesQuery = useAuditUniverseList({ pageSize: 100 });
  const engagementsQuery = useEngagementList({ pageSize: 100 });
  const risksQuery = useRiskList({ pageSize: 100 });
  const findingsQuery = useFindingList({ pageSize: 100 });
  const createMutation = useCreateControlTest();
  const updateMutation = useUpdateControlTest(editingId ?? '');
  const deleteMutation = useDeleteControlTest();
  const transitionMutation = useTransitionControlTest();
  const resultMutation = useRecordControlTestResult();
  const reviewMutation = useReviewControlTest();
  const linkMutation = useLinkControlTestFinding();
  const unlinkMutation = useUnlinkControlTestFinding();

  const auditEntities = auditEntitiesQuery.data?.items ?? [];
  const engagements = engagementsQuery.data?.items ?? [];
  const risks = risksQuery.data?.items ?? [];
  const findings = findingsQuery.data?.items ?? [];
  const isFormLoading = formMode === 'create' ? createMutation.isPending : updateMutation.isPending;

  function applySearch() {
    setFilters((f) => ({ ...f, search: searchInput.trim() || undefined, page: 1 }));
  }

  function handleCreate() {
    setFormMode('create');
    setEditingId(null);
    setFormOpen(true);
  }

  function handleEdit(test: ControlTestSummaryDto) {
    setFormMode('edit');
    setEditingId(test.id);
    setDetailId(null);
    setFormOpen(true);
  }

  function handleSubmit(values: Parameters<typeof createMutation.mutate>[0]) {
    if (formMode === 'create') {
      createMutation.mutate(values, {
        onSuccess: () => { toast('Control test created successfully', 'success'); setFormOpen(false); },
        onError: (e) => toast(e.message, 'error'),
      });
    } else if (editingId) {
      updateMutation.mutate(values, {
        onSuccess: () => { toast('Control test updated successfully', 'success'); setFormOpen(false); },
        onError: (e) => toast(e.message, 'error'),
      });
    }
  }

  function handleDeleteConfirm() {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => { toast('Control test deleted', 'success'); setDeleteId(null); },
      onError: (e) => toast(e.message, 'error'),
    });
  }

  function handleTransitionConfirm() {
    if (!transitionState) return;
    transitionMutation.mutate(
      { id: transitionState.id, status: transitionState.status },
      {
        onSuccess: () => {
          toast(`Status changed to ${statusLabels[transitionState.status]}`, 'success');
          setTransitionState(null);
        },
        onError: (e) => toast(e.message, 'error'),
      },
    );
  }

  const dashboard = dashboardQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Control Testing</h1>
          <p className="mt-1 text-sm text-neutral-500">Plan, execute, and review control tests linked to engagements, risks, and findings</p>
        </div>
        {canCreate && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            New Control Test
          </Button>
        )}
      </div>

      {dashboard ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard icon={<SlidersHorizontal className="h-5 w-5" />} label="Total Tests" value={dashboard.totalTests} tone="neutral" />
          <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Passed" value={dashboard.passCount} tone="success" />
          <SummaryCard icon={<AlertTriangle className="h-5 w-5" />} label="Failed / Exceptions" value={dashboard.failCount + dashboard.exceptionCount} tone="error" />
          <SummaryCard icon={<Clock className="h-5 w-5" />} label="Pending Review" value={dashboard.pendingReviewCount} tone="primary" />
        </div>
      ) : dashboardQuery.isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : null}

      {dashboard && dashboard.totalTests > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-800">Outcome Distribution</h3>
          <div className="mt-4 space-y-2">
            {CONTROL_TEST_OUTCOMES.filter((o) => dashboard.byOutcome[o] > 0).map((o) => {
              const count = dashboard.byOutcome[o];
              const pct = dashboard.totalTests > 0 ? (count / dashboard.totalTests) * 100 : 0;
              return (
                <div key={o} className="flex items-center gap-2">
                  <span className="w-28 text-xs font-medium text-neutral-600">{outcomeLabels[o]}</span>
                  <div className="flex-1 h-5 rounded bg-neutral-100 overflow-hidden">
                    <div className={`h-full ${outcomeStyles[o].split(' ')[0]}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-neutral-700">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input label="Search" name="search" value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
              placeholder="Search by reference, title, control ref, entity…" />
          </div>
          <FilterSelect label="Status" value={filters.status ?? ''}
            onChange={(v) => setFilters((f) => ({ ...f, status: (v || undefined) as ControlTestStatus | undefined, page: 1 }))}
            options={CONTROL_TEST_STATUSES} labels={statusLabels} />
          <FilterSelect label="Outcome" value={filters.outcome ?? ''}
            onChange={(v) => setFilters((f) => ({ ...f, outcome: (v || undefined) as ControlTestOutcome | undefined, page: 1 }))}
            options={CONTROL_TEST_OUTCOMES} labels={outcomeLabels} />
          <Button variant="secondary" onClick={applySearch}><Search className="h-4 w-4" />Search</Button>
        </div>
      </div>

      {listQuery.isLoading ? (
        <PageLoading />
      ) : listQuery.isError ? (
        <ErrorState message="Failed to load control tests" onRetry={() => listQuery.refetch()} />
      ) : listQuery.data && listQuery.data.items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Control Test</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Entity / Engagement</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Outcome</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Tester</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Tested Date</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700">Finding</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {listQuery.data.items.map((test) => (
                <tr key={test.id} className="cursor-pointer hover:bg-neutral-50" onClick={() => setDetailId(test.id)}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{test.title}</div>
                    <div className="text-xs text-neutral-500">{test.reference}{test.controlReference ? ` · ${test.controlReference}` : ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    {test.auditEntityCode ? (
                      <div>
                        <div className="text-xs font-medium text-neutral-700">{test.auditEntityCode}</div>
                        <div className="text-xs text-neutral-500">{test.auditEntityName}</div>
                        {test.engagementReference && <div className="text-xs text-primary-600">{test.engagementReference}</div>}
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusStyles[test.status]}`}>{statusLabels[test.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    {test.outcome ? (
                      <span className={`badge ${outcomeStyles[test.outcome]}`}>{outcomeLabels[test.outcome]}</span>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-700">
                    {test.testerName ?? <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-600">
                    {test.testedAt ? new Date(test.testedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-600">
                    {test.findingReference ? (
                      <span className="badge bg-error-50 text-error-700"><Link2 className="h-3 w-3" />{test.findingReference}</span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" onClick={() => setDetailId(test.id)} title="View"><Eye className="h-4 w-4" /></button>
                      {canUpdate && (
                        <button className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" onClick={() => handleEdit(test)} title="Edit"><Edit2 className="h-4 w-4" /></button>
                      )}
                      {canUpdate && (test.status === 'PLANNED' || test.status === 'CANCELLED') && (
                        <button className="rounded-md p-1.5 text-neutral-400 hover:bg-error-50 hover:text-error-600" onClick={() => setDeleteId(test.id)} title="Delete"><Trash2 className="h-4 w-4" /></button>
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
          icon={<SlidersHorizontal className="h-12 w-12" />}
          title="No control tests found"
          description="Create your first control test to start documenting test objectives, procedures, and results."
          action={canCreate ? <Button onClick={handleCreate}><Plus className="h-4 w-4" />New Control Test</Button> : undefined}
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

      <ControlTestForm
        open={formOpen}
        mode={formMode}
        initialValues={formMode === 'edit' ? detailQuery.data ?? undefined : undefined}
        auditEntities={auditEntities}
        engagements={engagements}
        risks={risks}
        onSubmit={handleSubmit}
        onCancel={() => setFormOpen(false)}
        loading={isFormLoading}
        serverError={formMode === 'create' ? createMutation.error?.message : updateMutation.error?.message}
      />

      <DetailModal
        open={Boolean(detailId)}
        test={detailQuery.data ?? null}
        loading={detailQuery.isLoading}
        onClose={() => setDetailId(null)}
        canEdit={canUpdate}
        canReview={canReview}
        onEdit={() => { if (detailQuery.data) { handleEdit(detailQuery.data); } }}
        onTransition={(status) => {
          setDetailId(null);
          setTransitionState({ id: detailId ?? '', status });
        }}
        onRecordResult={() => {
          setDetailId(null);
          setResultState({ id: detailId ?? '' });
        }}
        onReview={() => {
          setDetailId(null);
          setReviewState({ id: detailId ?? '' });
        }}
        onLinkFinding={() => {
          setDetailId(null);
          setLinkState({ id: detailId ?? '' });
        }}
        onUnlinkFinding={(id) => {
          unlinkMutation.mutate(id, {
            onSuccess: () => toast('Finding unlinked', 'success'),
            onError: (e) => toast(e.message, 'error'),
          });
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Control Test"
        message="Are you sure you want to delete this control test? Only planned or cancelled tests can be deleted."
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

      <RecordResultDialog
        open={Boolean(resultState)}
        loading={resultMutation.isPending}
        onConfirm={(data) => {
          if (!resultState) return;
          resultMutation.mutate(
            { id: resultState.id, data },
            {
              onSuccess: () => { toast('Test result recorded', 'success'); setResultState(null); },
              onError: (e) => toast(e.message, 'error'),
            },
          );
        }}
        onCancel={() => setResultState(null)}
      />

      <ReviewDialog
        open={Boolean(reviewState)}
        loading={reviewMutation.isPending}
        onConfirm={(notes) => {
          if (!reviewState) return;
          reviewMutation.mutate(
            { id: reviewState.id, data: { reviewerNotes: notes.trim() || undefined } },
            {
              onSuccess: () => { toast('Control test reviewed', 'success'); setReviewState(null); },
              onError: (e) => toast(e.message, 'error'),
            },
          );
        }}
        onCancel={() => setReviewState(null)}
      />

      <LinkFindingDialog
        open={Boolean(linkState)}
        findings={findings}
        loading={linkMutation.isPending}
        onConfirm={(findingId) => {
          if (!linkState) return;
          linkMutation.mutate(
            { id: linkState.id, findingId },
            {
              onSuccess: () => { toast('Finding linked to control test', 'success'); setLinkState(null); },
              onError: (e) => toast(e.message, 'error'),
            },
          );
        }}
        onCancel={() => setLinkState(null)}
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
  open, test, loading, onClose, onEdit, onTransition, onRecordResult, onReview, canEdit, canReview, onLinkFinding, onUnlinkFinding,
}: {
  open: boolean;
  test: ControlTestDetailDto | null;
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onTransition: (status: ControlTestStatus) => void;
  onRecordResult: () => void;
  onReview: () => void;
  canEdit: boolean;
  canReview: boolean;
  onLinkFinding: () => void;
  onUnlinkFinding: (id: string) => void;
}) {
  if (!test) return null;
  return (
    <Modal open={open} onClose={onClose} title="Control Test Details" size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12"><Spinner /></div>
      ) : test ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${statusStyles[test.status]}`}>{statusLabels[test.status]}</span>
            {test.outcome && <span className={`badge ${outcomeStyles[test.outcome]}`}>Outcome: {outcomeLabels[test.outcome]}</span>}
            {test.findingReference && <span className="badge bg-error-50 text-error-700"><Link2 className="h-3 w-3" />{test.findingReference}</span>}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-neutral-900">{test.title}</h3>
            <p className="mt-1 text-sm text-neutral-500">{test.reference}{test.controlReference ? ` · Control Ref: ${test.controlReference}` : ''}</p>
            {test.auditEntityCode && <p className="mt-1 text-xs text-neutral-400">{test.auditEntityCode} — {test.auditEntityName}</p>}
            {test.engagementReference && <p className="mt-1 text-xs text-primary-600">Engagement: {test.engagementReference}</p>}
            {test.riskTitle && <p className="mt-1 text-xs text-warning-600">Risk: {test.riskTitle}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <DetailMetric label="Tester" value={test.testerName ?? '—'} />
            <DetailMetric label="Reviewed By" value={test.reviewerName ?? '—'} />
            <DetailMetric label="Tested Date" value={test.testedAt ? new Date(test.testedAt).toLocaleDateString() : '—'} />
            <DetailMetric label="Reviewed Date" value={test.reviewedAt ? new Date(test.reviewedAt).toLocaleDateString() : '—'} />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-700">Objective</h4>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{test.objective}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-700">Procedures</h4>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{test.procedures}</p>
          </div>

          {test.criteria && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700">Criteria</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{test.criteria}</p>
            </div>
          )}

          {(test.sampleDescription || test.sampleSize != null) && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700">Sample Details</h4>
              {test.sampleSize != null && <p className="mt-1 text-sm text-neutral-600">Sample size: <span className="font-medium">{test.sampleSize}</span></p>}
              {test.sampleDescription && <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{test.sampleDescription}</p>}
            </div>
          )}

          {test.expectedResult && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700">Expected Result</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{test.expectedResult}</p>
            </div>
          )}

          {test.actualResult && (
            <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
              <h4 className="text-sm font-semibold text-primary-800">Actual Result</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{test.actualResult}</p>
            </div>
          )}

          {test.exceptions && (
            <div className="rounded-lg border border-error-200 bg-error-50 p-3">
              <h4 className="text-sm font-semibold text-error-800">Exceptions</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{test.exceptions}</p>
            </div>
          )}

          {test.conclusion && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700">Conclusion</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{test.conclusion}</p>
            </div>
          )}

          {test.evidenceReference && (
            <DetailMetric label="Evidence Reference" value={test.evidenceReference} />
          )}

          {test.testerNotes && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700">Tester Notes</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{test.testerNotes}</p>
            </div>
          )}

          {test.reviewerNotes && (
            <div className="rounded-lg border border-success-200 bg-success-50 p-3">
              <h4 className="text-sm font-semibold text-success-800">Reviewer Notes</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{test.reviewerNotes}</p>
            </div>
          )}

          {canEdit && test.status !== 'REVIEWED' && test.status !== 'CANCELLED' && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <h4 className="text-sm font-semibold text-neutral-700">Actions</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {(test.status === 'IN_PROGRESS' || test.status === 'TESTED' || test.status === 'EXCEPTION') && (
                  <Button size="sm" variant="secondary" onClick={onRecordResult}>
                    <FileWarning className="h-3.5 w-3.5" />Record Results
                  </Button>
                )}
                {canReview && (test.status === 'TESTED' || test.status === 'EXCEPTION') && (
                  <Button size="sm" variant="secondary" onClick={onReview}>
                    <ClipboardCheck className="h-3.5 w-3.5" />Review
                  </Button>
                )}
                {test.findingId ? (
                  <Button size="sm" variant="secondary" onClick={() => onUnlinkFinding(test.id)}>
                    <Unlink className="h-3.5 w-3.5" />Unlink Finding
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={onLinkFinding}>
                    <Link2 className="h-3.5 w-3.5" />Link Finding
                  </Button>
                )}
                {CONTROL_TEST_STATUSES.filter((s) => canTransitionControlTest(test.status, s)).map((s) => (
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
            {canEdit && test.status !== 'REVIEWED' && test.status !== 'CANCELLED' && (
              <Button onClick={onEdit}><Edit2 className="h-4 w-4" />Edit</Button>
            )}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-neutral-500">Control test details could not be loaded.</div>
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

function RecordResultDialog({
  open, loading, onConfirm, onCancel,
}: {
  open: boolean;
  loading?: boolean;
  onConfirm: (data: RecordControlTestResultRequest) => void;
  onCancel: () => void;
}) {
  const [actualResult, setActualResult] = useState('');
  const [outcome, setOutcome] = useState<ControlTestOutcome>('PASS');
  const [exceptions, setExceptions] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [testerNotes, setTesterNotes] = useState('');

  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setActualResult(''); setOutcome('PASS'); setExceptions('');
      setConclusion(''); setEvidenceReference(''); setTesterNotes('');
    }
  }

  function handleSubmit() {
    if (!actualResult.trim()) return;
    onConfirm({
      actualResult: actualResult.trim(),
      outcome,
      exceptions: exceptions.trim() || undefined,
      conclusion: conclusion.trim() || undefined,
      evidenceReference: evidenceReference.trim() || undefined,
      testerNotes: testerNotes.trim() || undefined,
    });
  }

  return (
    <Modal open={open} onClose={onCancel} title="Record Test Results">
      <div className="space-y-4">
        <div>
          <label htmlFor="result-outcome" className="label">Outcome</label>
          <div className="relative">
            <select id="result-outcome" className="input appearance-none pr-9" value={outcome} onChange={(e) => setOutcome(e.target.value as ControlTestOutcome)}>
              {CONTROL_TEST_OUTCOMES.map((o) => <option key={o} value={o}>{outcomeLabels[o]}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>
        <div>
          <label htmlFor="result-actual" className="label">Actual Result</label>
          <textarea id="result-actual" className="input min-h-[100px]" value={actualResult} onChange={(e) => setActualResult(e.target.value)} maxLength={10000} placeholder="What was actually observed during testing..." />
        </div>
        <div>
          <label htmlFor="result-exceptions" className="label">Exceptions (optional)</label>
          <textarea id="result-exceptions" className="input min-h-[60px]" value={exceptions} onChange={(e) => setExceptions(e.target.value)} maxLength={10000} placeholder="Describe any exceptions found..." />
        </div>
        <div>
          <label htmlFor="result-conclusion" className="label">Conclusion (optional)</label>
          <textarea id="result-conclusion" className="input min-h-[60px]" value={conclusion} onChange={(e) => setConclusion(e.target.value)} maxLength={10000} />
        </div>
        <div>
          <label htmlFor="result-evidence" className="label">Evidence Reference (optional)</label>
          <Input name="evidenceReference" value={evidenceReference} onChange={(e) => setEvidenceReference(e.target.value)} placeholder="e.g. EVD-2026-001" />
        </div>
        <div>
          <label htmlFor="result-notes" className="label">Tester Notes (optional)</label>
          <textarea id="result-notes" className="input min-h-[60px]" value={testerNotes} onChange={(e) => setTesterNotes(e.target.value)} maxLength={10000} />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} disabled={!actualResult.trim()}>Save Results</Button>
        </div>
      </div>
    </Modal>
  );
}

function ReviewDialog({
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
    <Modal open={open} onClose={onCancel} title="Review Control Test">
      <div className="space-y-4">
        <div>
          <label htmlFor="review-notes" className="label">Reviewer Notes (optional)</label>
          <textarea id="review-notes" className="input min-h-[100px]" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={10000} placeholder="Add review comments..." />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onConfirm(notes)} loading={loading}>Confirm Review</Button>
        </div>
      </div>
    </Modal>
  );
}

function LinkFindingDialog({
  open, findings, loading, onConfirm, onCancel,
}: {
  open: boolean;
  findings: ControlTestSummaryDto[] | { id: string; reference: string; title: string }[];
  loading?: boolean;
  onConfirm: (findingId: string) => void;
  onCancel: () => void;
}) {
  const [findingId, setFindingId] = useState('');

  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setFindingId('');
  }

  const typedFindings = findings as { id: string; reference: string; title: string }[];

  return (
    <Modal open={open} onClose={onCancel} title="Link to Audit Finding">
      <div className="space-y-4">
        <div>
          <label htmlFor="link-finding" className="label">Select Finding</label>
          <div className="relative">
            <select id="link-finding" className="input appearance-none pr-9" value={findingId} onChange={(e) => setFindingId(e.target.value)} disabled={typedFindings.length === 0}>
              <option value="">{typedFindings.length === 0 ? 'No findings available' : 'Select a finding…'}</option>
              {typedFindings.map((f) => <option key={f.id} value={f.id}>{f.reference} — {f.title}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => findingId && onConfirm(findingId)} loading={loading} disabled={!findingId}>Link Finding</Button>
        </div>
      </div>
    </Modal>
  );
}
