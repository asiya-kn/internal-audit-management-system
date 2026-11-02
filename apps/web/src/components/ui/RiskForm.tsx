import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { ChevronDown } from 'lucide-react';
import {
  RISK_STATUSES,
  scoreToLevel,
  residualScore,
  type RiskStatus,
  type CreateRiskRequest,
  type AuditUniverseSummaryDto,
  type RiskDetailDto,
} from '@iams/shared';

interface RiskFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: Partial<RiskDetailDto>;
  auditEntities: AuditUniverseSummaryDto[];
  onSubmit: (values: CreateRiskRequest) => void;
  onCancel: () => void;
  loading?: boolean;
  serverError?: string;
}

interface FormState {
  title: string;
  description: string;
  auditEntityId: string;
  inherentLikelihood: number;
  inherentImpact: number;
  controlEffectiveness: number;
  existingControls: string;
  riskCategory: string;
  notes: string;
  ownerId: string;
  status: RiskStatus;
}

function buildInitial(values: Partial<RiskDetailDto> | undefined): FormState {
  return {
    title: values?.title ?? '',
    description: values?.description ?? '',
    auditEntityId: values?.auditEntityId ?? '',
    inherentLikelihood: values?.inherentLikelihood ?? 3,
    inherentImpact: values?.inherentImpact ?? 3,
    controlEffectiveness: values?.controlEffectiveness ?? 0,
    existingControls: values?.existingControls ?? '',
    riskCategory: values?.riskCategory ?? '',
    notes: values?.notes ?? '',
    ownerId: values?.ownerId ?? '',
    status: (values?.status as RiskStatus) ?? 'OPEN',
  };
}

const statusLabels: Record<RiskStatus, string> = {
  OPEN: 'Open',
  MITIGATING: 'Mitigating',
  MONITORING: 'Monitoring',
  CLOSED: 'Closed',
};

const levelStyles: Record<string, string> = {
  LOW: 'bg-success-50 text-success-700',
  MEDIUM: 'bg-warning-50 text-warning-700',
  HIGH: 'bg-orange-50 text-orange-700',
  CRITICAL: 'bg-error-50 text-error-700',
};

