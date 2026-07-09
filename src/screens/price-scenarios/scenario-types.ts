export type ScenarioStatus = "new" | "draft" | "pending" | "approved" | "denied" | "returned"

export interface ScenarioObjectives {
  revenue: number
  grossMargin: number
  sellThrough: number
}

export interface ChangeRequest {
  requestedAt: string
  comment: string
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

export interface ComparisonRow {
  metric: string
  current: string
  scenario: string
  mlRec: string
}

export interface FrontierPoint {
  level: number
  revenue: number
  profit: number
}

export interface Recommendation {
  tag: "Pricing" | "Marketing" | "Merch" | "Inventory"
  text: string
}

/** Tier-2 scenario output. */
export interface ScenarioOutput {
  narrative: string
  uncertainty: string
  guardrailResults: ScenarioGuardrailCheck[]
  comparison: ComparisonRow[]
  frontier: FrontierPoint[]
  currentPoint: FrontierPoint
  mlRecPoint: FrontierPoint
  scenarioPoint: FrontierPoint
  recommendations: Recommendation[]
}

/** Tier-1 canonical scenario record. */
export interface ScenarioEntity {
  id: number
  name: string
  focusGroupId: string
  focusGroupName: string
  skuCount: number
  startDate: string
  endDate: string
  objectives: ScenarioObjectives
  optimizationLevel: number
  status: ScenarioStatus
  createdAt: string
  changeRequests: ChangeRequest[]
  output: ScenarioOutput | null
}

/** Tier-2 form shape. */
export interface ScenarioForm {
  name: string
  focusGroupId: string
  startDate: string
  endDate: string
  revenueWeight: string
  grossMarginWeight: string
  sellThroughWeight: string
  optimizationLevel: string
}

/** Tier-2 focus set reference for dropdown. */
export interface FocusSetOption {
  id: string
  name: string
  skuCount: number
}

// ---------------------------------------------------------------------------
// Deep Dive types (Tier-2)
// ---------------------------------------------------------------------------

export interface SkuRecommendationRow {
  sku: string
  productName: string
  category: string
  brand: string
  currentPrice: number
  recommendedPrice: number
  priceChange: number
  priceChangePct: number
  currentGrossMargin: number
  projectedGrossMargin: number
  weeklyRevenue: number
  projectedRevenue: number
  currentWeeksOfSupply: number
  projectedWeeksOfSupply: number
  unlockLevel: number
}

export interface DecisionLadderItem {
  rank: number
  constraint: string
  decision: string
}

export interface ContextualFactor {
  factor: "Competitor price range" | "Weeks of supply" | "Elasticity"
  value: string
  impact: "positive" | "neutral" | "negative"
}

export interface ExplainTrace {
  sku: string
  rationale: string
  drivingObjectives: string[]
  decisionLadder: DecisionLadderItem[]
  contextualFactors: ContextualFactor[]
}

export interface MarketingTileProduct {
  sku: string
  productName: string
  currentPrice: number
  promoPrice: number
}

export interface MarketingTile {
  id: string
  campaign: string
  type: string
  discount: string
  skuCount: number
  projectedLift: string
  unlockLevel: number
  products: MarketingTileProduct[]
}

export interface DiscountTileProduct {
  sku: string
  productName: string
  currentPrice: number
  discountedPrice: number
}

export interface DiscountTile {
  id: string
  name: string
  type: string
  depth: string
  skuCount: number
  projectedSellThrough: string
  unlockLevel: number
  products: DiscountTileProduct[]
}

export interface DeepDiveOutput {
  priceAdjustments: SkuRecommendationRow[]
  marketingTiles: MarketingTile[]
  discountTiles: DiscountTile[]
}
