import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { AgGridReact } from "ag-grid-react"
import type { ColDef } from "ag-grid-community"
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import { Trash2, RotateCcw, LayoutList, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { productGridApi } from "./product-grid-api"
import type { ProductGridView, ProductRow, SkuRow } from "./product-grid-types"

ModuleRegistry.registerModules([AllCommunityModule])

type ViewMode = "product" | "sku"

const stockLabel: Record<string, string> = {
  In_Stock: "In Stock",
  Low_Stock: "Low Stock",
  Out_of_stock: "Out of Stock",
}

const productCols: ColDef<ProductRow>[] = [
  { field: "productName", headerName: "Product", flex: 2, minWidth: 180 },
  { field: "brand", headerName: "Brand", flex: 1 },
  { field: "division", headerName: "Division", flex: 1 },
  { field: "category", headerName: "Category", flex: 1 },
  {
    field: "priceRange",
    headerName: "Price Range",
    flex: 1,
    valueFormatter: ({ value }: { value: [number, number] }) =>
      value ? `$${value[0].toFixed(2)} – $${value[1].toFixed(2)}` : "",
  },
  { field: "activeSkuCount", headerName: "Active SKUs", flex: 1, type: "numericColumn" },
  { field: "totalQty", headerName: "Total Qty", flex: 1, type: "numericColumn" },
  {
    field: "stockStatus",
    headerName: "Status",
    flex: 1,
    valueFormatter: ({ value }: { value: string }) => stockLabel[value] ?? value,
  },
]

const skuCols: ColDef<SkuRow>[] = [
  { field: "sku", headerName: "SKU", flex: 1, minWidth: 120 },
  { field: "name", headerName: "Name", flex: 2, minWidth: 160 },
  { field: "brand", headerName: "Brand", flex: 1 },
  { field: "category", headerName: "Category", flex: 1 },
  { field: "subClass", headerName: "Sub-Class", flex: 1 },
  {
    field: "msrp",
    headerName: "MSRP",
    flex: 1,
    type: "numericColumn",
    valueFormatter: ({ value }: { value: number | null }) =>
      value != null ? `$${value.toFixed(2)}` : "—",
  },
  {
    field: "price",
    headerName: "Price",
    flex: 1,
    type: "numericColumn",
    valueFormatter: ({ value }: { value: number }) => `$${value.toFixed(2)}`,
  },
  { field: "qty", headerName: "Qty", flex: 1, type: "numericColumn" },
  {
    field: "status",
    headerName: "Status",
    flex: 1,
    valueFormatter: ({ value }: { value: string }) => stockLabel[value] ?? value,
  },
]

export function ProductGrid() {
  const [params] = useSearchParams()
  const focusSetId = params.get("focus")

  const [gridData, setGridData] = useState<ProductGridView | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("product")
  const [deletedSkus, setDeletedSkus] = useState<SkuRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadGrid = useCallback(async () => {
    if (!focusSetId) return
    setLoading(true)
    try {
      const data = await productGridApi.getGrid(focusSetId)
      setGridData(data)
      const excluded = data.products.flatMap((p) => p.skus.filter((s) => s.excluded))
      setDeletedSkus(excluded)
    } catch {
      setError("Failed to load product grid.")
    } finally {
      setLoading(false)
    }
  }, [focusSetId])

  useEffect(() => {
    void loadGrid()
  }, [loadGrid])

  const handleRemove = async (sku: string) => {
    if (!focusSetId) return
    try {
      await productGridApi.excludeSku(focusSetId, sku)
      await loadGrid()
    } catch {
      setError("Failed to remove SKU.")
    }
  }

  const handleRestore = async (sku: string) => {
    if (!focusSetId) return
    try {
      await productGridApi.restoreSku(focusSetId, sku)
      await loadGrid()
    } catch {
      setError("Failed to restore SKU.")
    }
  }

  const handleRestoreAll = async () => {
    if (!focusSetId) return
    try {
      await productGridApi.restoreAll(focusSetId)
      await loadGrid()
    } catch {
      setError("Failed to restore all SKUs.")
    }
  }

  const activeSkuRows: SkuRow[] =
    gridData?.products.flatMap((p) => p.skus.filter((s) => !s.excluded)) ?? []
  const activeProductRows: ProductRow[] =
    gridData?.products.filter((p) => p.activeSkuCount > 0) ?? []

  const activeSkuCount = activeSkuRows.length

  // Action column appended to sku cols when in SKU view
  const skuColsWithAction: ColDef<SkuRow>[] = [
    ...skuCols,
    {
      headerName: "",
      flex: 1,
      minWidth: 100,
      sortable: false,
      filter: false,
      cellRenderer: (params: { data: SkuRow }) =>
        params.data ? (
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Remove ${params.data.sku}`}
            onClick={() => void handleRemove(params.data.sku)}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            Remove
          </Button>
        ) : null,
    },
  ]

  if (!focusSetId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No focus set selected. Open a focus set from Focus Builder.</p>
      </div>
    )
  }

  if (loading && !gridData) {
    return <div className="p-6 text-muted-foreground">Loading…</div>
  }

  if (error) {
    return (
      <div className="p-6" role="alert" aria-label={error}>
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{gridData?.focusSetName ?? "Product Grid"}</h1>
          <p className="text-sm text-muted-foreground">
            <span data-testid="active-sku-count">{activeSkuCount} active SKUs</span>
            {" · "}
            {activeProductRows.length} products
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === "product" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("product")}
          >
            <LayoutList className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
            Product view
          </Button>
          <Button
            variant={viewMode === "sku" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("sku")}
          >
            <List className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
            SKU view
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="ag-theme-quartz flex-1" style={{ minHeight: 300 }}>
        {viewMode === "product" ? (
          <AgGridReact<ProductRow>
            rowData={activeProductRows}
            columnDefs={productCols}
            rowHeight={40}
            domLayout="autoHeight"
            getRowId={(p) => p.data.productId}
            rowClass="product-row"
          />
        ) : (
          <AgGridReact<SkuRow>
            rowData={activeSkuRows}
            columnDefs={skuColsWithAction}
            rowHeight={40}
            domLayout="autoHeight"
            getRowId={(p) => p.data.sku}
            rowClass="sku-row"
          />
        )}
      </div>

      {/* Accessible testid anchors for BDD/testing — visually hidden but present in DOM */}
      <div aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        {viewMode === "product" &&
          activeProductRows.map((p) => (
            <span key={p.productId} data-testid="product-row">{p.productId}</span>
          ))}
        {viewMode === "sku" &&
          activeSkuRows.map((s) => (
            <span key={s.sku} data-testid="sku-row">{s.sku}</span>
          ))}
      </div>

      {/* Deleted Items pane */}
      {deletedSkus.length > 0 && (
        <section
          role="region"
          aria-label="Deleted Items"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-destructive">
              Deleted Items ({deletedSkus.length})
            </h2>
            <Button size="sm" variant="outline" onClick={() => void handleRestoreAll()}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
              Restore All
            </Button>
          </div>
          <ul className="space-y-1">
            {deletedSkus.map((s) => (
              <li key={s.sku} className="flex items-center justify-between text-sm">
                <span className="font-mono">{s.sku}</span>
                <span className="mx-2 flex-1 truncate text-muted-foreground">{s.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Restore ${s.sku}`}
                  onClick={() => void handleRestore(s.sku)}
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
