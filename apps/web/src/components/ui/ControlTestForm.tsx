import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { ChevronDown } from 'lucide-react';
import {
  type CreateControlTestRequest,
  type AuditUniverseSummaryDto,
  type EngagementSummaryDto,
  type RiskSummaryDto,
  type ControlTestDetailDto,
} from '@iams/shared';

interface ControlTestFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: Partial<ControlTestDetailDto>;
  auditEntities: AuditUniverseSummaryDto[];
  engagements: EngagementSummaryDto[];
  risks: RiskSummaryDto[];
  onSubmit: (values: CreateControlTestRequest) => void;
  onCancel: () => void;
  loading?: boolean;
  serverError?: string;
}

interface FormState {
  reference: string;
  title: string;
  engagementId: string;
  auditEntityId: string;
  riskId: string;
  controlReference: string;
  objective: string;
  procedures: string;
  criteria: string;
  sampleDescription: string;
  sampleSize: string;
  expectedResult: string;
  testerId: string;
}

function buildInitial(values: Partial<ControlTestDetailDto> | undefined): FormState {
  return {
    reference: values?.reference ?? '',
    title: values?.title ?? '',
    engagementId: values?.engagementId ?? '',
    auditEntityId: values?.auditEntityId ?? '',
    riskId: values?.riskId ?? '',
    controlReference: values?.controlReference ?? '',
    objective: values?.objective ?? '',
    procedures: values?.procedures ?? '',
    criteria: values?.criteria ?? '',
    sampleDescription: values?.sampleDescription ?? '',
    sampleSize: values?.sampleSize != null ? String(values.sampleSize) : '',
    expectedResult: values?.expectedResult ?? '',
    testerId: values?.testerId ?? '',
  };
}

