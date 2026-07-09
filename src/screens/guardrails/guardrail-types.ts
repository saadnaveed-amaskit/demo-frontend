/** Tier-1 canonical pricing constraint (mirrors backend GuardrailEntity). */
export interface GuardrailEntity {
  id: number
  brand: string
  division: string
  rule: string
  op: string
  value: string
  unit: string
  active: boolean
  isOverridable: boolean
}

/** Tier-2 form shape for creating a new guardrail. */
export interface GuardrailForm {
  brand: string
  division: string
  rule: string
  op: string
  value: string
  unit: string
}

/** Tier-2 evaluation result. */
export interface GuardrailCheckResult {
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

export interface GuardrailEvaluationResult {
  compliant: boolean
  results: GuardrailCheckResult[]
}
