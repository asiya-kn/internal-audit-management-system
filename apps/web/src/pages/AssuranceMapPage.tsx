import { useState, useMemo } from 'react';
import { Network, Search, ShieldCheck, AlertTriangle, Clock, X } from 'lucide-react';
import {
  ASSURANCE_PROVIDERS,
  ASSURANCE_PROVIDER_LABELS,
  ASSURANCE_LEVELS,
  ASSURANCE_LEVEL_LABELS,
  type AssuranceProvider,
  type AssuranceLevel,
  type AssuranceTargetType,
  type AssuranceMapCellDto,
} from '@iams/shared';
import { useAssuranceMap } from '../hooks/useAssuranceMap';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageLoading } from '../components/ui/Spinner';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';

const levelStyles: Record<AssuranceLevel, string> = {
  FULL: 'bg-success-500 text-white',
  PARTIAL: 'bg-warning-400 text-warning-900',
  NONE: 'bg-neutral-100 text-neutral-400',
};

const levelDotStyles: Record<AssuranceLevel, string> = {
  FULL: 'bg-success-500',
  PARTIAL: 'bg-warning-400',
  NONE: 'bg-neutral-200',
};

const entityTypeLabels: Record<string, string> = {
  ORGANIZATION: 'Organization',
  DIVISION: 'Division',
  DEPARTMENT: 'Department',
  PROCESS: 'Process',
  SUB_PROCESS: 'Sub-process',
  SYSTEM: 'System',
  PROJECT: 'Project',
  THIRD_PARTY: 'Third Party',
  LOCATION: 'Location',
};

const riskLevelStyles: Record<string, string> = {
  CRITICAL: 'text-error-700 bg-error-100',
  HIGH: 'text-error-600 bg-error-50',
  MEDIUM: 'text-warning-700 bg-warning-50',
  LOW: 'text-success-700 bg-success-50',
};

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
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

function CellTooltip({ cell }: { cell: AssuranceMapCellDto }) {
  if (cell.assuranceLevel === 'NONE') {
    return (
      <div className="text-xs text-neutral-500">
        <p className="font-medium text-neutral-600">No assurance</p>
        <p>No engagements or control tests recorded.</p>
      </div>
    );
  }
  return (
    <div className="space-y-1 text-xs">
      <p className="font-medium text-neutral-700">{ASSURANCE_LEVEL_LABELS[cell.assuranceLevel]} assurance</p>
      <p className="text-neutral-500">{cell.notes}</p>
      {cell.assessmentDate && (
        <p className="text-neutral-400">Last activity: {new Date(cell.assessmentDate).toLocaleDateString()}</p>
      )}
      <div className="flex gap-3 pt-1">
        <span className="text-primary-600">Engagements: {cell.engagementCount}</span>
        <span className="text-neutral-600">Tests: {cell.controlTestCount}</span>
        {cell.findingCount > 0 && <span className="text-error-600">Findings: {cell.findingCount}</span>}
      </div>
    </div>
  );
}

