// =============================================================================
// Shared API contracts and domain types for IAMS
// Used by both frontend and backend — no server-only imports here.
// =============================================================================

// ---- Generic API envelope ----

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---- Auth ----

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserDto;
}

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  roles: RoleDto[];
  permissions: string[];
}

export interface RoleDto {
  id: string;
  name: string;
  description: string | null;
}

// ---- Health ----

export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
  };
}

// ---- Navigation ----

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  permission?: string;
}

// ---- Dashboard ----

export type MetricAvailability = 'available' | 'not_available';

export interface KpiMetric {
  key: string;
  label: string;
  value: number | null;
  availability: MetricAvailability;
  description: string;
  trend?: { direction: 'up' | 'down' | 'flat'; percentage: number } | null;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  category?: string;
}

export interface AnalyticsPanel {
  key: string;
  title: string;
  availability: MetricAvailability;
  description: string;
  data: ChartDataPoint[];
  chartType: 'bar' | 'pie' | 'line' | 'heatmap' | 'calendar' | 'grouped-bar';
}

export interface PriorityItem {
  id: string;
  reference: string;
  title: string;
  owner: string;
  dueDate: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'overdue' | 'closed' | 'pending';
  sourceModule: string;
}

export interface TrendPoint {
  period: string;
  coverage: number;
  target: number;
}

export interface DashboardFilters {
  reportingYear?: string;
  auditCycle?: string;
  riskArea?: string;
  auditOwner?: string;
  status?: string;
}

export interface DashboardMetricsResponse {
  kpis: KpiMetric[];
  panels: AnalyticsPanel[];
  priorityItems: PriorityItem[];
  trend: {
    availability: MetricAvailability;
    data: TrendPoint[];
    description: string;
  };
  filterOptions: {
    reportingYears: string[];
    auditCycles: string[];
    riskAreas: string[];
    auditOwners: string[];
    statuses: string[];
  };
}

// ---- Audit Universe ----

export type AuditEntityType =
  | 'ORGANIZATION'
  | 'DIVISION'
  | 'DEPARTMENT'
  | 'PROCESS'
  | 'SUB_PROCESS'
  | 'SYSTEM'
  | 'PROJECT'
  | 'THIRD_PARTY'
  | 'LOCATION';

export type AuditEntityStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export const AUDIT_ENTITY_TYPES: AuditEntityType[] = [
  'ORGANIZATION',
  'DIVISION',
  'DEPARTMENT',
  'PROCESS',
  'SUB_PROCESS',
  'SYSTEM',
  'PROJECT',
  'THIRD_PARTY',
  'LOCATION',
];

export const AUDIT_ENTITY_STATUSES: AuditEntityStatus[] = [
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
];

