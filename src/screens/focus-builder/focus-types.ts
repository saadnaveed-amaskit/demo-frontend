/** Frontend Tier-2 shapes for Focus Set management (mirror the backend contract
 * knowledge/contracts/slice-02-focus-sets). *Entity is backend-owned; these are
 * display/form projections. */

export type ConditionNode =
  | { type: "rule"; attr: string; val: string }
  | { type: "group"; logic: "AND" | "OR"; rules: ConditionNode[] }

export interface FocusSetView {
  id: string
  name: string
  filter: ConditionNode
  productCount: number
  createdAt: string
}

export interface SkuView {
  sku: string
  name: string
  brand: string
  division: string
  category: string
  price: number
  qty: number
  status: string
}

export interface AttributeOption {
  attr: string
  label: string
  values: string[]
}

export type SortKey = "name" | "created" | "count"
