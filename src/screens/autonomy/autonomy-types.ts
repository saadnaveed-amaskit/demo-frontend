export type TrustRung = "Manual" | "Supervised" | "Autonomous"
export type ReversibilityClass = "Low" | "Medium" | "High"
export type LiveActionStatus = "pending" | "vetoed" | "applied" | "undone"

export interface ActionClassEntity {
  id: number
  name: string
  trustRung: TrustRung
  reversibilityClass: ReversibilityClass
  atReversibilityCeiling: boolean
  sampleCount: number
  accuracy: number
  acceptanceRate: number
  liveDollarValue: number
  createdAt: string
}

export interface LiveActionEntity {
  id: number
  actionClassId: number
  description: string
  status: LiveActionStatus
  vetoWindowSeconds: number
  engagedAt: string
}

export interface AuditEntry {
  id: number
  actionClassId: number
  action: string
  actor: string
  timestamp: string
}

export interface AutonomyKpis {
  totalActionClasses: number
  eligibleToPromote: number
  totalLiveDollarValue: number
  averageProofAccuracy: number
}

export interface AutonomyRosterView {
  kpis: AutonomyKpis
  actionClasses: ActionClassEntity[]
  liveActions: LiveActionEntity[]
  killSwitchEngaged: boolean
}

export interface KillSwitchState {
  killSwitchEngaged: boolean
}