export interface AuditUniverseSummaryDto {
  id: string;
  code: string;
  name: string;
  entityType: AuditEntityType;
  status: AuditEntityStatus;
  department: string | null;
  parentId: string | null;
  parentName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  childCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditUniverseDetailDto extends AuditUniverseSummaryDto {
  description: string | null;
  businessProcess: string | null;
  riskRating: string | null;
  notes: string | null;
  children: AuditUniverseSummaryDto[];
}

export interface CreateAuditUniverseRequest {
  code: string;
  name: string;
  description?: string;
  entityType: AuditEntityType;
  status?: AuditEntityStatus;
  parentId?: string | null;
  businessProcess?: string;
  department?: string;
  riskRating?: string;
  notes?: string;
  ownerId?: string | null;
}

export interface UpdateAuditUniverseRequest {
  code?: string;
  name?: string;
  description?: string | null;
  entityType?: AuditEntityType;
  status?: AuditEntityStatus;
  parentId?: string | null;
  businessProcess?: string | null;
  department?: string | null;
  riskRating?: string | null;
  notes?: string | null;
  ownerId?: string | null;
}

export interface AuditUniverseFilters {
  search?: string;
  entityType?: AuditEntityType;
  status?: AuditEntityStatus;
  parentId?: string;
  ownerId?: string;
  department?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface AuditUniverseListResponse {
  items: AuditUniverseSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
}

export type CreateAuditUniverseInput = CreateAuditUniverseRequest;
export type UpdateAuditUniverseInput = UpdateAuditUniverseRequest;
export type ListAuditUniverseInput = AuditUniverseFilters;

// ---- Risk Assessment ----

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskStatus = 'OPEN' | 'MITIGATING' | 'MONITORING' | 'CLOSED';
export type ActionStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';

export const RISK_LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const RISK_STATUSES: RiskStatus[] = ['OPEN', 'MITIGATING', 'MONITORING', 'CLOSED'];
export const ACTION_STATUSES: ActionStatus[] = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED'];

export function scoreToLevel(score: number): RiskLevel {
  if (score >= 20) return 'CRITICAL';
  if (score >= 12) return 'HIGH';
  if (score >= 6) return 'MEDIUM';
  return 'LOW';
}

export function residualScore(inherentScore: number, controlEffectiveness: number): number {
  const reduction = Math.max(0, Math.min(100, controlEffectiveness)) / 100;
  return Math.max(1, Math.round(inherentScore * (1 - reduction)));
}

export interface RiskActionDto {
  id: string;
  riskId: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  completedAt: string | null;
  status: ActionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RiskSummaryDto {
  id: string;
  title: string;
  auditEntityId: string;
  auditEntityCode: string;
  auditEntityName: string;
  inherentScore: number;
  inherentLevel: RiskLevel;
  residualScore: number;
  residualLevel: RiskLevel;
  controlEffectiveness: number;
  status: RiskStatus;
  riskCategory: string | null;
  ownerId: string | null;
  ownerName: string | null;
  actionCount: number;
  overdueActionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RiskDetailDto extends RiskSummaryDto {
  description: string | null;
  inherentLikelihood: number;
  inherentImpact: number;
  existingControls: string | null;
  notes: string | null;
  actions: RiskActionDto[];
}

export interface CreateRiskRequest {
  title: string;
  description?: string;
  auditEntityId: string;
  inherentLikelihood: number;
  inherentImpact: number;
  existingControls?: string;
  controlEffectiveness?: number;
  riskCategory?: string;
  notes?: string;
  ownerId?: string | null;
}

export interface UpdateRiskRequest {
  title?: string;
  description?: string | null;
  auditEntityId?: string;
  inherentLikelihood?: number;
  inherentImpact?: number;
  existingControls?: string | null;
  controlEffectiveness?: number;
  status?: RiskStatus;
  riskCategory?: string | null;
  notes?: string | null;
  ownerId?: string | null;
}

export interface RiskFilters {
  search?: string;
  auditEntityId?: string;
  status?: RiskStatus;
  inherentLevel?: RiskLevel;
  residualLevel?: RiskLevel;
  ownerId?: string;
  riskCategory?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RiskListResponse {
  items: RiskSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateRiskActionRequest {
  title: string;
  description?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  status?: ActionStatus;
}

export interface UpdateRiskActionRequest {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  status?: ActionStatus;
}

export interface RiskDashboardDto {
  totalRisks: number;
  byInherentLevel: Record<RiskLevel, number>;
  byResidualLevel: Record<RiskLevel, number>;
  byStatus: Record<RiskStatus, number>;
  openActions: number;
  overdueActions: number;
  risksWithOverdueActions: number;
  topRisks: RiskSummaryDto[];
}

export type CreateRiskInput = CreateRiskRequest;
export type UpdateRiskInput = UpdateRiskRequest;
export type ListRiskInput = RiskFilters;
export type CreateRiskActionInput = CreateRiskActionRequest;
export type UpdateRiskActionInput = UpdateRiskActionRequest;

// ---- Audit Planning ----

export type AuditPlanStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type AuditPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const AUDIT_PLAN_STATUSES: AuditPlanStatus[] = [
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

export const AUDIT_PRIORITIES: AuditPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

// Valid status transitions for the audit plan workflow
export const AUDIT_PLAN_TRANSITIONS: Record<AuditPlanStatus, AuditPlanStatus[]> = {
  DRAFT: ['IN_REVIEW', 'CANCELLED'],
  IN_REVIEW: ['APPROVED', 'DRAFT', 'CANCELLED'],
  APPROVED: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: AuditPlanStatus, to: AuditPlanStatus): boolean {
  return AUDIT_PLAN_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface AuditPlanSummaryDto {
  id: string;
  reference: string;
  title: string;
  fiscalYear: number;
  auditEntityId: string;
  auditEntityCode: string;
  auditEntityName: string;
  riskId: string | null;
  riskTitle: string | null;
  priority: AuditPriority;
  status: AuditPlanStatus;
  proposedStartDate: string | null;
  proposedEndDate: string | null;
  leadAuditorId: string | null;
  leadAuditorName: string | null;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditPlanDetailDto extends AuditPlanSummaryDto {
  objectives: string;
  scope: string;
  estimatedResources: string | null;
  planningRationale: string | null;
  notes: string | null;
  riskInherentLevel: string | null;
  riskResidualLevel: string | null;
}

export interface CreateAuditPlanRequest {
  title: string;
  reference: string;
  fiscalYear: number;
  auditEntityId: string;
  riskId?: string | null;
  objectives: string;
  scope: string;
  priority?: AuditPriority;
  proposedStartDate?: string | null;
  proposedEndDate?: string | null;
  estimatedResources?: string | null;
  planningRationale?: string | null;
  leadAuditorId?: string | null;
  notes?: string;
}

export interface UpdateAuditPlanRequest {
  title?: string;
  reference?: string;
  fiscalYear?: number;
  auditEntityId?: string;
  riskId?: string | null;
  objectives?: string;
  scope?: string;
  priority?: AuditPriority;
  proposedStartDate?: string | null;
  proposedEndDate?: string | null;
  estimatedResources?: string | null;
  planningRationale?: string | null;
  leadAuditorId?: string | null;
  notes?: string | null;
}

export interface AuditPlanFilters {
  search?: string;
  fiscalYear?: number;
  auditEntityId?: string;
  riskId?: string;
  status?: AuditPlanStatus;
  priority?: AuditPriority;
  leadAuditorId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditPlanListResponse {
  items: AuditPlanSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TransitionAuditPlanRequest {
  status: AuditPlanStatus;
}

export interface AuditPlanDashboardDto {
  totalPlans: number;
  byStatus: Record<AuditPlanStatus, number>;
  byPriority: Record<AuditPriority, number>;
  byFiscalYear: { fiscalYear: number; count: number }[];
  entityCoverage: {
    totalEntities: number;
    entitiesWithPlan: number;
    coveragePct: number;
  };
  upcomingAudits: AuditPlanSummaryDto[];
  highPriorityCount: number;
  pendingApprovalCount: number;
}

export type CreateAuditPlanInput = CreateAuditPlanRequest;
export type UpdateAuditPlanInput = UpdateAuditPlanRequest;
export type ListAuditPlanInput = AuditPlanFilters;

// ---- Audit Engagements ----

export type EngagementStatus =
  | 'PLANNED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ON_HOLD';

export type EngagementType =
  | 'INTERNAL_AUDIT'
  | 'COMPLIANCE_AUDIT'
  | 'IT_AUDIT'
  | 'OPERATIONAL_AUDIT'
  | 'FINANCIAL_AUDIT'
  | 'FOLLOW_UP'
  | 'SPECIAL_REVIEW'
  | 'AD_HOC';

export type TeamMemberRole =
  | 'LEAD_AUDITOR'
  | 'AUDITOR'
  | 'OBSERVER'
  | 'SUBJECT_MATTER_EXPERT'
  | 'REVIEWER';

export const ENGAGEMENT_STATUSES: EngagementStatus[] = [
  'PLANNED',
  'ASSIGNED',
  'IN_PROGRESS',
  'IN_REVIEW',
  'COMPLETED',
  'CANCELLED',
  'ON_HOLD',
];

export const ENGAGEMENT_TYPES: EngagementType[] = [
  'INTERNAL_AUDIT',
  'COMPLIANCE_AUDIT',
  'IT_AUDIT',
  'OPERATIONAL_AUDIT',
  'FINANCIAL_AUDIT',
  'FOLLOW_UP',
  'SPECIAL_REVIEW',
  'AD_HOC',
];

export const TEAM_MEMBER_ROLES: TeamMemberRole[] = [
  'LEAD_AUDITOR',
  'AUDITOR',
  'OBSERVER',
  'SUBJECT_MATTER_EXPERT',
  'REVIEWER',
];

export const ENGAGEMENT_TRANSITIONS: Record<EngagementStatus, EngagementStatus[]> = {
  PLANNED: ['ASSIGNED', 'CANCELLED', 'ON_HOLD'],
  ASSIGNED: ['IN_PROGRESS', 'PLANNED', 'CANCELLED', 'ON_HOLD'],
  IN_PROGRESS: ['IN_REVIEW', 'ON_HOLD', 'CANCELLED'],
  IN_REVIEW: ['COMPLETED', 'IN_PROGRESS', 'ON_HOLD'],
  COMPLETED: [],
  CANCELLED: [],
  ON_HOLD: ['PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
};

export function canTransitionEngagement(from: EngagementStatus, to: EngagementStatus): boolean {
  return ENGAGEMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface EngagementTeamMemberDto {
  engagementId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: TeamMemberRole;
  assignedAt: string;
}

export interface EngagementSummaryDto {
  id: string;
  reference: string;
  title: string;
  auditPlanId: string | null;
  auditPlanReference: string | null;
  auditEntityId: string;
  auditEntityCode: string;
  auditEntityName: string;
  riskId: string | null;
  riskTitle: string | null;
  type: EngagementType;
  status: EngagementStatus;
  leadAuditorId: string | null;
  leadAuditorName: string | null;
  startDate: string | null;
  endDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  teamMemberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EngagementDetailDto extends EngagementSummaryDto {
  objectives: string;
  scope: string;
  methodology: string | null;
  estimatedResources: string | null;
  closedAt: string | null;
  closedById: string | null;
  closedByName: string | null;
  closureNotes: string | null;
  riskInherentLevel: string | null;
  riskResidualLevel: string | null;
  teamMembers: EngagementTeamMemberDto[];
}

export interface CreateEngagementRequest {
  reference: string;
  title: string;
  auditPlanId?: string | null;
  auditEntityId: string;
  riskId?: string | null;
  type?: EngagementType;
  objectives: string;
  scope: string;
  methodology?: string;
  estimatedResources?: string | null;
  leadAuditorId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  teamMemberUserIds?: string[];
}

export interface UpdateEngagementRequest {
  reference?: string;
  title?: string;
  auditPlanId?: string | null;
  auditEntityId?: string;
  riskId?: string | null;
  type?: EngagementType;
  objectives?: string;
  scope?: string;
  methodology?: string | null;
  estimatedResources?: string | null;
  leadAuditorId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface TransitionEngagementRequest {
  status: EngagementStatus;
  closureNotes?: string;
}

export interface AddTeamMemberRequest {
  userId: string;
  role?: TeamMemberRole;
}

export interface UpdateTeamMemberRequest {
  role: TeamMemberRole;
}

export interface EngagementFilters {
  search?: string;
  auditPlanId?: string;
  auditEntityId?: string;
  riskId?: string;
  status?: EngagementStatus;
  type?: EngagementType;
  leadAuditorId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EngagementListResponse {
  items: EngagementSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EngagementDashboardDto {
  totalEngagements: number;
  byStatus: Record<EngagementStatus, number>;
  byType: Record<EngagementType, number>;
  activeCount: number;
  completedCount: number;
  plannedFromAuditPlan: number;
  upcomingEngagements: EngagementSummaryDto[];
  overdueEngagements: number;
}

export type CreateEngagementInput = CreateEngagementRequest;
export type UpdateEngagementInput = UpdateEngagementRequest;
export type ListEngagementInput = EngagementFilters;

// ---- Audit Findings ----

export type FindingCategory =
  | 'INTERNAL_CONTROL'
  | 'COMPLIANCE'
  | 'OPERATIONAL'
  | 'FINANCIAL'
  | 'IT_GENERAL_CONTROLS'
  | 'DATA_QUALITY'
  | 'GOVERNANCE'
  | 'FRAUD'
  | 'OTHER';

export type FindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FindingStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'MANAGEMENT_RESPONSE'
  | 'ACTION_PLAN'
  | 'REMEDIATED'
  | 'VERIFIED'
  | 'CLOSED'
  | 'CANCELLED';

export const FINDING_CATEGORIES: FindingCategory[] = [
  'INTERNAL_CONTROL',
  'COMPLIANCE',
  'OPERATIONAL',
  'FINANCIAL',
  'IT_GENERAL_CONTROLS',
  'DATA_QUALITY',
  'GOVERNANCE',
  'FRAUD',
  'OTHER',
];

export const FINDING_SEVERITIES: FindingSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const FINDING_STATUSES: FindingStatus[] = [
  'DRAFT',
  'OPEN',
  'MANAGEMENT_RESPONSE',
  'ACTION_PLAN',
  'REMEDIATED',
  'VERIFIED',
  'CLOSED',
  'CANCELLED',
];

export const FINDING_TRANSITIONS: Record<FindingStatus, FindingStatus[]> = {
  DRAFT: ['OPEN', 'CANCELLED'],
  OPEN: ['MANAGEMENT_RESPONSE', 'ACTION_PLAN', 'CANCELLED'],
  MANAGEMENT_RESPONSE: ['ACTION_PLAN', 'OPEN', 'CANCELLED'],
  ACTION_PLAN: ['REMEDIATED', 'OPEN', 'CANCELLED'],
  REMEDIATED: ['VERIFIED', 'ACTION_PLAN'],
  VERIFIED: ['CLOSED', 'REMEDIATED'],
  CLOSED: [],
  CANCELLED: [],
};

export function canTransitionFinding(from: FindingStatus, to: FindingStatus): boolean {
  return FINDING_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface FindingSummaryDto {
  id: string;
  reference: string;
  title: string;
  engagementId: string | null;
  engagementReference: string | null;
  auditEntityId: string;
  auditEntityCode: string;
  auditEntityName: string;
  category: FindingCategory;
  severity: FindingSeverity;
  status: FindingStatus;
  responsibleOwnerId: string | null;
  responsibleOwnerName: string | null;
  targetResolutionDate: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FindingDetailDto extends FindingSummaryDto {
  condition: string;
  criteria: string | null;
  cause: string | null;
  impact: string | null;
  recommendations: string | null;
  managementResponse: string | null;
  managementRespondedAt: string | null;
  managementRespondedById: string | null;
  managementRespondedByName: string | null;
  closedAt: string | null;
  verifiedAt: string | null;
  verifiedById: string | null;
  verifiedByName: string | null;
  verificationNotes: string | null;
  createdById: string | null;
  createdByName: string | null;
}

export interface CreateFindingRequest {
  reference: string;
  title: string;
  engagementId?: string | null;
  auditEntityId: string;
  category?: FindingCategory;
  severity?: FindingSeverity;
  condition: string;
  criteria?: string;
  cause?: string;
  impact?: string;
  recommendations?: string;
  responsibleOwnerId?: string | null;
  targetResolutionDate?: string | null;
}

export interface UpdateFindingRequest {
  title?: string;
  engagementId?: string | null;
  auditEntityId?: string;
  category?: FindingCategory;
  severity?: FindingSeverity;
  condition?: string;
  criteria?: string | null;
  cause?: string | null;
  impact?: string | null;
  recommendations?: string | null;
  responsibleOwnerId?: string | null;
  targetResolutionDate?: string | null;
}

export interface TransitionFindingRequest {
  status: FindingStatus;
  managementResponse?: string;
  verificationNotes?: string;
}

export interface FindingFilters {
  search?: string;
  engagementId?: string;
  auditEntityId?: string;
  category?: FindingCategory;
  severity?: FindingSeverity;
  status?: FindingStatus;
  responsibleOwnerId?: string;
  overdue?: boolean | 'true' | 'false';
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FindingListResponse {
  items: FindingSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FindingDashboardDto {
  totalFindings: number;
  bySeverity: Record<FindingSeverity, number>;
  byStatus: Record<FindingStatus, number>;
  byCategory: Partial<Record<FindingCategory, number>>;
  openCount: number;
  overdueCount: number;
  remediatedCount: number;
  verifiedCount: number;
  closedCount: number;
  recentFindings: FindingSummaryDto[];
}

export type CreateFindingInput = CreateFindingRequest;
export type UpdateFindingInput = UpdateFindingRequest;
export type ListFindingInput = FindingFilters;

// ---- Control Testing ----

export type ControlTestStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'TESTED'
  | 'REVIEWED'
  | 'EXCEPTION'
  | 'CANCELLED';

export type ControlTestOutcome =
  | 'PASS'
  | 'FAIL'
  | 'PASS_WITH_EXCEPTION'
  | 'NOT_APPLICABLE'
  | 'INCONCLUSIVE';

export const CONTROL_TEST_STATUSES: ControlTestStatus[] = [
  'PLANNED',
  'IN_PROGRESS',
  'TESTED',
  'REVIEWED',
  'EXCEPTION',
  'CANCELLED',
];

export const CONTROL_TEST_OUTCOMES: ControlTestOutcome[] = [
  'PASS',
  'FAIL',
  'PASS_WITH_EXCEPTION',
  'NOT_APPLICABLE',
  'INCONCLUSIVE',
];

export const CONTROL_TEST_TRANSITIONS: Record<ControlTestStatus, ControlTestStatus[]> = {
  PLANNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['TESTED', 'CANCELLED'],
  TESTED: ['REVIEWED', 'IN_PROGRESS', 'EXCEPTION'],
  REVIEWED: [],
  EXCEPTION: ['IN_PROGRESS', 'CANCELLED'],
  CANCELLED: [],
};

export function canTransitionControlTest(from: ControlTestStatus, to: ControlTestStatus): boolean {
  return CONTROL_TEST_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface ControlTestSummaryDto {
  id: string;
  reference: string;
  title: string;
  engagementId: string | null;
  engagementReference: string | null;
  auditEntityId: string | null;
  auditEntityCode: string | null;
  auditEntityName: string | null;
  riskId: string | null;
  riskTitle: string | null;
  controlReference: string | null;
  status: ControlTestStatus;
  outcome: ControlTestOutcome | null;
  testerId: string | null;
  testerName: string | null;
  reviewerId: string | null;
  reviewerName: string | null;
  testedAt: string | null;
  reviewedAt: string | null;
  findingId: string | null;
  findingReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ControlTestDetailDto extends ControlTestSummaryDto {
  objective: string;
  procedures: string;
  criteria: string | null;
  sampleDescription: string | null;
  sampleSize: number | null;
  expectedResult: string | null;
  actualResult: string | null;
  exceptions: string | null;
  conclusion: string | null;
  evidenceReference: string | null;
  testerNotes: string | null;
  reviewerNotes: string | null;
  createdById: string | null;
  createdByName: string | null;
}

export interface CreateControlTestRequest {
  reference: string;
  title: string;
  engagementId?: string | null;
  auditEntityId?: string | null;
  riskId?: string | null;
  controlReference?: string;
  objective: string;
  procedures: string;
  criteria?: string;
  sampleDescription?: string;
  sampleSize?: number;
  expectedResult?: string;
  testerId?: string | null;
}

export interface UpdateControlTestRequest {
  title?: string;
  engagementId?: string | null;
  auditEntityId?: string | null;
  riskId?: string | null;
  controlReference?: string | null;
  objective?: string;
  procedures?: string;
  criteria?: string | null;
  sampleDescription?: string | null;
  sampleSize?: number | null;
  expectedResult?: string | null;
  testerId?: string | null;
}

export interface RecordControlTestResultRequest {
  actualResult: string;
  outcome: ControlTestOutcome;
  exceptions?: string;
  conclusion?: string;
  evidenceReference?: string;
  testedAt?: string;
  testerNotes?: string;
}

export interface ReviewControlTestRequest {
  reviewerNotes?: string;
  reviewedAt?: string;
}

export interface LinkFindingControlTestRequest {
  findingId: string;
}

export interface TransitionControlTestRequest {
  status: ControlTestStatus;
}

export interface ControlTestFilters {
  search?: string;
  engagementId?: string;
  auditEntityId?: string;
  riskId?: string;
  status?: ControlTestStatus;
  outcome?: ControlTestOutcome;
  testerId?: string;
  reviewerId?: string;
  findingId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ControlTestListResponse {
  items: ControlTestSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ControlTestDashboardDto {
  totalTests: number;
  byStatus: Record<ControlTestStatus, number>;
  byOutcome: Record<ControlTestOutcome, number>;
  passCount: number;
  failCount: number;
  exceptionCount: number;
  pendingReviewCount: number;
  linkedFindingsCount: number;
  recentTests: ControlTestSummaryDto[];
}

export type CreateControlTestInput = CreateControlTestRequest;
export type UpdateControlTestInput = UpdateControlTestRequest;
export type ListControlTestInput = ControlTestFilters;
