import { useState, type FormEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import {
  ACTION_PLAN_PRIORITIES,
  type ActionPlanDetailDto,
  type ActionPlanPriority,
  type CreateActionPlanRequest,
  type AuditUniverseSummaryDto,
  type EngagementSummaryDto,
  type FindingSummaryDto,
  type ControlTestSummaryDto,
} from '@iams/shared';

interface ActionPlanFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: Partial<ActionPlanDetailDto>;
  auditEntities: AuditUniverseSummaryDto[];
  engagements: EngagementSummaryDto[];
  findings: FindingSummaryDto[];
  controlTests: ControlTestSummaryDto[];
  onSubmit: (values: CreateActionPlanRequest) => void;
  onCancel: () => void;
  loading?: boolean;
  serverError?: string;
}

interface FormState {
  reference: string;
  title: string;
  description: string;
  findingId: string;
  controlTestId: string;
  engagementId: string;
  auditEntityId: string;
  responsibleOwnerId: string;
  reviewerId: string;
  priority: ActionPlanPriority;
  targetDate: string;
  managementJustification: string;
  proposedRectification: string;
}

function buildInitial(values: Partial<ActionPlanDetailDto> | undefined): FormState {
  return {
    reference: values?.reference ?? '',
    title: values?.title ?? '',
    description: values?.description ?? '',
    findingId: values?.findingId ?? '',
    controlTestId: values?.controlTestId ?? '',
    engagementId: values?.engagementId ?? '',
    auditEntityId: values?.auditEntityId ?? '',
    responsibleOwnerId: values?.responsibleOwnerId ?? '',
    reviewerId: values?.reviewerId ?? '',
    priority: values?.priority ?? 'MEDIUM',
    targetDate: values?.targetDate ? values.targetDate.slice(0, 10) : '',
    managementJustification: values?.managementJustification ?? '',
    proposedRectification: values?.proposedRectification ?? '',
  };
}

const priorityLabels: Record<ActionPlanPriority, string> = {
  CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low',
};