export function RiskForm({
  open,
  mode,
  initialValues,
  auditEntities,
  onSubmit,
  onCancel,
  loading,
  serverError,
}: RiskFormProps) {
  const [state, setState] = useState<FormState>(() => buildInitial(initialValues));

  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setState(buildInitial(initialValues));
  }

  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!state.title.trim()) errors.title = 'Title is required';
  if (!state.auditEntityId) errors.auditEntityId = 'An audit entity is required';

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  const inherentScore = state.inherentLikelihood * state.inherentImpact;
  const inherentLevel = scoreToLevel(inherentScore);
  const resScore = residualScore(inherentScore, state.controlEffectiveness);
  const resLevel = scoreToLevel(resScore);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: CreateRiskRequest = {
      title: state.title.trim(),
      description: state.description.trim() || undefined,
      auditEntityId: state.auditEntityId,
      inherentLikelihood: state.inherentLikelihood,
      inherentImpact: state.inherentImpact,
      controlEffectiveness: state.controlEffectiveness,
      existingControls: state.existingControls.trim() || undefined,
      riskCategory: state.riskCategory.trim() || undefined,
      notes: state.notes.trim() || undefined,
      ownerId: state.ownerId || null,
    };
    if (mode === 'edit') {
      (payload as CreateRiskRequest & { status?: RiskStatus }).status = state.status;
    }
    onSubmit(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={mode === 'create' ? 'Add Risk' : 'Edit Risk'}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          {serverError && <span className="text-xs text-error-600">{serverError}</span>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
            <Button type="submit" form="risk-form" loading={loading}>
              {mode === 'create' ? 'Create Risk' : 'Save Changes'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="risk-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Risk Title"
          name="title"
          value={state.title}
          onChange={(e) => update('title', e.target.value)}
          error={errors.title}
          placeholder="e.g. Unauthorized payment processing"
          required
        />

        <div>
          <label htmlFor="risk-description" className="label">Description</label>
          <textarea
            id="risk-description"
            className="input min-h-[70px]"
            value={state.description}
            onChange={(e) => update('description', e.target.value)}
            maxLength={2000}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="risk-auditEntity" className="label">Linked Audit Entity</label>
            <div className="relative">
              <select
                id="risk-auditEntity"
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
          <Input
            label="Risk Category"
            name="riskCategory"
            value={state.riskCategory}
            onChange={(e) => update('riskCategory', e.target.value)}
            placeholder="e.g. Financial, Operational"
          />
        </div>

        {/* Inherent risk */}
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <h4 className="text-sm font-semibold text-neutral-800">Inherent Risk Assessment</h4>
          <p className="mt-0.5 text-xs text-neutral-500">Score the risk before controls are applied.</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="risk-likelihood" className="label">Likelihood (1–5)</label>
              <div className="relative">
                <select
                  id="risk-likelihood"
                  className="input appearance-none pr-9"
                  value={state.inherentLikelihood}
                  onChange={(e) => update('inherentLikelihood', Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n} — {['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'][n - 1]}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              </div>
            </div>
            <div>
              <label htmlFor="risk-impact" className="label">Impact (1–5)</label>
              <div className="relative">
                <select
                  id="risk-impact"
                  className="input appearance-none pr-9"
                  value={state.inherentImpact}
                  onChange={(e) => update('inherentImpact', Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n} — {['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'][n - 1]}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm text-neutral-600">Inherent score:</span>
            <span className="font-semibold text-neutral-900">{inherentScore}</span>
            <span className={`badge ${levelStyles[inherentLevel]}`}>{inherentLevel}</span>
          </div>
        </div>

        {/* Controls & residual */}
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <h4 className="text-sm font-semibold text-neutral-800">Controls & Residual Risk</h4>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="risk-controlEff" className="label">Control Effectiveness (0–100%)</label>
              <input
                id="risk-controlEff"
                type="range"
                min={0}
                max={100}
                step={5}
                value={state.controlEffectiveness}
                onChange={(e) => update('controlEffectiveness', Number(e.target.value))}
                className="w-full accent-primary-600"
              />
              <div className="mt-1 text-sm font-medium text-neutral-700">{state.controlEffectiveness}%</div>
            </div>
            <div className="flex flex-col justify-end">
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-600">Residual score:</span>
                <span className="font-semibold text-neutral-900">{resScore}</span>
                <span className={`badge ${levelStyles[resLevel]}`}>{resLevel}</span>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <label htmlFor="risk-existingControls" className="label">Existing Controls Description</label>
            <textarea
              id="risk-existingControls"
              className="input min-h-[60px]"
              value={state.existingControls}
              onChange={(e) => update('existingControls', e.target.value)}
              maxLength={2000}
              placeholder="Describe the controls currently in place…"
            />
          </div>
        </div>

        <Input
          label="Risk Owner (User UUID)"
          name="ownerId"
          value={state.ownerId}
          onChange={(e) => update('ownerId', e.target.value)}
          placeholder="Leave blank to unassign"
        />

        {mode === 'edit' && (
          <div>
            <label htmlFor="risk-status" className="label">Status</label>
            <div className="relative">
              <select
                id="risk-status"
                className="input appearance-none pr-9"
                value={state.status}
                onChange={(e) => update('status', e.target.value as RiskStatus)}
              >
                {RISK_STATUSES.map((s) => (
                  <option key={s} value={s}>{statusLabels[s]}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="risk-notes" className="label">Notes</label>
          <textarea
            id="risk-notes"
            className="input min-h-[50px]"
            value={state.notes}
            onChange={(e) => update('notes', e.target.value)}
            maxLength={2000}
          />
        </div>

      </form>
    </Modal>
  );
}
