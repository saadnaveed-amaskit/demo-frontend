import type { ProductGridView } from "./product-grid-types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json() as Promise<T>
}

export const productGridApi = {
  getGrid: (focusSetId: string): Promise<ProductGridView> =>
    fetch(`${API_URL}/product-grid/${focusSetId}`).then((r) =>
      json<ProductGridView>(r),
    ),

  excludeSku: (focusSetId: string, skuId: string): Promise<void> =>
    fetch(`${API_URL}/product-grid/${focusSetId}/exclude`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ skuId }),
    }).then((r) => json<unknown>(r)).then(() => undefined),

  restoreSku: (focusSetId: string, skuId: string): Promise<void> =>
    fetch(`${API_URL}/product-grid/${focusSetId}/exclusions/${skuId}`, {
      method: "DELETE",
    }).then((r) => {
      if (!r.ok) throw new Error(`API error ${r.status}`)
    }),

  restoreAll: (focusSetId: string): Promise<void> =>
    fetch(`${API_URL}/product-grid/${focusSetId}/exclusions`, {
      method: "DELETE",
    }).then((r) => {
      if (!r.ok) throw new Error(`API error ${r.status}`)
    }),
}
