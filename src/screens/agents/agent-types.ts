export type MonitorStatus = "active" | "paused"
export type TaskAgentStatus = "running" | "retired"
export type TrustLevel = "Low" | "Medium" | "High"
export type EvidenceStatus = "evidence-backed" | "unproven"
export type HireKind = "monitor" | "operator"

export interface MonitorEntity {
  id: number
  name: string
  type: string
  status: MonitorStatus
  signalsToday: number
  lastActivity: string
  createdAt: string
}

export interface OperatorView {
  id: number
  name: string
  type: string
  trustLevel: TrustLevel
  evidenceStatus: EvidenceStatus
  trackRecord: string
}

export interface TaskAgentEntity {
  id: number
  name: string
  spawnedBy: string
  retirementCondition: string
  status: TaskAgentStatus
  openLink: string
  createdAt: string
}

export interface AgentKpis {
  agentsOnTeam: number
  signalsToday: number
  actingAutonomously: number
  evidenceBackedCount: number
  evidenceBackedTotal: number
  taskAgentsRunning: number
}

export interface AgentRosterView {
  kpis: AgentKpis
  monitors: MonitorEntity[]
  operators: OperatorView[]
  taskAgents: TaskAgentEntity[]
}

export interface AgentCatalogView {
  monitorTypes: string[]
  operatorTypes: string[]
}

export interface HireDto {
  kind: HireKind
  subtype: string
}
