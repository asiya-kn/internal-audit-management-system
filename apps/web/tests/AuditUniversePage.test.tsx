import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuditUniversePage } from '../src/pages/AuditUniversePage';
import { AuthContext } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import type { AuditUniverseListResponse, AuditUniverseDetailDto } from '@iams/shared';
import '@testing-library/jest-dom/vitest';

vi.mock('../src/hooks/useAuditUniverse', () => ({
  useAuditUniverseList: vi.fn(),
  useAuditUniverseDetail: vi.fn(),
  useCreateAuditUniverse: vi.fn(),
  useUpdateAuditUniverse: vi.fn(),
  useSetAuditUniverseStatus: vi.fn(),
  useDeleteAuditUniverse: vi.fn(),
}));

import {
  useAuditUniverseList,
  useAuditUniverseDetail,
  useCreateAuditUniverse,
  useUpdateAuditUniverse,
  useSetAuditUniverseStatus,
  useDeleteAuditUniverse,
} from '../src/hooks/useAuditUniverse';

const mockSummary = {
  id: 'entity-1',
  code: 'FIN-AP-001',
  name: 'Accounts Payable',
  entityType: 'PROCESS' as const,
  status: 'ACTIVE' as const,
  department: 'Finance',
  parentId: null,
  parentName: null,
  ownerId: null,
  ownerName: null,
  childCount: 2,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-06-01T00:00:00.000Z',
};

const mockDetail: AuditUniverseDetailDto = {
  ...mockSummary,
  description: 'AP process description',
  businessProcess: 'Procure-to-Pay',
  riskRating: 'High',
  notes: 'Internal notes here',
  children: [],
};

const mockListResponse: AuditUniverseListResponse = {
  items: [mockSummary],
  total: 1,
  page: 1,
  pageSize: 20,
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function mockMutations() {
  const mutate = vi.fn();
  ;(useCreateAuditUniverse as ReturnType<typeof vi.fn>).mockReturnValue({
    mutate, mutateAsync: vi.fn(), isPending: false, isError: false, error: null,
  });
  ;(useUpdateAuditUniverse as ReturnType<typeof vi.fn>).mockReturnValue({
    mutate, mutateAsync: vi.fn(), isPending: false, isError: false, error: null,
  });
  ;(useSetAuditUniverseStatus as ReturnType<typeof vi.fn>).mockReturnValue({
    mutate, mutateAsync: vi.fn(), isPending: false, isError: false, error: null,
  });
  ;(useDeleteAuditUniverse as ReturnType<typeof vi.fn>).mockReturnValue({
    mutate, mutateAsync: vi.fn(), isPending: false, isError: false, error: null,
  });
}

function renderPage(permissions: string[] = [
  'audit_universe.view',
  'audit_universe.create',
  'audit_universe.update',
  'audit_universe.delete',
]) {
  const mockAuthValue = {
    user: {
      id: 'test-id',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      isActive: true,
      lastLoginAt: null,
      roles: [],
      permissions,
    },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    hasPermission: (perm: string) => permissions.includes(perm),
    refreshUser: vi.fn(),
  };

  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthContext.Provider value={mockAuthValue}>
        <ToastProvider>
          <MemoryRouter>
            <AuditUniversePage />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function setListMock(returnValue: {
  data?: AuditUniverseListResponse;
  isLoading: boolean;
  isError: boolean;
  refetch: ReturnType<typeof vi.fn>;
}) {
  ;(useAuditUniverseList as ReturnType<typeof vi.fn>).mockReturnValue(returnValue);
}

describe('AuditUniversePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutations();
    ;(useAuditUniverseDetail as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null, isLoading: false, isError: false,
    });
  });

  it('should show loading spinner while fetching list', () => {
    setListMock({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() });
    renderPage();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should show error state when list fetch fails', () => {
    setListMock({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText(/Failed to load audit universe/i)).toBeInTheDocument();
  });

  it('should show empty state when no entities exist', () => {
    setListMock({ data: { items: [], total: 0, page: 1, pageSize: 20 }, isLoading: false, isError: false, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText(/No audit entities found/i)).toBeInTheDocument();
  });

  it('should render entity rows when data is loaded', () => {
    setListMock({ data: mockListResponse, isLoading: false, isError: false, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('FIN-AP-001')).toBeInTheDocument();
    expect(screen.getByText('Accounts Payable')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('should hide Add Entity button when user lacks create permission', () => {
    setListMock({ data: mockListResponse, isLoading: false, isError: false, refetch: vi.fn() });
    renderPage(['audit_universe.view']);
    expect(screen.queryByText('Add Entity')).not.toBeInTheDocument();
  });

  it('should hide edit/delete buttons when user lacks update and delete permissions', () => {
    setListMock({ data: mockListResponse, isLoading: false, isError: false, refetch: vi.fn() });
    renderPage(['audit_universe.view']);
    expect(screen.getByLabelText('View details')).toBeInTheDocument();
    expect(screen.queryByLabelText('Edit entity')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete entity')).not.toBeInTheDocument();
  });

  it('should show edit but hide delete when user has update but not delete', () => {
    setListMock({ data: mockListResponse, isLoading: false, isError: false, refetch: vi.fn() });
    renderPage(['audit_universe.view', 'audit_universe.update']);
    expect(screen.getByLabelText('Edit entity')).toBeInTheDocument();
    expect(screen.queryByLabelText('Delete entity')).not.toBeInTheDocument();
  });

  it('should render search input and filter dropdowns', () => {
    setListMock({ data: mockListResponse, isLoading: false, isError: false, refetch: vi.fn() });
    renderPage();
    expect(screen.getByPlaceholderText('Search by name, code, or description...')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by entity type')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    expect(screen.getByText('Include archived')).toBeInTheDocument();
  });

  it('should open detail drawer when entity name is clicked', async () => {
    setListMock({ data: mockListResponse, isLoading: false, isError: false, refetch: vi.fn() });
    ;(useAuditUniverseDetail as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockDetail, isLoading: false, isError: false,
    });
    renderPage();
    fireEvent.click(screen.getByText('Accounts Payable'));
    await waitFor(() => {
      expect(screen.getByText('Entity Details')).toBeInTheDocument();
    });
    expect(screen.getByText('Procure-to-Pay')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('should open create form when Add Entity is clicked', () => {
    setListMock({ data: mockListResponse, isLoading: false, isError: false, refetch: vi.fn() });
    renderPage();
    fireEvent.click(screen.getByText('Add Entity'));
    expect(screen.getByText('Add Audit Entity')).toBeInTheDocument();
  });

  it('should show confirm dialog when delete is clicked', () => {
    setListMock({ data: mockListResponse, isLoading: false, isError: false, refetch: vi.fn() });
    renderPage();
    fireEvent.click(screen.getByLabelText('Delete entity'));
    expect(screen.getByText('Delete Audit Entity')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
  });

  it('should show pagination when total exceeds page size', () => {
    setListMock({
      data: { items: [mockSummary], total: 50, page: 1, pageSize: 20 },
      isLoading: false, isError: false, refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('should show single-page pagination when total fits one page', () => {
    setListMock({ data: mockListResponse, isLoading: false, isError: false, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });
});
