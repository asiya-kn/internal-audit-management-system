import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, ShieldAlert, CalendarCheck, CheckCircle2, Flag,
  AlertTriangle, FolderOpen, ShieldCheck, ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { KpiCard } from '../components/dashboard/KpiCard';
import { FilterBar } from '../components/dashboard/FilterBar';
import { ErrorState } from '../components/ui/ErrorState';
import { PageLoading } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import type { DashboardFilters, KpiMetric, AnalyticsPanel, PriorityItem } from '@iams/shared';

const KPI_CONFIG: Record<string, { icon: typeof Building2; color: string; link: string }> = {
  audit_universe: { icon: Building2, color: 'text-primary-600', link: '/audit-universe' },
  high_critical_risks: { icon: ShieldAlert, color: 'text-error-600', link: '/audit-risk-assessment' },
  audits_planned: { icon: CalendarCheck, color: 'text-primary-600', link: '/engagements' },
  audits_completed: { icon: CheckCircle2, color: 'text-success-600', link: '/engagements' },
  open_findings: { icon: Flag, color: 'text-error-600', link: '/findings' },
  overdue_actions: { icon: AlertTriangle, color: 'text-warning-600', link: '/action-plans' },
  evidence_in_review: { icon: FolderOpen, color: 'text-primary-600', link: '/evidence-tracker' },
  assurance_coverage: { icon: ShieldCheck, color: 'text-primary-600', link: '/assurance-map' },
};

const CHART_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280', '#ec4899', '#14b8a6'];

function BarChartViz({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" angle={-30} textAnchor="end" height={60} interval={0} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
        <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieChartViz({ data }: { data: { label: string; value: number }[] }) {
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-400">
        No data available
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label={false} labelLine={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ChartRenderer({ panel }: { panel: AnalyticsPanel }) {
  const data = panel.data;

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-neutral-900">{panel.title}</h3>
      {data.length === 0 || data.every((d) => d.value === 0) ? (
        <div className="flex h-64 flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-neutral-400">No data available</p>
          <p className="mt-1 max-w-xs text-xs text-neutral-400">{panel.description}</p>
        </div>
      ) : (
        <div className="h-64">
          {panel.chartType === 'pie' ? <PieChartViz data={data} /> : <BarChartViz data={data} />}
        </div>
      )}
    </div>
  );
}

function TrendChart({ data }: { data: { period: string; coverage: number; target: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" unit="%" />
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
        <ReferenceLine y={data[0]?.target ?? 80} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Target', fontSize: 11, fill: '#d97706' }} />
        <Line type="monotone" dataKey="coverage" stroke="#2563eb" strokeWidth={2} dot={{ r: 4, fill: '#2563eb' }} name="Coverage" unit="%" />
      </LineChart>
    </ResponsiveContainer>
  );
}

const PRIORITY_STYLES: Record<PriorityItem['priority'], string> = {
  critical: 'bg-error-50 text-error-700 border-error-200',
  high: 'bg-warning-50 text-warning-700 border-warning-200',
  medium: 'bg-primary-50 text-primary-700 border-primary-200',
  low: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};

const STATUS_STYLES: Record<PriorityItem['status'], string> = {
  open: 'bg-neutral-100 text-neutral-700',
  in_progress: 'bg-primary-50 text-primary-700',
  overdue: 'bg-error-50 text-error-700',
  closed: 'bg-success-50 text-success-700',
  pending: 'bg-warning-50 text-warning-700',
};

const STATUS_LABELS: Record<PriorityItem['status'], string> = {
  open: 'Open',
  in_progress: 'In Progress',
  overdue: 'Overdue',
  closed: 'Closed',
  pending: 'Pending',
};

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<DashboardFilters>({});
  const { data, isLoading, isError, refetch } = useDashboardMetrics(filters);

  const kpiMetrics = useMemo<KpiMetric[]>(() => data?.kpis ?? [], [data]);
  const panels = useMemo<AnalyticsPanel[]>(() => data?.panels ?? [], [data]);
  const priorityItems = useMemo<PriorityItem[]>(() => data?.priorityItems ?? [], [data]);
  const trend = data?.trend;

  if (isLoading) return <PageLoading />;

  if (isError) {
    return <ErrorState message="Failed to load dashboard metrics" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-neutral-900">Executive Dashboard</h1>
        <p className="text-sm text-neutral-500">
          Welcome back, {user?.firstName} {user?.lastName}. Here is an overview of the internal audit activity.
        </p>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        filterOptions={data?.filterOptions ?? { reportingYears: [], auditCycles: [], riskAreas: [], auditOwners: [], statuses: [] }}
        onChange={setFilters}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {kpiMetrics.map((metric) => {
          const config = KPI_CONFIG[metric.key] ?? { icon: Flag, color: 'text-primary-600', link: '/dashboard' };
          const Icon = config.icon;
          return (
            <button
              key={metric.key}
              onClick={() => navigate(config.link)}
              className="text-left transition-transform hover:scale-[1.02]"
            >
              <KpiCard
                metric={metric}
                icon={<Icon className="h-5 w-5" />}
                accentColor={config.color}
              />
            </button>
          );
        })}
      </div>

      {/* Charts grid — first row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {panels.slice(0, 4).map((panel) => (
          <ChartRenderer key={panel.key} panel={panel} />
        ))}
      </div>

      {/* Charts grid — second row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {panels.slice(4).map((panel) => (
          <ChartRenderer key={panel.key} panel={panel} />
        ))}
      </div>

      {/* Trend panel */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">Assurance Coverage Trend</h3>
        </div>
        {trend?.availability === 'available' && trend.data.length > 0 ? (
          <div className="h-72">
            <TrendChart data={trend.data} />
          </div>
        ) : (
          <div className="flex h-72 flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-neutral-400">No trend data available</p>
            <p className="mt-1 max-w-sm text-xs text-neutral-400">{trend?.description}</p>
          </div>
        )}
      </div>

      {/* Priority items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Priority Audit Items</h2>
          <button
            onClick={() => navigate('/action-plans')}
            className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            View all <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        {priorityItems.length === 0 ? (
          <EmptyState
            icon={<Flag className="h-12 w-12" />}
            title="No Priority Items"
            description="Overdue action plans and critical findings will appear here when they are created."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-4 py-2 text-left font-semibold text-neutral-600">Reference</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-600">Title</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-600">Owner</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-600">Due Date</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-600">Priority</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-600">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-neutral-600">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {priorityItems.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer hover:bg-neutral-50"
                    onClick={() => navigate(`/${item.sourceModule}`)}
                  >
                    <td className="px-4 py-2 font-medium text-neutral-900">{item.reference}</td>
                    <td className="px-4 py-2 text-neutral-700">{item.title}</td>
                    <td className="px-4 py-2 text-neutral-600">{item.owner}</td>
                    <td className="px-4 py-2 text-neutral-600">{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`badge border ${PRIORITY_STYLES[item.priority]}`}>
                        {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`badge ${STATUS_STYLES[item.status]}`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-neutral-500">{item.sourceModule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick links to reports */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Quick Reports</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => navigate('/reports')} className="btn-secondary text-sm">
            Generate Report
          </button>
          <button onClick={() => navigate('/assurance-map')} className="btn-secondary text-sm">
            Assurance Map
          </button>
          <button onClick={() => navigate('/audit-planning')} className="btn-secondary text-sm">
            Annual Audit Plan
          </button>
        </div>
      </div>
    </div>
  );
}
