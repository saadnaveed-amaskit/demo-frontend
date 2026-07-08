import type {
  AttributeOption,
  ConditionNode,
  FocusSetView,
  SkuView,
} from "./focus-types"

const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000"

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return (await res.json()) as T
}

interface ResolveResult {
  count: number
  skus: SkuView[]
}

export const focusApi = {
  list: (): Promise<FocusSetView[]> =>
    fetch(`${API_URL}/focus-sets`).then((r) => json<FocusSetView[]>(r)),

  attributes: (): Promise<AttributeOption[]> =>
    fetch(`${API_URL}/catalog/attributes`).then((r) => json<AttributeOption[]>(r)),

  resolve: (filter: ConditionNode): Promise<ResolveResult> =>
    fetch(`${API_URL}/focus-sets/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filter }),
    }).then((r) => json<ResolveResult>(r)),

  resolveById: (id: string): Promise<ResolveResult> =>
    fetch(`${API_URL}/focus-sets/${id}/skus`).then((r) => json<ResolveResult>(r)),

  create: (name: string, filter: ConditionNode): Promise<FocusSetView> =>
    fetch(`${API_URL}/focus-sets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, filter }),
    }).then((r) => json<FocusSetView>(r)),

  update: (id: string, name: string, filter: ConditionNode): Promise<FocusSetView> =>
    fetch(`${API_URL}/focus-sets/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, filter }),
    }).then((r) => json<FocusSetView>(r)),

  duplicate: (id: string, name: string): Promise<FocusSetView> =>
    fetch(`${API_URL}/focus-sets/${id}/duplicate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((r) => json<FocusSetView>(r)),

  remove: (id: string): Promise<void> =>
    fetch(`${API_URL}/focus-sets/${id}`, { method: "DELETE" }).then((res) => {
      if (!res.ok) throw new Error(`${res.status}`)
    }),
}
