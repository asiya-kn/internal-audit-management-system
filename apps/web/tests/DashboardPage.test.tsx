import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ContextType } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '../src/pages/DashboardPage';
import { AuthContext } from '../src/context/AuthContext';

// Mock the dashboard metrics hook to return "available" data
vi.mock('../src/hooks/useDashboardMetrics', () => ({
  useDashboardMetrics: () => ({
    data: {
      kpis: [
        { key: 'audit_universe', label: 'Audit Universe', value: 42, availability: 'available', description: 'Total entities/processes in scope' },
        { key: 'high_critical_risks', label: 'High/Critical Risks', value: 5, availability: 'available', description: 'Risks rated high or critical' },
        { key: 'audits_planned', label: 'Engagements Planned', value: 8, availability: 'available', description: 'Engagements in planned status' },
        { key: 'audits_completed', label: 'Engagements Completed', value: 3, availability: 'available', description: 'Engagements completed this period' },
        { key: 'open_findings', label: 'Open Findings', value: 12, availability: 'available', description: 'Findings not yet closed' },
        { key: 'overdue_actions', label: 'Overdue Actions', value: 2, availability: 'available', description: 'Corrective actions past due date' },
        { key: 'evidence_in_review', label: 'Evidence in Review', value: 4, availability: 'available', description: 'Evidence pending review' },
        { key: 'assurance_coverage', label: 'Assurance Coverage', value: 75, availability: 'available', description: 'Percentage of entities covered' },
      ],
      panels: [
        { key: 'universe_coverage', title: 'Audit Universe Coverage', availability: 'available', description: 'Entities by type', data: [{ label: 'PROCESS', value: 10 }], chartType: 'bar' },
        { key: 'risk_inherent', title: 'Risk Distribution (Inherent)', availability: 'available', description: 'Risks by inherent level', data: [{ label: 'HIGH', value: 3 }], chartType: 'bar' },
        { key: 'risk_residual', title: 'Risk Distribution (Residual)', availability: 'available', description: 'Risks by residual level', data: [{ label: 'LOW', value: 5 }], chartType: 'bar' },
        { key: 'engagement_status', title: 'Engagement Status', availability: 'available', description: 'Engagements by status', data: [{ label: 'PLANNED', value: 8 }], chartType: 'pie' },
        { key: 'control_testing', title: 'Control Testing Outcomes', availability: 'available', description: 'Tests by outcome', data: [{ label: 'PASS', value: 15 }], chartType: 'pie' },
        { key: 'finding_severity', title: 'Findings by Severity', availability: 'available', description: 'Findings grouped by severity', data: [{ label: 'HIGH', value: 4 }], chartType: 'bar' },
        { key: 'action_status', title: 'Action Plans by Status', availability: 'available', description: 'Corrective actions by status', data: [{ label: 'OPEN', value: 6 }], chartType: 'bar' },
        { key: 'evidence_review', title: 'Evidence Review Status', availability: 'available', description: 'Evidence by review status', data: [{ label: 'DRAFT', value: 3 }], chartType: 'pie' },
      ],
      priorityItems: [
        { id: '1', reference: 'AP-001', title: 'Fix access controls', owner: 'Jane Doe', dueDate: '2026-01-15', priority: 'critical', status: 'overdue', sourceModule: 'action-plans' },
      ],
      trend: {
        availability: 'available',
        data: [
          { period: 'Jun 2026', coverage: 60, target: 80 },
          { period: 'Jul 2026', coverage: 65, target: 80 },
        ],
        description: 'Assurance coverage trend based on completed engagements and control tests.',
      },
      filterOptions: {
        reportingYears: ['2026'],
        auditCycles: [],
        riskAreas: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        auditOwners: ['Jane Doe'],
        statuses: ['PLANNED', 'IN_PROGRESS', 'COMPLETED'],
      },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

const mockAuthValue: ContextType<typeof AuthContext> = {
  user: {
    id: 'test-id',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    isActive: true,
    lastLoginAt: null,
    roles: [],
    permissions: [],
  },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  hasPermission: vi.fn(),
  refreshUser: vi.fn(),
};

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page title and welcome message', () => {
    renderDashboard();
    expect(screen.getByText('Executive Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, Test User/)).toBeInTheDocument();
  });

  it('should render all eight KPI cards with values', () => {
    renderDashboard();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('should render all analytics panel titles', () => {
    renderDashboard();
    expect(screen.getByText('Audit Universe Coverage')).toBeInTheDocument();
    expect(screen.getByText('Risk Distribution (Inherent)')).toBeInTheDocument();
    expect(screen.getByText('Risk Distribution (Residual)')).toBeInTheDocument();
    expect(screen.getByText('Engagement Status')).toBeInTheDocument();
    expect(screen.getByText('Control Testing Outcomes')).toBeInTheDocument();
    expect(screen.getByText('Findings by Severity')).toBeInTheDocument();
    expect(screen.getByText('Action Plans by Status')).toBeInTheDocument();
    expect(screen.getByText('Evidence Review Status')).toBeInTheDocument();
  });

  it('should render the Assurance Coverage Trend panel', () => {
    renderDashboard();
    expect(screen.getByText('Assurance Coverage Trend')).toBeInTheDocument();
  });

  it('should render the Priority Audit Items section with data', () => {
    renderDashboard();
    expect(screen.getByText('Priority Audit Items')).toBeInTheDocument();
    expect(screen.getByText('Fix access controls')).toBeInTheDocument();
    expect(screen.getByText('AP-001')).toBeInTheDocument();
  });

  it('should render filter dropdowns', () => {
    renderDashboard();
    expect(screen.getByLabelText('Reporting Year')).toBeInTheDocument();
    expect(screen.getByLabelText('Risk Area')).toBeInTheDocument();
    expect(screen.getByLabelText('Audit Owner')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('should render quick report links', () => {
    renderDashboard();
    expect(screen.getByText('Quick Reports')).toBeInTheDocument();
    expect(screen.getByText('Generate Report')).toBeInTheDocument();
  });
});
