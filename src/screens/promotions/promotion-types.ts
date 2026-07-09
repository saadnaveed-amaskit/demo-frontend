export interface PromotionEntity {
  id: number
  name: string
  startDate: string
  endDate: string
  discountType: "percentage" | "flat"
  discountValue: number
  focusSetId: string
  channel: string
  color: string
  notes: string
  status: "active" | "scheduled" | "expired"
}

export interface CreatePromotionDto {
  name: string
  startDate: string
  endDate: string
  discountType: "percentage" | "flat"
  discountValue: number
  focusSetId: string
  channel: string
  color: string
  notes?: string
}

export interface UpdatePromotionDto {
  name?: string
  startDate?: string
  endDate?: string
  discountType?: "percentage" | "flat"
  discountValue?: number
  focusSetId?: string
  channel?: string
  color?: string
  notes?: string
}

export interface PromoProductRow {
  sku: string
  name: string
  brand: string
  price: number
  promoPrice: number
  savings: number
}

export interface PromoProductsView {
  promotionId: number
  promotionName: string
  discountType: "percentage" | "flat"
  discountValue: number
  focusSetId: string
  focusSetName: string
  skus: PromoProductRow[]
}

export type PromoStatus = "active" | "scheduled" | "expired"
export type PromoStatusFilter = "all" | PromoStatus
