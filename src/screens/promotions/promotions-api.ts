import type {
  CreatePromotionDto,
  PromoProductsView,
  PromotionEntity,
  UpdatePromotionDto,
} from "./promotion-types"

const API = (import.meta as { env: Record<string, string> }).env.VITE_API_URL ?? "http://localhost:3000"

export async function listPromotions(): Promise<PromotionEntity[]> {
  const res = await fetch(`${API}/promotions`)
  if (!res.ok) throw new Error("Failed to list promotions")
  return res.json()
}

export async function createPromotion(dto: CreatePromotionDto): Promise<PromotionEntity> {
  const res = await fetch(`${API}/promotions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(dto),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? "Failed to create promotion")
  }
  return res.json()
}

export async function updatePromotion(id: number, dto: UpdatePromotionDto): Promise<PromotionEntity> {
  const res = await fetch(`${API}/promotions/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(dto),
  })
  if (!res.ok) throw new Error("Failed to update promotion")
  return res.json()
}

export async function deletePromotion(id: number): Promise<void> {
  const res = await fetch(`${API}/promotions/${id}`, { method: "DELETE" })
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete promotion")
}

export async function getPromoProducts(id: number): Promise<PromoProductsView> {
  const res = await fetch(`${API}/promotions/${id}/products`)
  if (!res.ok) throw new Error("Failed to load promotion products")
  return res.json()
}
