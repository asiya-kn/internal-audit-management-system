import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuditRiskAssessmentPage } from '../src/pages/AuditRiskAssessment';
import { AuthContext } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import type { UserDto } from '@iams/shared';
import '@testing-library/jest-dom/vitest';

vi.mock('../src/hooks/useRisks', () => ({
  useRiskList: () => ({
    data: { items: [], total: 0, page: 1, pageSize: 20 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useRiskDetail: () => ({ data: null, isLoading: false }),
  useRiskDashboard: () => ({
    data: {
      totalRisks: 0,
      byInherentLevel: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      byResidualLevel: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      byStatus: { OPEN: 0, MITIGATING: 0, MONITORING: 0, CLOSED: 0 },
      openActions: 0,
      overdueActions: 0,
      risksWithOverdueActions: 0,
      topRisks: [],
    },
    isLoading: false,
  }),
  useCreateRisk: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useUpdateRisk: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useDeleteRisk: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateRiskAction: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useDeleteRiskAction: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../src/hooks/useAuditUniverse', () => ({
  useAuditUniverseList: () => ({
    data: { items: [], total: 0, page: 1, pageSize: 100 },
    isLoading: false,
  }),
}));

const mockUser: UserDto = {
  id: '00000000-0000-0000-0000-000000000001',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  isActive: true,
  lastLoginAt: null,
  roles: [],
  permissions: ['risk.view', 'risk.create', 'risk.update', 'risk.delete'],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });

  const authValue = {
    user: mockUser,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    hasPermission: (p: string) => mockUser.permissions.includes(p),
    refreshUser: vi.fn(),
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthContext.Provider value={authValue}>
          <ToastProvider>
            <AuditRiskAssessmentPage />
          </ToastProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AuditRiskAssessmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page title', async () => {
    renderPage();
    expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
  });

  it('should show empty state when no risks exist', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No risks found')).toBeInTheDocument();
    });
  });

  it('should show Add Risk button when user has create permission', () => {
    renderPage();
    expect(screen.getAllByText('Add Risk').length).toBeGreaterThan(0);
  });

  it('should render dashboard summary cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Total Risks')).toBeInTheDocument();
      expect(screen.getByText('Open Actions')).toBeInTheDocument();
      expect(screen.getByText('Overdue Actions')).toBeInTheDocument();
    });
  });
});