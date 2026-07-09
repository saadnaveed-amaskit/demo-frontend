import type { GuardrailEntity, GuardrailEvaluationResult, GuardrailForm } from "./guardrail-types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json() as Promise<T>
}

export const guardrailsApi = {
  list: (): Promise<GuardrailEntity[]> =>
    fetch(`${API_URL}/guardrails`).then((r) => json<GuardrailEntity[]>(r)),

  create: (dto: GuardrailForm): Promise<GuardrailEntity> =>
    fetch(`${API_URL}/guardrails`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(dto),
    }).then((r) => json<GuardrailEntity>(r)),

  update: (id: number, dto: Partial<GuardrailForm>): Promise<GuardrailEntity> =>
    fetch(`${API_URL}/guardrails/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(dto),
    }).then((r) => json<GuardrailEntity>(r)),

  toggleActive: (id: number): Promise<GuardrailEntity> =>
    fetch(`${API_URL}/guardrails/${id}/active`, { method: "PATCH" }).then((r) =>
      json<GuardrailEntity>(r),
    ),

  toggleOverridable: (id: number): Promise<GuardrailEntity> =>
    fetch(`${API_URL}/guardrails/${id}/overridable`, { method: "PATCH" }).then((r) =>
      json<GuardrailEntity>(r),
    ),

  remove: (id: number): Promise<void> =>
    fetch(`${API_URL}/guardrails/${id}`, { method: "DELETE" }).then((r) => {
      if (!r.ok) throw new Error(`API error ${r.status}`)
    }),

  evaluate: (payload: {
    brand: string
    division: string
    metrics: Record<string, number>
  }): Promise<GuardrailEvaluationResult> =>
    fetch(`${API_URL}/guardrails/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => json<GuardrailEvaluationResult>(r)),
}
