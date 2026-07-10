import type { ActionClassEntity, AuditEntry, AutonomyRosterView, KillSwitchState, LiveActionEntity } from "./autonomy-types"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export async function getRoster(): Promise<AutonomyRosterView> {
  const res = await fetch(`${API}/autonomy/roster`)
  if (!res.ok) throw new Error("Failed to load autonomy roster")
  return res.json() as Promise<AutonomyRosterView>
}

export async function getAudit(id: number): Promise<AuditEntry[]> {
  const res = await fetch(`${API}/autonomy/action-classes/${id}/audit`)
  if (!res.ok) throw new Error("Failed to load audit trail")
  return res.json() as Promise<AuditEntry[]>
}

export interface PromoteResult {
  ok: boolean
  actionClass?: ActionClassEntity
  reason?: string
}

export async function promote(id: number): Promise<PromoteResult> {
  const res = await fetch(`${API}/autonomy/action-classes/${id}/promote`, { method: "POST" })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    return { ok: false, reason: body?.message ?? "Promotion blocked" }
  }
  return { ok: true, actionClass: (await res.json()) as ActionClassEntity }
}

export async function demote(id: number): Promise<ActionClassEntity> {
  const res = await fetch(`${API}/autonomy/action-classes/${id}/demote`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to demote action class")
  return res.json() as Promise<ActionClassEntity>
}

export async function veto(id: number): Promise<LiveActionEntity> {
  const res = await fetch(`${API}/autonomy/live-actions/${id}/veto`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to veto live action")
  return res.json() as Promise<LiveActionEntity>
}

export async function undo(id: number): Promise<LiveActionEntity> {
  const res = await fetch(`${API}/autonomy/live-actions/${id}/undo`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to undo live action")
  return res.json() as Promise<LiveActionEntity>
}

export async function engageKillSwitch(): Promise<KillSwitchState> {
  const res = await fetch(`${API}/autonomy/kill-switch/engage`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to engage kill switch")
  return res.json() as Promise<KillSwitchState>
}

export async function disengageKillSwitch(): Promise<KillSwitchState> {
  const res = await fetch(`${API}/autonomy/kill-switch/disengage`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to disengage kill switch")
  return res.json() as Promise<KillSwitchState>
}
