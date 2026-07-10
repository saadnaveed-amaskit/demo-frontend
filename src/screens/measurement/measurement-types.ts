export type ExperimentStatus = "setup" | "live" | "concluded"
export type BlockStatus = "Balanced" | "Imbalanced" | "Missing-an-arm"
export type ClusterArm = "treatment" | "control"
export type Verdict = "gathering" | "win" | "kill"

export interface MetricMatch {
  revenue: number
  grossMargin: number
  velocity: number
}

export interface ClusterView {
  id: number
  blockId: number
  name: string
  arm: ClusterArm
  bauPrice: number
  mlPrice: number | null
  crossElasticity: number
  confidence: number
}

export interface BlockView {
  id: number
  label: string
  status: BlockStatus
  clusters: ClusterView[]
  metricMatch?: MetricMatch
}

export interface CredibleInterval {
  estimate: number
  lower: number
  upper: number
}

export interface ClusterContribution {
  clusterId: number
  name: string
  contribution: number
}

export interface ReadoutView {
  probabilityOfWinning: number
  day: number
  verdict: Verdict
  incrementalMargin: CredibleInterval
  clusterContributions: ClusterContribution[]
}

export interface ExperimentView {
  id: number
  name: string
  status: ExperimentStatus
  costAcknowledged: boolean
  createdAt: string
  blocks: BlockView[]
  goLiveEligible: boolean
  goLiveBlockedReason: string | null
  readout: ReadoutView | null
}
