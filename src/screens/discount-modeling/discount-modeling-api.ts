import type { DiscountModelEntity, DiscountModelForm } from "./discount-model-types"

const API = (import.meta as { env: Record<string, string> }).env.VITE_API_URL ?? "http://localhost:3000"

export async function listModels(): Promise<DiscountModelEntity[]> {
  const res = await fetch(`${API}/discount-models`)
  if (!res.ok) throw new Error("Failed to list discount models")
  return res.json()
}

export async function createModel(form: DiscountModelForm): Promise<DiscountModelEntity> {
  const body = {
    name: form.name,
    focusGroupId: form.focusGroupId,
    startDate: form.startDate,
    endDate: form.endDate,
    discountFormat: form.discountFormat,
    discountDepth: form.discountFormat !== "bogo" ? Number(form.discountDepth) : undefined,
    channel: form.channel,
  }
  const res = await fetch(`${API}/discount-models`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("Failed to create discount model")
  return res.json()
}

export async function runModel(id: number): Promise<DiscountModelEntity> {
  const res = await fetch(`${API}/discount-models/${id}/run`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to run model")
  return res.json()
}

export async function submitModel(id: number): Promise<DiscountModelEntity> {
  const res = await fetch(`${API}/discount-models/${id}/submit`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to submit model")
  return res.json()
}

export async function deleteModel(id: number): Promise<void> {
  const res = await fetch(`${API}/discount-models/${id}`, { method: "DELETE" })
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete model")
}
