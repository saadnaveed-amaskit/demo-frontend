import type { SkuView } from "./focus-types"

/** Build a CSV of matched SKUs (REQ-FOCUS-008 columns). */
export function skusToCsv(skus: SkuView[]): string {
  const header = ["SKU", "Name", "Division", "Category", "Price", "Qty", "Status"]
  const rows = skus.map((s) =>
    [s.sku, s.name, s.division, s.category, s.price, s.qty, s.status]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  )
  return [header.join(","), ...rows].join("\n")
}

/** Trigger a client-side CSV download. */
export function downloadCsv(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
