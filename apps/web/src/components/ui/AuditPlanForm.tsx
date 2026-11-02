import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { ChevronDown } from 'lucide-react';
import {
  AUDIT_PRIORITIES,
  type AuditPriority,
  type CreateAuditPlanRequest,
  type AuditUniverseSummaryDto,
  type RiskSummaryDto,
  type AuditPlanDetailDto,
} from '@iams/shared';

interface AuditPlanFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: Partial<AuditPlanDetailDto>;
  auditEntities: AuditUniverseSummaryDto[];
  risks: RiskSummaryDto[];
  onSubmit: (values: CreateAuditPlanRequest) => void;
  onCancel: () => void;
  loading?: boolean;
  serverError?: string;
}

interface FormState {
  title: string;
  reference: string;
  fiscalYear: string;
  auditEntityId: string;
  riskId: string;
  objectives: string;
  scope: string;
  priority: AuditPriority;
  proposedStartDate: string;
  proposedEndDate: string;
  estimatedResources: string;
  planningRationale: string;
  leadAuditorId: string;
  notes: string;
}

function buildInitial(values: Partial<AuditPlanDetailDto> | undefined): FormState {
  return {
    title: values?.title ?? '',
    reference: values?.reference ?? '',
    fiscalYear: values?.fiscalYear ? String(values.fiscalYear) : String(new Date().getFullYear() + 1),
    auditEntityId: values?.auditEntityId ?? '',
    riskId: values?.riskId ?? '',
    objectives: values?.objectives ?? '',
    scope: values?.scope ?? '',
    priority: (values?.priority as AuditPriority) ?? 'MEDIUM',
    proposedStartDate: values?.proposedStartDate ? values.proposedStartDate.slice(0, 10) : '',
    proposedEndDate: values?.proposedEndDate ? values.proposedEndDate.slice(0, 10) : '',
    estimatedResources: values?.estimatedResources ?? '',
    planningRationale: values?.planningRationale ?? '',
    leadAuditorId: values?.leadAuditorId ?? '',
    notes: values?.notes ?? '',
  };
}

