import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import {
  AUDIT_ENTITY_TYPES,
  AUDIT_ENTITY_STATUSES,
  type AuditEntityType,
  type AuditEntityStatus,
  type CreateAuditUniverseRequest,
  type AuditUniverseSummaryDto,
} from '@iams/shared';
import { ChevronDown } from 'lucide-react';

interface AuditUniverseFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: Partial<CreateAuditUniverseRequest>;
  parents: AuditUniverseSummaryDto[];
  onSubmit: (values: CreateAuditUniverseRequest) => void;
  onCancel: () => void;
  loading?: boolean;
  serverError?: string;
  excludeId?: string;
}

interface FormState {
  code: string;
  name: string;
  description: string;
  entityType: AuditEntityType;
  status: AuditEntityStatus;
  parentId: string;
  businessProcess: string;
  department: string;
  riskRating: string;
  notes: string;
  ownerId: string;
}

function buildInitial(values: Partial<CreateAuditUniverseRequest> | undefined): FormState {
  return {
    code: values?.code ?? '',
    name: values?.name ?? '',
    description: values?.description ?? '',
    entityType: (values?.entityType as AuditEntityType) ?? 'DEPARTMENT',
    status: (values?.status as AuditEntityStatus) ?? 'ACTIVE',
    parentId: values?.parentId ?? '',
    businessProcess: values?.businessProcess ?? '',
    department: values?.department ?? '',
    riskRating: values?.riskRating ?? '',
    notes: values?.notes ?? '',
    ownerId: values?.ownerId ?? '',
  };
}

const entityTypeLabels: Record<AuditEntityType, string> = {
  ORGANIZATION: 'Organization',
  EXECUTIVE_MANAGEMENT: 'Executive Management',
  DEPARTMENT: 'Department',
  BOARD_OF_DIRECTORS: 'Board of Directors',
  SECTOR: 'Sector',
  SYSTEM: 'System',
  PROJECT: 'Project',
  THIRD_PARTY: 'Third Party',
  DIVISION: 'Division',
};

const statusLabels: Record<AuditEntityStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  ARCHIVED: 'Archived',
};

export function AuditUniverseForm({
  open,
  mode,
  initialValues,
  parents,
  onSubmit,
  onCancel,
  loading,
  serverError,
  excludeId,
}: AuditUniverseFormProps) {
  const [state, setState] = useState<FormState>(() => buildInitial(initialValues));

  // Re-sync when modal opens or initialValues change
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setState(buildInitial(initialValues));
    }
  }

  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!state.code.trim()) errors.code = 'Code is required';
  else if (!/^[A-Za-z0-9\-_.]+$/.test(state.code.trim())) {
    errors.code = 'Only letters, numbers, dashes, underscores and dots are allowed';
  }
  if (!state.name.trim()) errors.name = 'Name is required';

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: CreateAuditUniverseRequest = {
      code: state.code.trim(),
      name: state.name.trim(),
      description: state.description.trim() || undefined,
      entityType: state.entityType,
      status: state.status,
      parentId: state.parentId || null,
      businessProcess: state.businessProcess.trim() || undefined,
      department: state.department.trim() || undefined,
      riskRating: state.riskRating.trim() || undefined,
      notes: state.notes.trim() || undefined,
      ownerId: state.ownerId || null,
    };
    onSubmit(payload);
  }

  const availableParents = excludeId
    ? parents.filter((p) => p.id !== excludeId)
    : parents;

  return (
    <Modal open={open} onClose={onCancel} title={mode === 'create' ? 'Add Audit Entity' : 'Edit Audit Entity'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Code"
            name="code"
            value={state.code}
            onChange={(e) => update('code', e.target.value)}
            error={errors.code}
            placeholder="e.g. FIN-AP-001"
            required
          />
          <Input
            label="Name"
            name="name"
            value={state.name}
            onChange={(e) => update('name', e.target.value)}
            error={errors.name}
            placeholder="e.g. Accounts Payable Process"
            required
          />
        </div>

        <div>
          <label htmlFor="au-description" className="label">
            Description
          </label>
          <textarea
            id="au-description"
            className="input min-h-[80px]"
            value={state.description}
            onChange={(e) => update('description', e.target.value)}
            maxLength={2000}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="au-entityType" className="label">
              Entity Type
            </label>
            <div className="relative">
              <select
                id="au-entityType"
                className="input appearance-none pr-9"
                value={state.entityType}
                onChange={(e) => update('entityType', e.target.value as AuditEntityType)}
              >
                {AUDIT_ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {entityTypeLabels[t]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>

          <div>
            <label htmlFor="au-status" className="label">
              Status
            </label>
            <div className="relative">
              <select
                id="au-status"
                className="input appearance-none pr-9"
                value={state.status}
                onChange={(e) => update('status', e.target.value as AuditEntityStatus)}
              >
                {AUDIT_ENTITY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>

          <div>
            <label htmlFor="au-parentId" className="label">
              Parent Entity
            </label>
            <div className="relative">
              <select
                id="au-parentId"
                className="input appearance-none pr-9"
                value={state.parentId}
                onChange={(e) => update('parentId', e.target.value)}
              >
                <option value="">None (top-level)</option>
                {availableParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Department"
            name="department"
            value={state.department}
            onChange={(e) => update('department', e.target.value)}
            placeholder="e.g. Finance"
          />
          <Input
            label="Business Process"
            name="businessProcess"
            value={state.businessProcess}
            onChange={(e) => update('businessProcess', e.target.value)}
            placeholder="e.g. Procure-to-Pay"
          />
          <Input
            label="Risk Rating"
            name="riskRating"
            value={state.riskRating}
            onChange={(e) => update('riskRating', e.target.value)}
            placeholder="e.g. High"
          />
        </div>

        <div>
          <label htmlFor="au-notes" className="label">
            Notes
          </label>
          <textarea
            id="au-notes"
            className="input min-h-[60px]"
            value={state.notes}
            onChange={(e) => update('notes', e.target.value)}
            maxLength={2000}
          />
        </div>

        {serverError && (
          <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
            {serverError}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {mode === 'create' ? 'Create Entity' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