export function AssuranceMapPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('assurance_map.view');

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [providerFilter, setProviderFilter] = useState<AssuranceProvider | ''>('');
  const [levelFilter, setLevelFilter] = useState<AssuranceLevel | ''>('');
  const [targetFilter, setTargetFilter] = useState<AssuranceTargetType | ''>('');
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const query = useAssuranceMap({
    search: search || undefined,
    provider: providerFilter || undefined,
    assuranceLevel: levelFilter || undefined,
    targetType: targetFilter || undefined,
    pageSize: 500,
  });

  const matrix = query.data?.matrix ?? [];
  const summary = query.data?.summary;

  const visibleProviders = useMemo(() => {
    if (providerFilter) return [providerFilter];
    return ASSURANCE_PROVIDERS;
  }, [providerFilter]);

  function applySearch() {
    setSearch(searchInput.trim());
  }

  function clearFilters() {
    setSearch('');
    setSearchInput('');
    setProviderFilter('');
    setLevelFilter('');
    setTargetFilter('');
  }

  const hasActiveFilters = Boolean(search || providerFilter || levelFilter || targetFilter);

  if (!canView) {
    return (
      <EmptyState
        title="Access Restricted"
        description="You do not have permission to view the Assurance Map."
      />
    );
  }

  if (query.isLoading) return <PageLoading />;
  if (query.isError) {
    return <ErrorState message="Failed to load assurance map" onRetry={() => query.refetch()} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Assurance Map</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Visual coverage of organizational risks and auditable entities across assurance providers,
          highlighting gaps and overlaps using live engagement and control testing data.
        </p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard icon={<Network className="h-5 w-5" />} label="Total Entities" value={summary.totalEntities} tone="neutral" />
          <SummaryCard icon={<ShieldCheck className="h-5 w-5" />} label="Coverage" value={`${summary.coveragePct}%`} tone="success" />
          <SummaryCard icon={<Clock className="h-5 w-5" />} label="Full Assurance" value={summary.fullAssuranceCount} tone="primary" />
          <SummaryCard icon={<AlertTriangle className="h-5 w-5" />} label="Coverage Gaps" value={summary.coverageGapsCount} tone="error" />
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              label="Search"
              name="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
              placeholder="Search by entity name, code, or department..."
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600">Provider</label>
            <select
              className="input"
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value as AssuranceProvider | '')}
            >
              <option value="">All Providers</option>
              {ASSURANCE_PROVIDERS.map((p) => (
                <option key={p} value={p}>{ASSURANCE_PROVIDER_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600">Assurance Level</label>
            <select
              className="input"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as AssuranceLevel | '')}
            >
              <option value="">All Levels</option>
              {ASSURANCE_LEVELS.map((l) => (
                <option key={l} value={l}>{ASSURANCE_LEVEL_LABELS[l]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600">Target</label>
            <select
              className="input"
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value as AssuranceTargetType | '')}
            >
              <option value="">All Targets</option>
              <option value="AUDIT_ENTITY">Entities only</option>
              <option value="RISK">With Risks</option>
            </select>
          </div>
          <Button variant="secondary" onClick={applySearch}>
            <Search className="h-4 w-4" />Search
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" />Clear
            </Button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600">
        <span className="font-medium text-neutral-700">Assurance Level:</span>
        {ASSURANCE_LEVELS.map((l) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded ${levelDotStyles[l]}`} />
            {ASSURANCE_LEVEL_LABELS[l]}
          </span>
        ))}
      </div>

      {/* Matrix */}
      {matrix.length === 0 ? (
        <EmptyState
          icon={<Network className="h-12 w-12" />}
          title="No assurance data available"
          description="Add audit engagements and control tests linked to your audit universe entities to populate the assurance map."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="sticky left-0 z-10 bg-neutral-50 px-4 py-3 text-left font-semibold text-neutral-700 min-w-[260px]">
                  Audit Entity / Risk
                </th>
                {visibleProviders.map((p) => (
                  <th key={p} className="px-3 py-3 text-center font-semibold text-neutral-700 min-w-[120px]">
                    {ASSURANCE_PROVIDER_LABELS[p]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {matrix.map((row, rowIdx) => (
                <tr key={row.auditEntityId} className="hover:bg-neutral-50">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 group-hover:bg-neutral-50">
                    <div className="font-medium text-neutral-900">{row.auditEntityName}</div>
                    <div className="text-xs text-neutral-500">
                      {row.auditEntityCode} · {entityTypeLabels[row.auditEntityType] ?? row.auditEntityType}
                    </div>
                    {row.riskTitle && (
                      <div className="mt-1 flex items-center gap-1.5">
                        {row.riskInherentLevel && (
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${riskLevelStyles[row.riskInherentLevel] ?? 'bg-neutral-100 text-neutral-600'}`}>
                            {row.riskInherentLevel}
                          </span>
                        )}
                        <span className="text-xs text-neutral-500">{row.riskTitle}</span>
                      </div>
                    )}
                  </td>
                  {visibleProviders.map((prov, colIdx) => {
                    const cell = row.cells.find((c) => c.provider === prov);
                    if (!cell) {
                      return <td key={prov} className="px-3 py-3 text-center"><span className="text-neutral-300">—</span></td>;
                    }
                    const isHovered = hoveredCell?.row === rowIdx && hoveredCell?.col === colIdx;
                    return (
                      <td
                        key={prov}
                        className="relative px-3 py-3 text-center"
                        onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div className="flex justify-center">
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${levelStyles[cell.assuranceLevel]}`}>
                            {cell.assuranceLevel === 'FULL' ? 'F' : cell.assuranceLevel === 'PARTIAL' ? 'P' : '—'}
                          </span>
                        </div>
                        {isHovered && (
                          <div className="absolute z-50 left-1/2 top-full mt-1 -translate-x-1/2 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg min-w-[200px] text-left">
                            <CellTooltip cell={cell} />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Provider breakdown */}
      {summary && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-neutral-700">Assurance Activity by Provider</h3>
          <div className="space-y-2">
            {ASSURANCE_PROVIDERS.map((p) => {
              const count = summary.byProvider[p];
              const maxCount = Math.max(1, ...Object.values(summary.byProvider));
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={p} className="flex items-center gap-3">
                  <span className="w-32 text-xs font-medium text-neutral-600">{ASSURANCE_PROVIDER_LABELS[p]}</span>
                  <div className="h-5 flex-1 rounded bg-neutral-100 overflow-hidden">
                    <div className="h-full bg-primary-500 rounded transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-medium text-neutral-700">{count}</span>
                </div>
              );
            })}
          </div>
          {summary.highRiskWithoutAssurance > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">
              <AlertTriangle className="h-4 w-4" />
              <span>{summary.highRiskWithoutAssurance} high/critical risk(s) have no assurance coverage.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
