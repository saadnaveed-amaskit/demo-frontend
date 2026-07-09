const API = (import.meta as { env: Record<string, string> }).env.VITE_API_URL ?? "http://localhost:3000"

export interface FocusSetSummary {
  id: string
  name: string
  skuCount: number
}

export async function listFocusSets(): Promise<FocusSetSummary[]> {
  const res = await fetch(`${API}/focus-sets`)
  if (!res.ok) return []
  const data = (await res.json()) as Array<{ id: string; name: string; productCount: number }>
  return data.map((fs) => ({ id: fs.id, name: fs.name, skuCount: fs.productCount }))
}
