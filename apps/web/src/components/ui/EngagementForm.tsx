import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { ChevronDown } from 'lucide-react';
import {
  ENGAGEMENT_TYPES,
  type EngagementType,
  type CreateEngagementRequest,
  type AuditUniverseSummaryDto,
  type RiskSummaryDto,
  type AuditPlanSummaryDto,
  type AuditPlanDetailDto,
  type EngagementDetailDto,
} from '@iams/shared';

interface EngagementFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: Partial<EngagementDetailDto>;
  auditEntities: AuditUniverseSummaryDto[];
  risks: RiskSummaryDto[];
  auditPlans: AuditPlanSummaryDto[];
  planDetail?: AuditPlanDetailDto | null;
  onPlanChange?: (planId: string | null) => void;
  onSubmit: (values: CreateEngagementRequest) => void;
  onCancel: () => void;
  loading?: boolean;
  serverError?: string;
}

interface FormState {
  reference: string;
  title: string;
  auditPlanId: string;
  auditEntityId: string;
  riskId: string;
  type: EngagementType;
  objectives: string;
  scope: string;
  methodology: string;
  estimatedResources: string;
  leadAuditorId: string;
  startDate: string;
  endDate: string;
}

function buildInitial(values: Partial<EngagementDetailDto> | undefined): FormState {
  return {
    reference: values?.reference ?? '',
    title: values?.title ?? '',
    auditPlanId: values?.auditPlanId ?? '',
    auditEntityId: values?.auditEntityId ?? '',
    riskId: values?.riskId ?? '',
    type: (values?.type as EngagementType) ?? 'INTERNAL_AUDIT',
    objectives: values?.objectives ?? '',
    scope: values?.scope ?? '',
    methodology: values?.methodology ?? '',
    estimatedResources: values?.estimatedResources ?? '',
    leadAuditorId: values?.leadAuditorId ?? '',
    startDate: values?.startDate ? values.startDate.slice(0, 10) : '',
    endDate: values?.endDate ? values.endDate.slice(0, 10) : '',
  };
}

const typeLabels: Record<EngagementType, string> = {
  INTERNAL_AUDIT: 'Internal Audit',
  COMPLIANCE_AUDIT: 'Compliance Audit',
  IT_AUDIT: 'IT Audit',
  OPERATIONAL_AUDIT: 'Operational Audit',
  FINANCIAL_AUDIT: 'Financial Audit',
  FOLLOW_UP: 'Follow-up',
  SPECIAL_REVIEW: 'Special Review',
  AD_HOC: 'Ad Hoc',
};

