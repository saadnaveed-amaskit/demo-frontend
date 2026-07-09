export type ApprovalDomain = "scenario" | "discount"
export type ApprovalStatus = "pending" | "approved" | "denied" | "returned"
export type ApprovalDecisionAction = "approve" | "deny" | "request_changes"
export type ApprovalRisk = "Low" | "Medium" | "High"

export interface ChangeRequest {
  requestedAt: string
  comment: string
}

export interface ApprovalItemView {
  domain: ApprovalDomain
  id: number
  name: string
  submitter: string
  team: string
  brand: string
  division: string
  impact: string
  risk: ApprovalRisk
  status: ApprovalStatus
  changeRequests: ChangeRequest[]
}

export interface ApprovalsQueueView {
  scenarios: ApprovalItemView[]
  discounts: ApprovalItemView[]
  scenarioPendingCount: number
  discountPendingCount: number
}

export interface ApprovalsDecidedView {
  scenarios: ApprovalItemView[]
  discounts: ApprovalItemView[]
}

export interface DiscountRiskBanner {
  hardCount: number
  advisoryCount: number
}

export interface DiscountReviewView extends ApprovalItemView {
  riskBanner: DiscountRiskBanner
  constraintWarnings: string[]
  competitiveFlags: string[]
}

export interface ComparisonRow {
  metric: string
  current: string
  scenario: string
  mlRec: string
}

export interface ScenarioGuardrailCheck {
  id: number
  rule: string
  op: string
  threshold: string
  unit: string
  actual: number
  passed: boolean
  isOverridable: boolean
  severity: "hard" | "advisory"
}

export interface ScenarioOutput {
  narrative: string
  uncertainty: string
  guardrailResults: ScenarioGuardrailCheck[]
  comparison: ComparisonRow[]
}

export interface ScenarioReviewView extends ApprovalItemView {
  output: ScenarioOutput
}

export interface DecisionDto {
  action: ApprovalDecisionAction
  comment?: string
}
