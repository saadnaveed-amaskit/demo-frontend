import type { ConditionNode } from "@/screens/focus-builder/focus-types"

export interface SkuRow {
  sku: string
  productId: string
  productName: string
  name: string
  brand: string
  division: string
  category: string
  subClass: string
  msrp: number | null
  price: number
  qty: number
  onOrderQty: number
  status: "In_Stock" | "Low_Stock" | "Out_of_stock"
  excluded: boolean
}

export interface ProductRow {
  productId: string
  productName: string
  brand: string
  division: string
  category: string
  skuCount: number
  activeSkuCount: number
  priceRange: [number, number]
  totalQty: number
  stockStatus: "In_Stock" | "Low_Stock" | "Out_of_stock"
  skus: SkuRow[]
}

export interface ProductGridView {
  focusSetId: string
  focusSetName: string
  filter: ConditionNode
  products: ProductRow[]
  totalSkuCount: number
  activeSkuCount: number
}
