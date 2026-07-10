import type { ClusterArm, ClusterView, ExperimentView } from "./measurement-types"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export async function listExperiments(): Promise<ExperimentView[]> {
  const res = await fetch(`${API}/measurement/experiments`)
  if (!res.ok) throw new Error("Failed to load experiments")
  return res.json() as Promise<ExperimentView[]>
}

export async function getExperiment(id: number): Promise<ExperimentView> {
  const res = await fetch(`${API}/measurement/experiments/${id}`)
  if (!res.ok) throw new Error("Failed to load experiment")
  return res.json() as Promise<ExperimentView>
}

export async function moveCluster(experimentId: number, clusterId: number, arm: ClusterArm): Promise<ClusterView> {
  const res = await fetch(`${API}/measurement/experiments/${experimentId}/clusters/${clusterId}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ arm }),
  })
  if (!res.ok) throw new Error("Failed to move cluster")
  return res.json() as Promise<ClusterView>
}

export async function acknowledgeCost(id: number): Promise<ExperimentView> {
  const res = await fetch(`${API}/measurement/experiments/${id}/acknowledge-cost`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to acknowledge cost")
  return res.json() as Promise<ExperimentView>
}

export interface GoLiveResult {
  ok: boolean
  experiment?: ExperimentView
  reason?: string
}

export async function goLive(id: number): Promise<GoLiveResult> {
  const res = await fetch(`${API}/measurement/experiments/${id}/go-live`, { method: "POST" })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    return { ok: false, reason: body?.message ?? "Go Live blocked" }
  }
  return { ok: true, experiment: (await res.json()) as ExperimentView }
}

export async function scale(id: number): Promise<ExperimentView> {
  const res = await fetch(`${API}/measurement/experiments/${id}/scale`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to scale experiment")
  return res.json() as Promise<ExperimentView>
}

export async function kill(id: number): Promise<ExperimentView> {
  const res = await fetch(`${API}/measurement/experiments/${id}/kill`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to kill experiment")
  return res.json() as Promise<ExperimentView>
}