export function ControlTestForm({
  open, mode, initialValues, auditEntities, engagements, risks,
  onSubmit, onCancel, loading, serverError,
}: ControlTestFormProps) {
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
  if (!state.objective.trim()) errors.objective = 'Objective is required';
  if (!state.procedures.trim()) errors.procedures = 'Procedures are required';

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  const filteredEngagements = state.auditEntityId
    ? engagements.filter((e) => e.auditEntityId === state.auditEntityId)
    : engagements;

  const filteredRisks = state.auditEntityId
    ? risks.filter((r) => r.auditEntityId === state.auditEntityId)
    : risks;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: CreateControlTestRequest = {
      reference: state.reference.trim(),
      title: state.title.trim(),
      engagementId: state.engagementId || null,
      auditEntityId: state.auditEntityId || null,
      riskId: state.riskId || null,
      controlReference: state.controlReference.trim() || undefined,
      objective: state.objective.trim(),
      procedures: state.procedures.trim(),
      criteria: state.criteria.trim() || undefined,
      sampleDescription: state.sampleDescription.trim() || undefined,
      sampleSize: state.sampleSize ? Number(state.sampleSize) : undefined,
      expectedResult: state.expectedResult.trim() || undefined,
      testerId: state.testerId || null,
    };
    onSubmit(payload);
  }

  return (
    <Modal open={open} onClose={onCancel} title={mode === 'create' ? 'Create Control Test' : 'Edit Control Test'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Reference"
            name="reference"
            value={state.reference}
            onChange={(e) => update('reference', e.target.value)}
            error={errors.reference}
            placeholder="e.g. CT-2026-001"
            required
            disabled={mode === 'edit'}
          />
          <Input
            label="Control Reference"
            name="controlReference"
            value={state.controlReference}
            onChange={(e) => update('controlReference', e.target.value)}
            placeholder="e.g. CTRL-AP-001"
          />
        </div>

        <Input
          label="Title"
          name="title"
          value={state.title}
          onChange={(e) => update('title', e.target.value)}
          error={errors.title}
          placeholder="e.g. Test segregation of duties in accounts payable"
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="ct-auditEntity" className="label">Audit Entity (optional)</label>
            <div className="relative">
              <select
                id="ct-auditEntity"
                className="input appearance-none pr-9"
                value={state.auditEntityId}
                onChange={(e) => {
                  update('auditEntityId', e.target.value);
                  update('engagementId', '');
                  update('riskId', '');
                }}
              >
                <option value="">None</option>
                {auditEntities.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
          <div>
            <label htmlFor="ct-engagement" className="label">Engagement (optional)</label>
            <div className="relative">
              <select
                id="ct-engagement"
                className="input appearance-none pr-9"
                value={state.engagementId}
                onChange={(e) => update('engagementId', e.target.value)}
                disabled={filteredEngagements.length === 0}
              >
                <option value="">{filteredEngagements.length === 0 ? 'No engagements for this entity' : 'None'}</option>
                {filteredEngagements.map((en) => (
                  <option key={en.id} value={en.id}>{en.reference} — {en.title}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
          <div>
            <label htmlFor="ct-risk" className="label">Risk (optional)</label>
            <div className="relative">
              <select
                id="ct-risk"
                className="input appearance-none pr-9"
                value={state.riskId}
                onChange={(e) => update('riskId', e.target.value)}
                disabled={filteredRisks.length === 0}
              >
                <option value="">{filteredRisks.length === 0 ? 'No risks for this entity' : 'None'}</option>
                {filteredRisks.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="ct-objective" className="label">Test Objective</label>
          <textarea
            id="ct-objective"
            className={`input min-h-[80px] ${errors.objective ? 'border-error-500' : ''}`}
            value={state.objective}
            onChange={(e) => update('objective', e.target.value)}
            maxLength={10000}
            required
            placeholder="What should this control test verify?"
          />
          {errors.objective && <p className="mt-1 text-xs text-error-600">{errors.objective}</p>}
        </div>

        <div>
          <label htmlFor="ct-procedures" className="label">Test Procedures</label>
          <textarea
            id="ct-procedures"
            className={`input min-h-[80px] ${errors.procedures ? 'border-error-500' : ''}`}
            value={state.procedures}
            onChange={(e) => update('procedures', e.target.value)}
            maxLength={10000}
            required
            placeholder="Step-by-step testing procedure..."
          />
          {errors.procedures && <p className="mt-1 text-xs text-error-600">{errors.procedures}</p>}
        </div>

        <div>
          <label htmlFor="ct-criteria" className="label">Test Criteria (optional)</label>
          <textarea
            id="ct-criteria"
            className="input min-h-[60px]"
            value={state.criteria}
            onChange={(e) => update('criteria', e.target.value)}
            maxLength={10000}
            placeholder="The standard or control being tested against..."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ct-sampleDescription" className="label">Sample Description (optional)</label>
            <textarea
              id="ct-sampleDescription"
              className="input min-h-[60px]"
              value={state.sampleDescription}
              onChange={(e) => update('sampleDescription', e.target.value)}
              maxLength={10000}
              placeholder="Describe the sampling methodology..."
            />
          </div>
          <Input
            label="Sample Size"
            name="sampleSize"
            type="number"
            value={state.sampleSize}
            onChange={(e) => update('sampleSize', e.target.value)}
            placeholder="e.g. 25"
          />
        </div>

        <div>
          <label htmlFor="ct-expectedResult" className="label">Expected Result (optional)</label>
          <textarea
            id="ct-expectedResult"
            className="input min-h-[60px]"
            value={state.expectedResult}
            onChange={(e) => update('expectedResult', e.target.value)}
            maxLength={10000}
            placeholder="What the expected result should be if the control is operating effectively..."
          />
        </div>

        <Input
          label="Tester (User UUID, optional)"
          name="testerId"
          value={state.testerId}
          onChange={(e) => update('testerId', e.target.value)}
          placeholder="Leave blank to assign yourself later"
        />

        {serverError && (
          <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
            {serverError}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
          <Button type="submit" loading={loading}>
            {mode === 'create' ? 'Create Control Test' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
