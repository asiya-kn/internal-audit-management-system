import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import {
  EVIDENCE_TYPES, EVIDENCE_REVIEW_STATUSES,
  type EvidenceType, type EvidenceReviewStatus,
  type EvidenceDetailDto, type CreateEvidenceRequest,
  type EngagementSummaryDto, type ControlTestSummaryDto,
  type FindingSummaryDto, type ActionPlanSummaryDto,
  type AuditUniverseSummaryDto,
} from '@iams/shared';

interface EvidenceFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: EvidenceDetailDto | null;
  engagements: EngagementSummaryDto[];
  controlTests: ControlTestSummaryDto[];
  findings: FindingSummaryDto[];
  actionPlans: ActionPlanSummaryDto[];
  auditEntities: AuditUniverseSummaryDto[];
  onSubmit: (values: CreateEvidenceRequest) => void;
  onCancel: () => void;
  loading?: boolean;
  serverError?: string | null;
  canReview?: boolean;
  onReview?: (reviewStatus: EvidenceReviewStatus, reviewComments?: string) => void;
}

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

const reviewStatusLabels: Record<EvidenceReviewStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  REVISION_REQUESTED: 'Revision Requested',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

export function EvidenceForm({
  open, mode, initialValues, engagements, controlTests, findings,
  actionPlans, auditEntities, onSubmit, onCancel, loading, serverError,
  canReview, onReview,
}: EvidenceFormProps) {
  const [form, setForm] = useState<CreateEvidenceRequest>({
    reference: '', title: '', evidenceType: 'WORKING_PAPER',
  });
  const [reviewStatus, setReviewStatus] = useState<EvidenceReviewStatus>('ACCEPTED');
  const [reviewComments, setReviewComments] = useState('');

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialValues) {
        setForm({
          reference: initialValues.reference,
          title: initialValues.title,
          description: initialValues.description ?? undefined,
          evidenceType: initialValues.evidenceType,
          source: initialValues.source ?? undefined,
          engagementId: initialValues.engagementId,
          controlTestId: initialValues.controlTestId,
          findingId: initialValues.findingId,
          actionPlanId: initialValues.actionPlanId,
          auditEntityId: initialValues.auditEntityId,
          collectionDate: initialValues.collectionDate?.split('T')[0] ?? null,
          submittedById: initialValues.submittedById,
          reviewerId: initialValues.reviewerId,
          documentReference: initialValues.documentReference ?? undefined,
          notes: initialValues.notes ?? undefined,
        });
      } else {
        setForm({ reference: '', title: '', evidenceType: 'WORKING_PAPER' });
      }
      setReviewComments('');
    }
  }, [open, mode, initialValues]);

  function update<K extends keyof CreateEvidenceRequest>(key: K, value: CreateEvidenceRequest[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  function handleReview(e: React.FormEvent) {
    e.preventDefault();
    onReview?.(reviewStatus, reviewComments || undefined);
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={mode === 'create' ? 'New Evidence / Working Paper' : 'Edit Evidence / Working Paper'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">{serverError}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Reference *"
            name="reference"
            value={form.reference}
            onChange={(e) => update('reference', e.target.value)}
            disabled={mode === 'edit'}
            placeholder="e.g. EV-2026-001"
          />
          <Input
            label="Title *"
            name="title"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Evidence title"
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[80px]"
            value={form.description ?? ''}
            onChange={(e) => update('description', e.target.value || undefined)}
            placeholder="Describe the evidence or working paper..."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="label">Evidence Type</label>
            <select
              className="input"
              value={form.evidenceType ?? 'WORKING_PAPER'}
              onChange={(e) => update('evidenceType', e.target.value as EvidenceType)}
            >
              {EVIDENCE_TYPES.map((t) => (
                <option key={t} value={t}>{evidenceTypeLabels[t]}</option>
              ))}
            </select>
          </div>
          <Input
            label="Source"
            name="source"
            value={form.source ?? ''}
            onChange={(e) => update('source', e.target.value || undefined)}
            placeholder="Where evidence was obtained"
          />
          <Input
            label="Collection Date"
            name="collectionDate"
            type="date"
            value={form.collectionDate ?? ''}
            onChange={(e) => update('collectionDate', e.target.value || null)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="label">Linked Engagement</label>
            <select
              className="input"
              value={form.engagementId ?? ''}
              onChange={(e) => update('engagementId', e.target.value || null)}
            >
              <option value="">—</option>
              {engagements.map((e) => (
                <option key={e.id} value={e.id}>{e.reference} — {e.title}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">Linked Control Test</label>
            <select
              className="input"
              value={form.controlTestId ?? ''}
              onChange={(e) => update('controlTestId', e.target.value || null)}
            >
              <option value="">—</option>
              {controlTests.map((c) => (
                <option key={c.id} value={c.id}>{c.reference} — {c.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="label">Linked Finding</label>
            <select
              className="input"
              value={form.findingId ?? ''}
              onChange={(e) => update('findingId', e.target.value || null)}
            >
              <option value="">—</option>
              {findings.map((f) => (
                <option key={f.id} value={f.id}>{f.reference} — {f.title}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">Linked Action Plan</label>
            <select
              className="input"
              value={form.actionPlanId ?? ''}
              onChange={(e) => update('actionPlanId', e.target.value || null)}
            >
              <option value="">—</option>
              {actionPlans.map((a) => (
                <option key={a.id} value={a.id}>{a.reference} — {a.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="label">Audit Entity</label>
          <select
            className="input"
            value={form.auditEntityId ?? ''}
            onChange={(e) => update('auditEntityId', e.target.value || null)}
          >
            <option value="">—</option>
            {auditEntities.map((a) => (
              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
            ))}
          </select>
        </div>

        <Input
          label="Document Reference"
          name="documentReference"
          value={form.documentReference ?? ''}
          onChange={(e) => update('documentReference', e.target.value || undefined)}
          placeholder="File path, document ID, or external reference"
        />

        <div>
          <label className="label">Notes</label>
          <textarea
            className="input min-h-[60px]"
            value={form.notes ?? ''}
            onChange={(e) => update('notes', e.target.value || undefined)}
            placeholder="Additional notes..."
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
          <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
          <Button type="submit" loading={loading}>
            {mode === 'create' ? 'Create' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {mode === 'edit' && canReview && initialValues && (
        <form onSubmit={handleReview} className="mt-6 space-y-4 border-t border-neutral-200 pt-4">
          <h3 className="text-sm font-semibold text-neutral-700">Review Working Paper</h3>
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            Current status: <span className="font-medium">{reviewStatusLabels[initialValues.reviewStatus]}</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">Review Decision</label>
            <select
              className="input"
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as EvidenceReviewStatus)}
            >
              {EVIDENCE_REVIEW_STATUSES.map((s) => (
                <option key={s} value={s}>{reviewStatusLabels[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Review Comments</label>
            <textarea
              className="input min-h-[60px]"
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              placeholder="Reviewer comments..."
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" loading={loading}>Submit Review</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