export function EngagementForm({
  open, mode, initialValues, auditEntities, risks, auditPlans, planDetail, onPlanChange,
  onSubmit, onCancel, loading, serverError,
}: EngagementFormProps) {
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
  if (!state.auditEntityId) errors.auditEntityId = 'An audit entity is required';
  if (!state.objectives.trim()) errors.objectives = 'Objectives are required';
  if (!state.scope.trim()) errors.scope = 'Scope is required';

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  const filteredRisks = state.auditEntityId
    ? risks.filter((r) => r.auditEntityId === state.auditEntityId)
    : risks;

  function applyPlan(planId: string) {
    update('auditPlanId', planId);
    onPlanChange?.(planId || null);
    const summary = auditPlans.find((p) => p.id === planId);
    if (!summary) return;
    update('auditEntityId', summary.auditEntityId);
    if (summary.riskId) update('riskId', summary.riskId);
    else update('riskId', '');
    if (summary.leadAuditorId) update('leadAuditorId', summary.leadAuditorId);
    if (summary.proposedStartDate) update('startDate', summary.proposedStartDate.slice(0, 10));
    if (summary.proposedEndDate) update('endDate', summary.proposedEndDate.slice(0, 10));
    if (summary.title && !state.title.trim()) update('title', summary.title);
    if (planDetail?.id === planId) {
      if (planDetail.objectives) update('objectives', planDetail.objectives);
      if (planDetail.scope) update('scope', planDetail.scope);
      if (planDetail.estimatedResources) update('estimatedResources', planDetail.estimatedResources);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: CreateEngagementRequest = {
      reference: state.reference.trim(),
      title: state.title.trim(),
      auditPlanId: state.auditPlanId || null,
      auditEntityId: state.auditEntityId,
      riskId: state.riskId || null,
      type: state.type,
      objectives: state.objectives.trim(),
      scope: state.scope.trim(),
      methodology: state.methodology.trim() || undefined,
      estimatedResources: state.estimatedResources.trim() || null,
      leadAuditorId: state.leadAuditorId || null,
      startDate: state.startDate ? new Date(state.startDate).toISOString() : null,
      endDate: state.endDate ? new Date(state.endDate).toISOString() : null,
    };
    onSubmit(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={mode === 'create' ? 'Create Audit Engagement' : 'Edit Audit Engagement'}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          {serverError && <span className="text-xs text-error-600">{serverError}</span>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
            <Button type="submit" form="engagement-form" loading={loading}>
              {mode === 'create' ? 'Create Engagement' : 'Save Changes'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="engagement-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Reference"
            name="reference"
            value={state.reference}
            onChange={(e) => update('reference', e.target.value)}
            error={errors.reference}
            placeholder="e.g. ENG-2026-001"
            required
          />
          <div>
            <label htmlFor="eng-type" className="label">Engagement Type</label>
            <div className="relative">
              <select
                id="eng-type"
                className="input appearance-none pr-9"
                value={state.type}
                onChange={(e) => update('type', e.target.value as EngagementType)}
              >
                {ENGAGEMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{typeLabels[t]}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
        </div>

        <Input
          label="Title"
          name="title"
          value={state.title}
          onChange={(e) => update('title', e.target.value)}
          error={errors.title}
          placeholder="e.g. Q1 2026 Accounts Payable Audit"
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="eng-auditPlan" className="label">Audit Plan (optional)</label>
            <div className="relative">
              <select
                id="eng-auditPlan"
                className="input appearance-none pr-9"
                value={state.auditPlanId}
                onChange={(e) => applyPlan(e.target.value)}
                disabled={mode === 'edit'}
              >
                <option value="">None</option>
                {auditPlans.map((p) => (
                  <option key={p.id} value={p.id}>{p.reference} — {p.title}</option>
                ))}
              </select>
              {state.auditPlanId && (
                <p className="mt-1 text-xs text-primary-600">
                  Inheriting data from selected plan item. Fields are editable.
                </p>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="eng-auditEntity" className="label">Audit Entity</label>
            <div className="relative">
              <select
                id="eng-auditEntity"
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
            <label htmlFor="eng-riskId" className="label">Linked Risk (optional)</label>
            <div className="relative">
              <select
                id="eng-riskId"
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
          <label htmlFor="eng-objectives" className="label">Objectives</label>
          <textarea
            id="eng-objectives"
            className={`input min-h-[80px] ${errors.objectives ? 'border-error-500' : ''}`}
            value={state.objectives}
            onChange={(e) => update('objectives', e.target.value)}
            maxLength={5000}
            required
          />
          {errors.objectives && <p className="mt-1 text-xs text-error-600">{errors.objectives}</p>}
        </div>

        <div>
          <label htmlFor="eng-scope" className="label">Scope</label>
          <textarea
            id="eng-scope"
            className={`input min-h-[80px] ${errors.scope ? 'border-error-500' : ''}`}
            value={state.scope}
            onChange={(e) => update('scope', e.target.value)}
            maxLength={5000}
            required
          />
          {errors.scope && <p className="mt-1 text-xs text-error-600">{errors.scope}</p>}
        </div>

        <div>
          <label htmlFor="eng-methodology" className="label">Methodology (optional)</label>
          <textarea
            id="eng-methodology"
            className="input min-h-[60px]"
            value={state.methodology}
            onChange={(e) => update('methodology', e.target.value)}
            maxLength={5000}
          />
        </div>

        <div>
          <label htmlFor="eng-estimatedResources" className="label">Estimated Resources (optional)</label>
          <input
            id="eng-estimatedResources"
            className="input"
            value={state.estimatedResources}
            onChange={(e) => update('estimatedResources', e.target.value)}
            maxLength={2000}
            placeholder="e.g. 2 auditors, 3 weeks"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Lead Auditor (User UUID)"
            name="leadAuditorId"
            value={state.leadAuditorId}
            onChange={(e) => update('leadAuditorId', e.target.value)}
            placeholder="Leave blank to unassign"
          />
          <Input
            label="Planned Start Date"
            name="startDate"
            type="date"
            value={state.startDate}
            onChange={(e) => update('startDate', e.target.value)}
          />
          <Input
            label="Planned End Date"
            name="endDate"
            type="date"
            value={state.endDate}
            onChange={(e) => update('endDate', e.target.value)}
          />
        </div>

      </form>
    </Modal>
  );
}