export function ActionPlanForm({
  open, mode, initialValues, auditEntities, engagements, findings, controlTests,
  onSubmit, onCancel, loading, serverError,
}: ActionPlanFormProps) {
  const [state, setState] = useState<FormState>(() => buildInitial(initialValues));
  const [lastOpen, setLastOpen] = useState(open);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setState(buildInitial(initialValues));
  }

  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!state.reference.trim()) errors.reference = 'Reference is required';
  else if (!/^[A-Za-z0-9\-_.]+$/.test(state.reference.trim())) errors.reference = 'Only letters, numbers, dashes, underscores and dots';
  if (!state.title.trim()) errors.title = 'Title is required';
  if (!state.description.trim()) errors.description = 'Description is required';

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  const filteredEngagements = state.auditEntityId
    ? engagements.filter((engagement) => engagement.auditEntityId === state.auditEntityId)
    : engagements;
  const filteredFindings = state.auditEntityId
    ? findings.filter((finding) => finding.auditEntityId === state.auditEntityId)
    : findings;
  const filteredControlTests = state.auditEntityId
    ? controlTests.filter((test) => test.auditEntityId === state.auditEntityId)
    : controlTests;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      reference: state.reference.trim(),
      title: state.title.trim(),
      description: state.description.trim(),
      findingId: state.findingId || null,
      controlTestId: state.controlTestId || null,
      engagementId: state.engagementId || null,
      auditEntityId: state.auditEntityId || null,
      responsibleOwnerId: state.responsibleOwnerId || null,
      reviewerId: state.reviewerId || null,
      priority: state.priority,
      targetDate: state.targetDate ? new Date(`${state.targetDate}T23:59:59.000Z`).toISOString() : null,
      managementJustification: state.managementJustification.trim() || undefined,
      proposedRectification: state.proposedRectification.trim() || undefined,
    });
  }

  return (
    <Modal open={open} onClose={onCancel} title={mode === 'create' ? 'Create Action Plan' : 'Edit Action Plan'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Reference" name="reference" value={state.reference} onChange={(event) => update('reference', event.target.value)} error={errors.reference} placeholder="e.g. AP-2026-001" required disabled={mode === 'edit'} />
          <div>
            <label htmlFor="action-plan-priority" className="label">Priority</label>
            <div className="relative">
              <select id="action-plan-priority" className="input appearance-none pr-9" value={state.priority} onChange={(event) => update('priority', event.target.value as ActionPlanPriority)}>
                {ACTION_PLAN_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
        </div>

        <Input label="Action Title" name="title" value={state.title} onChange={(event) => update('title', event.target.value)} error={errors.title} placeholder="e.g. Implement quarterly access review" required />

        <div>
          <label htmlFor="action-plan-description" className="label">Agreed Corrective Action</label>
          <textarea id="action-plan-description" className={`input min-h-[90px] ${errors.description ? 'border-error-500' : ''}`} value={state.description} onChange={(event) => update('description', event.target.value)} maxLength={10000} placeholder="Describe the corrective work that management agreed to complete..." required />
          {errors.description && <p className="mt-1 text-xs text-error-600">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="action-plan-entity" className="label">Audit Entity</label>
            <div className="relative">
              <select id="action-plan-entity" className="input appearance-none pr-9" value={state.auditEntityId} onChange={(event) => { update('auditEntityId', event.target.value); update('engagementId', ''); update('findingId', ''); update('controlTestId', ''); }}>
                <option value="">None</option>
                {auditEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.code} — {entity.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
          <Input label="Responsible Owner (User UUID)" name="responsibleOwnerId" value={state.responsibleOwnerId} onChange={(event) => update('responsibleOwnerId', event.target.value)} placeholder="User UUID" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField id="action-plan-finding" label="Audit Finding" value={state.findingId} onChange={(value) => update('findingId', value)} disabled={!filteredFindings.length} emptyLabel={filteredFindings.length ? 'None' : 'No findings available'}>
            {filteredFindings.map((finding) => <option key={finding.id} value={finding.id}>{finding.reference} — {finding.title}</option>)}
          </SelectField>
          <SelectField id="action-plan-control-test" label="Control Test" value={state.controlTestId} onChange={(value) => update('controlTestId', value)} disabled={!filteredControlTests.length} emptyLabel={filteredControlTests.length ? 'None' : 'No control tests available'}>
            {filteredControlTests.map((test) => <option key={test.id} value={test.id}>{test.reference} — {test.title}</option>)}
          </SelectField>
          <SelectField id="action-plan-engagement" label="Engagement" value={state.engagementId} onChange={(value) => update('engagementId', value)} disabled={!filteredEngagements.length} emptyLabel={filteredEngagements.length ? 'None' : 'No engagements available'}>
            {filteredEngagements.map((engagement) => <option key={engagement.id} value={engagement.id}>{engagement.reference} — {engagement.title}</option>)}
          </SelectField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Agreed Target Date" name="targetDate" type="date" value={state.targetDate} onChange={(event) => update('targetDate', event.target.value)} />
          <Input label="Reviewer (User UUID)" name="reviewerId" value={state.reviewerId} onChange={(event) => update('reviewerId', event.target.value)} placeholder="User UUID" />
        </div>

        <div>
          <label htmlFor="action-plan-justification" className="label">Management Justification (optional)</label>
          <textarea id="action-plan-justification" className="input min-h-[70px]" value={state.managementJustification} onChange={(event) => update('managementJustification', event.target.value)} maxLength={10000} placeholder="Keep the agreed management rationale with this action plan..." />
        </div>

        <div>
          <label htmlFor="action-plan-rectification" className="label">Proposed Rectification (optional)</label>
          <textarea id="action-plan-rectification" className="input min-h-[70px]" value={state.proposedRectification} onChange={(event) => update('proposedRectification', event.target.value)} maxLength={10000} placeholder="Describe the proposed solution or remediation approach..." />
        </div>

        {serverError && <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">{serverError}</div>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
          <Button type="submit" loading={loading}>{mode === 'create' ? 'Create Action Plan' : 'Save Changes'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function SelectField({ id, label, value, onChange, disabled, emptyLabel, children }: { id: string; label: string; value: string; onChange: (value: string) => void; disabled: boolean; emptyLabel: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <select id={id} className="input appearance-none pr-9" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
          <option value="">{emptyLabel}</option>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      </div>
    </div>
  );
}
