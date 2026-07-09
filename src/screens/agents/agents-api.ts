import type { AgentCatalogView, AgentRosterView, HireDto, MonitorEntity, OperatorView, TaskAgentEntity } from "./agent-types"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export async function getRoster(): Promise<AgentRosterView> {
  const res = await fetch(`${API}/agents/roster`)
  if (!res.ok) throw new Error("Failed to load agent roster")
  return res.json() as Promise<AgentRosterView>
}

export async function getCatalog(): Promise<AgentCatalogView> {
  const res = await fetch(`${API}/agents/catalog`)
  if (!res.ok) throw new Error("Failed to load agent catalog")
  return res.json() as Promise<AgentCatalogView>
}

export async function pauseMonitor(id: number): Promise<MonitorEntity> {
  const res = await fetch(`${API}/agents/monitors/${id}/pause`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to pause monitor")
  return res.json() as Promise<MonitorEntity>
}

export async function resumeMonitor(id: number): Promise<MonitorEntity> {
  const res = await fetch(`${API}/agents/monitors/${id}/resume`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to resume monitor")
  return res.json() as Promise<MonitorEntity>
}

export async function hireAgent(dto: HireDto): Promise<MonitorEntity | OperatorView> {
  const res = await fetch(`${API}/agents/hire`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(dto),
  })
  if (!res.ok) throw new Error("Failed to hire agent")
  return res.json() as Promise<MonitorEntity | OperatorView>
}

export async function retireTaskAgent(id: number): Promise<TaskAgentEntity> {
  const res = await fetch(`${API}/agents/task-agents/${id}/retire`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to retire task agent")
  return res.json() as Promise<TaskAgentEntity>
}
