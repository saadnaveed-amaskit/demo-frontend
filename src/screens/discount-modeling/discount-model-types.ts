export type DiscountFormat = "percentage" | "flat" | "bogo" | "fixed"
export type DiscountModelStatus = "new" | "draft" | "pending" | "approved" | "returned" | "denied"

export interface DiscountModelEntity {
  id: number
  name: string
  focusGroupId: string
  focusGroupName: string
  skuCount: number
  startDate: string
  endDate: string
  discountFormat: DiscountFormat
  discountDepth: number | null
  channel: string
  status: DiscountModelStatus
  createdAt: string
  marketingHandle: string
  output: DiscountModelOutput | null
}

export interface DiscountModelOutput {
  narrative: string
  marketingHandle: string
  kpis: DiscountModelKpis
  forecastRevenue: NivoLineDataset[]
  forecastMargin: NivoLineDataset[]
  forecastUnits: NivoBarDatapoint[]
  rollupRows: RollupRow[]
  riskPanels: RiskPanel[]
}

export interface DiscountModelKpis {
  revenueImpact: number
  marginImpact: number
  unitLift: number
  sellThrough: number
  incrementalRevenue: number
}

export interface NivoLineDataset {
  id: string
  data: Array<{ x: string; y: number }>
}

export interface NivoBarDatapoint {
  week: string
  Baseline: number
  Promoted: number
  [key: string]: string | number
}

/** Tier-2 rollup table row. */
export interface RollupRow {
  label: string
  skuCount: number
  revenue: number
  margin: number
  sellThrough: number
  stockOutRisk: boolean
  confidence: number
}

export interface RiskPanel {
  title: string
  severity: "high" | "medium" | "low"
  description: string
  isHard: boolean
}

/** Tier-2 form shape for RHF+Zod. */
export interface DiscountModelForm {
  name: string
  focusGroupId: string
  startDate: string
  endDate: string
  discountFormat: DiscountFormat
  discountDepth: string
  channel: string
}
