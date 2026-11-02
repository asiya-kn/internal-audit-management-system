
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  passwordHash: 'passwordHash',
  isActive: 'isActive',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserRoleScalarFieldEnum = {
  userId: 'userId',
  roleId: 'roleId',
  assignedAt: 'assignedAt'
};

exports.Prisma.RolePermissionScalarFieldEnum = {
  roleId: 'roleId',
  permissionId: 'permissionId',
  assignedAt: 'assignedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  action: 'action',
  category: 'category',
  userId: 'userId',
  ip: 'ip',
  userAgent: 'userAgent',
  metadata: 'metadata',
  success: 'success',
  createdAt: 'createdAt'
};

exports.Prisma.AuditUniverseScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  entityType: 'entityType',
  status: 'status',
  parentId: 'parentId',
  businessProcess: 'businessProcess',
  department: 'department',
  riskRating: 'riskRating',
  notes: 'notes',
  ownerId: 'ownerId',
  createdById: 'createdById',
  updatedById: 'updatedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RiskScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  auditEntityId: 'auditEntityId',
  inherentLikelihood: 'inherentLikelihood',
  inherentImpact: 'inherentImpact',
  inherentScore: 'inherentScore',
  inherentLevel: 'inherentLevel',
  existingControls: 'existingControls',
  controlEffectiveness: 'controlEffectiveness',
  residualScore: 'residualScore',
  residualLevel: 'residualLevel',
  status: 'status',
  riskCategory: 'riskCategory',
  notes: 'notes',
  ownerId: 'ownerId',
  createdById: 'createdById',
  updatedById: 'updatedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RiskActionScalarFieldEnum = {
  id: 'id',
  riskId: 'riskId',
  title: 'title',
  description: 'description',
  assigneeId: 'assigneeId',
  dueDate: 'dueDate',
  completedAt: 'completedAt',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditPlanScalarFieldEnum = {
  id: 'id',
  title: 'title',
  reference: 'reference',
  fiscalYear: 'fiscalYear',
  auditEntityId: 'auditEntityId',
  riskId: 'riskId',
  objectives: 'objectives',
  scope: 'scope',
  priority: 'priority',
  status: 'status',
  estimatedResources: 'estimatedResources',
  planningRationale: 'planningRationale',
  proposedStartDate: 'proposedStartDate',
  proposedEndDate: 'proposedEndDate',
  approvedAt: 'approvedAt',
  approvedById: 'approvedById',
  leadAuditorId: 'leadAuditorId',
  notes: 'notes',
  createdById: 'createdById',
  updatedById: 'updatedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EngagementScalarFieldEnum = {
  id: 'id',
  reference: 'reference',
  title: 'title',
  auditPlanId: 'auditPlanId',
  auditEntityId: 'auditEntityId',
  riskId: 'riskId',
  type: 'type',
  status: 'status',
  objectives: 'objectives',
  scope: 'scope',
  methodology: 'methodology',
  estimatedResources: 'estimatedResources',
  leadAuditorId: 'leadAuditorId',
  startDate: 'startDate',
  endDate: 'endDate',
  actualStartDate: 'actualStartDate',
  actualEndDate: 'actualEndDate',
  closedAt: 'closedAt',
  closedById: 'closedById',
  closureNotes: 'closureNotes',
  createdById: 'createdById',
  updatedById: 'updatedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EngagementTeamMemberScalarFieldEnum = {
  engagementId: 'engagementId',
  userId: 'userId',
  role: 'role',
  assignedAt: 'assignedAt'
};

exports.Prisma.FindingScalarFieldEnum = {
  id: 'id',
  reference: 'reference',
  title: 'title',
  engagementId: 'engagementId',
  auditEntityId: 'auditEntityId',
  category: 'category',
  severity: 'severity',
  status: 'status',
  condition: 'condition',
  criteria: 'criteria',
  cause: 'cause',
  impact: 'impact',
  recommendations: 'recommendations',
  managementResponse: 'managementResponse',
  managementRespondedAt: 'managementRespondedAt',
  managementRespondedById: 'managementRespondedById',
  responsibleOwnerId: 'responsibleOwnerId',
  targetResolutionDate: 'targetResolutionDate',
  closedAt: 'closedAt',
  verifiedAt: 'verifiedAt',
  verifiedById: 'verifiedById',
  verificationNotes: 'verificationNotes',
  createdById: 'createdById',
  updatedById: 'updatedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ControlTestScalarFieldEnum = {
  id: 'id',
  reference: 'reference',
  title: 'title',
  engagementId: 'engagementId',
  auditEntityId: 'auditEntityId',
  riskId: 'riskId',
  controlReference: 'controlReference',
  status: 'status',
  outcome: 'outcome',
  objective: 'objective',
  procedures: 'procedures',
  criteria: 'criteria',
  sampleDescription: 'sampleDescription',
  sampleSize: 'sampleSize',
  expectedResult: 'expectedResult',
  actualResult: 'actualResult',
  exceptions: 'exceptions',
  conclusion: 'conclusion',
  evidenceReference: 'evidenceReference',
  testerId: 'testerId',
  testedAt: 'testedAt',
  testerNotes: 'testerNotes',
  reviewerId: 'reviewerId',
  reviewedAt: 'reviewedAt',
  reviewerNotes: 'reviewerNotes',
  findingId: 'findingId',
  createdById: 'createdById',
  updatedById: 'updatedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ActionPlanScalarFieldEnum = {
  id: 'id',
  reference: 'reference',
  title: 'title',
  description: 'description',
  findingId: 'findingId',
  controlTestId: 'controlTestId',
  engagementId: 'engagementId',
  auditEntityId: 'auditEntityId',
  priority: 'priority',
  status: 'status',
  responsibleOwnerId: 'responsibleOwnerId',
  reviewerId: 'reviewerId',
  targetDate: 'targetDate',
  completedAt: 'completedAt',
  verifiedAt: 'verifiedAt',
  verifiedById: 'verifiedById',
  managementJustification: 'managementJustification',
  proposedRectification: 'proposedRectification',
  completionEvidence: 'completionEvidence',
  verificationNotes: 'verificationNotes',
  progressPct: 'progressPct',
  createdById: 'createdById',
  updatedById: 'updatedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ActionPlanUpdateScalarFieldEnum = {
  id: 'id',
  actionPlanId: 'actionPlanId',
  note: 'note',
  progressPct: 'progressPct',
  updatedById: 'updatedById',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.AuditEntityType = exports.$Enums.AuditEntityType = {
  ORGANIZATION: 'ORGANIZATION',
  DIVISION: 'DIVISION',
  DEPARTMENT: 'DEPARTMENT',
  PROCESS: 'PROCESS',
  SUB_PROCESS: 'SUB_PROCESS',
  SYSTEM: 'SYSTEM',
  PROJECT: 'PROJECT',
  THIRD_PARTY: 'THIRD_PARTY',
  LOCATION: 'LOCATION'
};

exports.AuditEntityStatus = exports.$Enums.AuditEntityStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED'
};

