import type { DeepDiveOutput, ScenarioEntity } from "./scenario-types"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export async function listScenarios(): Promise<ScenarioEntity[]> {
  const res = await fetch(`${API}/price-scenarios`)
  if (!res.ok) throw new Error("Failed to list scenarios")
  return res.json() as Promise<ScenarioEntity[]>
}

export async function createScenario(dto: {
  name: string
  focusGroupId: string
  startDate: string
  endDate: string
  objectives: { revenue: number; grossMargin: number; sellThrough: number }
  optimizationLevel: number
}): Promise<ScenarioEntity> {
  const res = await fetch(`${API}/price-scenarios`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(dto),
  })
  if (!res.ok) throw new Error("Failed to create scenario")
  return res.json() as Promise<ScenarioEntity>
}

export async function runScenario(id: number): Promise<ScenarioEntity> {
  const res = await fetch(`${API}/price-scenarios/${id}/run`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to run scenario")
  return res.json() as Promise<ScenarioEntity>
}

export async function submitScenario(id: number): Promise<ScenarioEntity> {
  const res = await fetch(`${API}/price-scenarios/${id}/submit`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to submit scenario")
  return res.json() as Promise<ScenarioEntity>
}

export async function deleteScenario(id: number): Promise<void> {
  await fetch(`${API}/price-scenarios/${id}`, { method: "DELETE" })
}

export async function getDeepDive(id: number): Promise<DeepDiveOutput> {
  const res = await fetch(`${API}/price-scenarios/${id}/deep-dive`)
  if (!res.ok) throw new Error("Failed to fetch deep dive")
  return res.json() as Promise<DeepDiveOutput>
}