const priorityLabels: Record<AuditPriority, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export function AuditPlanForm({
  open,
  mode,
  initialValues,
  auditEntities,
  risks,
  onSubmit,
  onCancel,
  loading,
  serverError,
}: AuditPlanFormProps) {
  const [state, setState] = useState<FormState>(() => buildInitial(initialValues));

  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setState(buildInitial(initialValues));
  }

  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!state.title.trim()) errors.title = 'Title is required';
  if (!state.reference.trim()) errors.reference = 'Reference is required';
  else if (!/^[A-Za-z0-9\-_.]+$/.test(state.reference.trim())) errors.reference = 'Only letters, numbers, dashes, underscores and dots';
  if (!state.auditEntityId) errors.auditEntityId = 'An audit entity is required';
  if (!state.objectives.trim()) errors.objectives = 'Objectives are required';
  if (!state.scope.trim()) errors.scope = 'Scope is required';
  const fy = parseInt(state.fiscalYear, 10);
  if (!fy || fy < 2000 || fy > 2200) errors.fiscalYear = 'Enter a valid year';

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  const filteredRisks = state.auditEntityId
    ? risks.filter((r) => r.auditEntityId === state.auditEntityId)
    : risks;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: CreateAuditPlanRequest = {
      title: state.title.trim(),
      reference: state.reference.trim(),
      fiscalYear: fy,
      auditEntityId: state.auditEntityId,
      riskId: state.riskId || null,
      objectives: state.objectives.trim(),
      scope: state.scope.trim(),
      priority: state.priority,
      proposedStartDate: state.proposedStartDate ? new Date(state.proposedStartDate).toISOString() : null,
      proposedEndDate: state.proposedEndDate ? new Date(state.proposedEndDate).toISOString() : null,
      estimatedResources: state.estimatedResources.trim() || null,
      planningRationale: state.planningRationale.trim() || null,
      leadAuditorId: state.leadAuditorId || null,
      notes: state.notes.trim() || undefined,
    };
    onSubmit(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={mode === 'create' ? 'Add Plan Item' : 'Edit Plan Item'}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          {serverError && <span className="text-xs text-error-600">{serverError}</span>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
            <Button type="submit" form="audit-plan-form" loading={loading}>
              {mode === 'create' ? 'Create Plan Item' : 'Save Changes'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="audit-plan-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Reference"
            name="reference"
            value={state.reference}
            onChange={(e) => update('reference', e.target.value)}
            error={errors.reference}
            placeholder="e.g. FY2026-AP-001"
            required
          />
          <Input
            label="Fiscal Year"
            name="fiscalYear"
            type="number"
            value={state.fiscalYear}
            onChange={(e) => update('fiscalYear', e.target.value)}
            error={errors.fiscalYear}
            required
          />
        </div>

        <Input
          label="Title"
          name="title"
          value={state.title}
          onChange={(e) => update('title', e.target.value)}
          error={errors.title}
          placeholder="e.g. Accounts Payable Process Audit"
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ap-auditEntity" className="label">Audit Entity</label>
            <div className="relative">
              <select
                id="ap-auditEntity"
                className={`input appearance-none pr-9 ${errors.auditEntityId ? 'border-error-500' : ''}`}
                value={state.auditEntityId}
                onChange={(e) => update('auditEntityId', e.target.value)}
                required
              >
                <option value="">Select an entity…</option>
                {auditEntities.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
            {errors.auditEntityId && <p className="mt-1 text-xs text-error-600">{errors.auditEntityId}</p>}
          </div>
          <div>
            <label htmlFor="ap-riskId" className="label">Linked Risk (optional)</label>
            <div className="relative">
              <select
                id="ap-riskId"
                className="input appearance-none pr-9"
                value={state.riskId}
                onChange={(e) => update('riskId', e.target.value)}
                disabled={filteredRisks.length === 0}
              >
                <option value="">{filteredRisks.length === 0 ? 'No risks for this entity' : 'None'}</option>
                {filteredRisks.map((r) => (
                  <option key={r.id} value={r.id}>{r.title} ({r.inherentLevel})</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="ap-objectives" className="label">Objectives</label>
          <textarea
            id="ap-objectives"
            className={`input min-h-[80px] ${errors.objectives ? 'border-error-500' : ''}`}
            value={state.objectives}
            onChange={(e) => update('objectives', e.target.value)}
            maxLength={5000}
            required
          />
          {errors.objectives && <p className="mt-1 text-xs text-error-600">{errors.objectives}</p>}
        </div>

        <div>
          <label htmlFor="ap-scope" className="label">Scope</label>
          <textarea
            id="ap-scope"
            className={`input min-h-[80px] ${errors.scope ? 'border-error-500' : ''}`}
            value={state.scope}
            onChange={(e) => update('scope', e.target.value)}
            maxLength={5000}
            required
          />
          {errors.scope && <p className="mt-1 text-xs text-error-600">{errors.scope}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="ap-priority" className="label">Priority</label>
            <div className="relative">
              <select
                id="ap-priority"
                className="input appearance-none pr-9"
                value={state.priority}
                onChange={(e) => update('priority', e.target.value as AuditPriority)}
              >
                {AUDIT_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{priorityLabels[p]}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
          <Input
            label="Proposed Start Date"
            name="proposedStartDate"
            type="date"
            value={state.proposedStartDate}
            onChange={(e) => update('proposedStartDate', e.target.value)}
          />
          <Input
            label="Proposed End Date"
            name="proposedEndDate"
            type="date"
            value={state.proposedEndDate}
            onChange={(e) => update('proposedEndDate', e.target.value)}
          />
        </div>

        <Input
          label="Lead Auditor (User UUID)"
          name="leadAuditorId"
          value={state.leadAuditorId}
          onChange={(e) => update('leadAuditorId', e.target.value)}
          placeholder="Leave blank to unassign"
        />

        <div>
          <label htmlFor="ap-estimatedResources" className="label">Estimated Resources (optional)</label>
          <input
            id="ap-estimatedResources"
            className="input"
            value={state.estimatedResources}
            onChange={(e) => update('estimatedResources', e.target.value)}
            maxLength={2000}
            placeholder="e.g. 2 auditors, 3 weeks"
          />
        </div>

        <div>
          <label htmlFor="ap-planningRationale" className="label">Planning Rationale (optional)</label>
          <textarea
            id="ap-planningRationale"
            className="input min-h-[60px]"
            value={state.planningRationale}
            onChange={(e) => update('planningRationale', e.target.value)}
            maxLength={5000}
            placeholder="Why this audit is included in the plan…"
          />
        </div>

        <div>
          <label htmlFor="ap-notes" className="label">Notes</label>
          <textarea
            id="ap-notes"
            className="input min-h-[50px]"
            value={state.notes}
            onChange={(e) => update('notes', e.target.value)}
            maxLength={5000}
          />
        </div>

      </form>
    </Modal>
  );
}