exports.RiskLevel = exports.$Enums.RiskLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

exports.RiskStatus = exports.$Enums.RiskStatus = {
  OPEN: 'OPEN',
  MITIGATING: 'MITIGATING',
  MONITORING: 'MONITORING',
  CLOSED: 'CLOSED'
};

exports.ActionStatus = exports.$Enums.ActionStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED'
};

exports.AuditPriority = exports.$Enums.AuditPriority = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

exports.AuditPlanStatus = exports.$Enums.AuditPlanStatus = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.EngagementType = exports.$Enums.EngagementType = {
  INTERNAL_AUDIT: 'INTERNAL_AUDIT',
  COMPLIANCE_AUDIT: 'COMPLIANCE_AUDIT',
  IT_AUDIT: 'IT_AUDIT',
  OPERATIONAL_AUDIT: 'OPERATIONAL_AUDIT',
  FINANCIAL_AUDIT: 'FINANCIAL_AUDIT',
  FOLLOW_UP: 'FOLLOW_UP',
  SPECIAL_REVIEW: 'SPECIAL_REVIEW',
  AD_HOC: 'AD_HOC'
};

exports.EngagementStatus = exports.$Enums.EngagementStatus = {
  PLANNED: 'PLANNED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ON_HOLD: 'ON_HOLD'
};

exports.TeamMemberRole = exports.$Enums.TeamMemberRole = {
  LEAD_AUDITOR: 'LEAD_AUDITOR',
  AUDITOR: 'AUDITOR',
  OBSERVER: 'OBSERVER',
  SUBJECT_MATTER_EXPERT: 'SUBJECT_MATTER_EXPERT',
  REVIEWER: 'REVIEWER'
};

exports.FindingCategory = exports.$Enums.FindingCategory = {
  INTERNAL_CONTROL: 'INTERNAL_CONTROL',
  COMPLIANCE: 'COMPLIANCE',
  OPERATIONAL: 'OPERATIONAL',
  FINANCIAL: 'FINANCIAL',
  IT_GENERAL_CONTROLS: 'IT_GENERAL_CONTROLS',
  DATA_QUALITY: 'DATA_QUALITY',
  GOVERNANCE: 'GOVERNANCE',
  FRAUD: 'FRAUD',
  OTHER: 'OTHER'
};

exports.FindingSeverity = exports.$Enums.FindingSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

exports.FindingStatus = exports.$Enums.FindingStatus = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  MANAGEMENT_RESPONSE: 'MANAGEMENT_RESPONSE',
  ACTION_PLAN: 'ACTION_PLAN',
  REMEDIATED: 'REMEDIATED',
  VERIFIED: 'VERIFIED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED'
};

exports.ControlTestStatus = exports.$Enums.ControlTestStatus = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  TESTED: 'TESTED',
  REVIEWED: 'REVIEWED',
  EXCEPTION: 'EXCEPTION',
  CANCELLED: 'CANCELLED'
};

exports.ControlTestOutcome = exports.$Enums.ControlTestOutcome = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  PASS_WITH_EXCEPTION: 'PASS_WITH_EXCEPTION',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  INCONCLUSIVE: 'INCONCLUSIVE'
};

exports.ActionPlanPriority = exports.$Enums.ActionPlanPriority = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

exports.ActionPlanStatus = exports.$Enums.ActionPlanStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED'
};

exports.Prisma.ModelName = {
  User: 'User',
  Role: 'Role',
  Permission: 'Permission',
  UserRole: 'UserRole',
  RolePermission: 'RolePermission',
  AuditLog: 'AuditLog',
  AuditUniverse: 'AuditUniverse',
  Risk: 'Risk',
  RiskAction: 'RiskAction',
  AuditPlan: 'AuditPlan',
  Engagement: 'Engagement',
  EngagementTeamMember: 'EngagementTeamMember',
  Finding: 'Finding',
  ControlTest: 'ControlTest',
  ActionPlan: 'ActionPlan',
  ActionPlanUpdate: 'ActionPlanUpdate'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
