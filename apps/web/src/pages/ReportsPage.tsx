import { useState } from 'react';
import {
  FileText, FileBarChart, ShieldAlert, Building2, CalendarCheck,
  SlidersHorizontal, Flag, CheckSquare, FolderOpen, Network,
  Printer, Loader2, BarChart3, PieChart,
} from 'lucide-react';
import {
  REPORT_TYPES,
  type ReportType, type ReportFilters, type ReportDataDto,
} from '@iams/shared';
import { useAuth } from '../context/AuthContext';
import { useGenerateReport } from '../hooks/useReports';
import { useEngagementList } from '../hooks/useEngagements';
import { useAuditUniverseList } from '../hooks/useAuditUniverse';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';

const reportIcons: Record<ReportType, React.ReactNode> = {
  EXECUTIVE_SUMMARY: <FileBarChart className="h-5 w-5" />,
  AUDIT_ENGAGEMENT: <FileText className="h-5 w-5" />,
  RISK_ASSESSMENT: <ShieldAlert className="h-5 w-5" />,
  AUDIT_UNIVERSE: <Building2 className="h-5 w-5" />,
  AUDIT_PLAN_PROGRESS: <CalendarCheck className="h-5 w-5" />,
  CONTROL_TESTING: <SlidersHorizontal className="h-5 w-5" />,
  AUDIT_FINDINGS: <Flag className="h-5 w-5" />,
  ACTION_PLANS: <CheckSquare className="h-5 w-5" />,
  EVIDENCE_SUMMARY: <FolderOpen className="h-5 w-5" />,
  ASSURANCE_COVERAGE: <Network className="h-5 w-5" />,
};

function MiniBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="w-24 text-xs font-medium text-neutral-600">{d.label}</span>
          <div className="h-5 flex-1 rounded bg-neutral-100 overflow-hidden">
            <div className="h-full rounded bg-primary-500 transition-all" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="w-8 text-right text-xs font-medium text-neutral-700">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function MiniPieChart({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280', '#ec4899', '#14b8a6'];
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-32 w-32">
        {total === 0 ? (
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="16" />
        ) : (
          data.map((d, i) => {
            const pct = (d.value / total) * 100;
            const dash = (pct / 100) * 251.2;
            const el = (
              <circle
                key={d.label}
                cx="50" cy="50" r="40" fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth="16"
                strokeDasharray={`${dash} 251.2`}
                strokeDashoffset={-offset}
                transform="rotate(-90 50 50)"
              />
            );
            offset += dash;
            return el;
          })
        )}
      </svg>
      <div className="space-y-1">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-3 w-3 rounded" style={{ background: colors[i % colors.length] }} />
            <span className="text-neutral-600">{d.label}</span>
            <span className="font-medium text-neutral-900">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('reports.view');

  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [filters, setFilters] = useState<ReportFilters | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [engagementId, setEngagementId] = useState('');
  const [auditEntityId, setAuditEntityId] = useState('');
  const [fiscalYear, setFiscalYear] = useState('');

  const engagementsQuery = useEngagementList({ pageSize: 100 });
  const auditEntitiesQuery = useAuditUniverseList({ pageSize: 100 });
  const reportQuery = useGenerateReport(filters);

  function generateReport() {
    if (!selectedReport) return;
    setFilters({
      reportType: selectedReport,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      engagementId: engagementId || undefined,
      auditEntityId: auditEntityId || undefined,
      fiscalYear: fiscalYear ? Number(fiscalYear) : undefined,
    });
  }

  function handlePrint() {
    window.print();
  }

  if (!canView) {
    return <EmptyState title="Access Restricted" description="You do not have permission to view reports." />;
  }

  const report: ReportDataDto | undefined = reportQuery.data;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-neutral-900">Reports</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Generate comprehensive audit reports from live data across all modules. Select a report type, apply filters, and preview or print the results.
        </p>
      </div>

      {/* Report type selection grid */}
      <div className="print:hidden">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Select a Report</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_TYPES.map((r) => (
            <button
              key={r.value}
              onClick={() => setSelectedReport(r.value)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                selectedReport === r.value
                  ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${selectedReport === r.value ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-600'}`}>
                {reportIcons[r.value]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-neutral-900">{r.label}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{r.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters bar */}
      {selectedReport && (
        <div className="print:hidden rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-neutral-700">Filters & Options</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-600">Date From</label>
              <Input name="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-600">Date To</label>
              <Input name="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-600">Engagement</label>
              <select className="input w-auto" value={engagementId} onChange={(e) => setEngagementId(e.target.value)}>
                <option value="">All</option>
                {(engagementsQuery.data?.items ?? []).map((eng) => (
                  <option key={eng.id} value={eng.id}>{eng.reference} — {eng.title}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-600">Audit Entity</label>
              <select className="input w-auto" value={auditEntityId} onChange={(e) => setAuditEntityId(e.target.value)}>
                <option value="">All</option>
                {(auditEntitiesQuery.data?.items ?? []).map((ent) => (
                  <option key={ent.id} value={ent.id}>{ent.code} — {ent.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-600">Fiscal Year</label>
              <Input name="fiscalYear" type="number" value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} placeholder="2026" className="w-24" />
            </div>
            <Button onClick={generateReport} disabled={!selectedReport || reportQuery.isFetching}>
              {reportQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Generate Report
            </Button>
          </div>
        </div>
      )}

      {/* Report preview */}
      {reportQuery.isError && (
        <ErrorState message="Failed to generate report" onRetry={() => reportQuery.refetch()} />
      )}

      {report && (
        <div className="space-y-6">
          {/* Print header (only visible when printing) */}
          <div className="hidden print:block">
            <h1 className="text-2xl font-bold">{report.reportTitle}</h1>
            <p className="text-sm text-neutral-600">Generated: {new Date(report.generatedAt).toLocaleString()}</p>
          </div>

          {/* Report toolbar */}
          <div className="print:hidden flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">{report.reportTitle}</h2>
              <p className="text-xs text-neutral-500">Generated on {new Date(report.generatedAt).toLocaleString()}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4" />Print / Save PDF
            </Button>
          </div>

          {/* Summary section */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-neutral-700">{report.summary.title}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {report.summary.rows.map((r) => (
                <div key={r.label} className="rounded-lg bg-neutral-50 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{r.label}</p>
                  <p className="text-lg font-bold text-neutral-900">{r.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          {report.charts.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {report.charts.map((chart) => (
                <div key={chart.title} className="rounded-xl border border-neutral-200 bg-white p-5">
                  <div className="mb-4 flex items-center gap-2">
                    {chart.type === 'bar' ? <BarChart3 className="h-4 w-4 text-neutral-500" /> : <PieChart className="h-4 w-4 text-neutral-500" />}
                    <h3 className="text-sm font-semibold text-neutral-700">{chart.title}</h3>
                  </div>
                  {chart.type === 'bar' ? <MiniBarChart data={chart.data} /> : <MiniPieChart data={chart.data} />}
                </div>
              ))}
            </div>
          )}

          {/* Tables */}
          {report.tables.map((table) => (
            <div key={table.title} className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-neutral-700">{table.title}</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    {table.columns.map((col) => (
                      <th key={col.key} className="px-4 py-2 text-left font-semibold text-neutral-600 whitespace-nowrap">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {table.rows.length === 0 ? (
                    <tr><td colSpan={table.columns.length} className="px-4 py-6 text-center text-neutral-400">No data available</td></tr>
                  ) : (
                    table.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-neutral-50">
                        {table.columns.map((col) => (
                          <td key={col.key} className="px-4 py-2 text-neutral-700 whitespace-nowrap">{row[col.key] ?? '—'}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {!report && !reportQuery.isError && !reportQuery.isFetching && selectedReport && (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="Ready to generate"
          description="Click 'Generate Report' to preview the report with the selected filters."
        />
      )}

      {!selectedReport && (
        <EmptyState
          icon={<FileBarChart className="h-12 w-12" />}
          title="Select a report type"
          description="Choose a report from the options above to begin generating audit reports from your live data."
        />
      )}
    </div>
  );
}
