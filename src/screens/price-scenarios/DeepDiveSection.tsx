import { useCallback, useEffect, useMemo, useState } from "react"
import { AgGridReact } from "ag-grid-react"
import type { ColDef, ColGroupDef } from "ag-grid-community"
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import { X, ChevronDown, ChevronRight, Download } from "lucide-react"
import type {
  ContextualFactor,
  DeepDiveOutput,
  DecisionLadderItem,
  DiscountTile,
  ExplainTrace,
  MarketingTile,
  SkuRecommendationRow,
} from "./scenario-types"
import { getDeepDive } from "./scenarios-api"

ModuleRegistry.registerModules([AllCommunityModule])

type DeepDiveTab = "all" | "price-adj" | "marketing" | "discounts"

function buildExplainTrace(row: SkuRecommendationRow): ExplainTrace {
  return {
    sku: row.sku,
    rationale:
      `The recommended price of $${row.recommendedPrice.toFixed(2)} for ${row.productName} ` +
      `balances margin preservation and sell-through acceleration based on current inventory ` +
      `levels and competitive positioning.`,
    drivingObjectives: ["Revenue Uplift", "Gross Margin Preservation", "Sell-Through Acceleration"],
    decisionLadder: [
      {
        rank: 1,
        constraint: "Gross Margin Floor",
        decision: `Maintained above ${row.currentGrossMargin.toFixed(0)}% minimum`,
      },
      {
        rank: 2,
        constraint: "Inventory Risk",
        decision: `${row.projectedWeeksOfSupply.toFixed(1)} wks supply projected (target: ≤6)`,
      },
      {
        rank: 3,
        constraint: "Competitor Price",
        decision: "Priced within 5% of competitive range",
      },
    ] as DecisionLadderItem[],
    contextualFactors: [
      {
        factor: "Competitor price range",
        value: `$${(row.recommendedPrice * 0.95).toFixed(2)} – $${(row.recommendedPrice * 1.08).toFixed(2)}`,
        impact: "positive",
      },
      {
        factor: "Weeks of supply",
        value: `${row.currentWeeksOfSupply.toFixed(1)} wks current`,
        impact: row.currentWeeksOfSupply > 8 ? "negative" : "neutral",
      },
      {
        factor: "Elasticity",
        value: row.priceChangePct < -5 ? "High elasticity (>−5%)" : "Moderate elasticity",
        impact: "positive",
      },
    ] as ContextualFactor[],
  }
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Explain modal
// ---------------------------------------------------------------------------

interface ExplainModalProps {
  trace: ExplainTrace
  onClose: () => void
}

const IMPACT_CLS: Record<string, string> = {
  positive: "text-teal-600",
  neutral: "text-zinc-500",
  negative: "text-red-500",
}

function ExplainModal({ trace, onClose }: ExplainModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="explain-modal"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Explain: {trace.sku}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">AI-generated price recommendation trace</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Rationale */}
          <div>
            <div className="text-xs font-medium text-zinc-500 mb-1">Rationale</div>
            <p
              className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed"
              data-testid="explain-rationale"
            >
              {trace.rationale}
            </p>
          </div>

          {/* Driving objectives */}
          <div>
            <div className="text-xs font-medium text-zinc-500 mb-1">Driving Objectives</div>
            <ul
              className="space-y-1"
              data-testid="explain-driving-objectives"
            >
              {trace.drivingObjectives.map((obj) => (
                <li key={obj} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                  {obj}
                </li>
              ))}
            </ul>
          </div>

          {/* Decision ladder */}
          <div>
            <div className="text-xs font-medium text-zinc-500 mb-1">Decision Ladder</div>
            <div className="space-y-2" data-testid="explain-decision-ladder">
              {trace.decisionLadder.map((item) => (
                <div
                  key={item.rank}
                  className="flex gap-3 text-xs border-l-2 border-teal-400 pl-2"
                >
                  <span className="font-semibold text-teal-600 shrink-0">#{item.rank}</span>
                  <div>
                    <div className="font-medium text-zinc-700 dark:text-zinc-300">
                      {item.constraint}
                    </div>
                    <div className="text-zinc-500">{item.decision}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contextual factors */}
          <div>
            <div className="text-xs font-medium text-zinc-500 mb-1">Contextual Factors</div>
            <div className="space-y-1" data-testid="explain-contextual-factors">
              {trace.contextualFactors.map((f) => (
                <div
                  key={f.factor}
                  className="flex items-center justify-between text-xs border border-zinc-100 dark:border-zinc-800 rounded px-2 py-1"
                >
                  <span className="text-zinc-600 dark:text-zinc-400">{f.factor}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">{f.value}</span>
                    <span className={`font-medium ${IMPACT_CLS[f.impact] ?? ""}`}>
                      {f.impact === "positive" ? "↑" : f.impact === "negative" ? "↓" : "–"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Price Adjustments grid
// ---------------------------------------------------------------------------

interface PriceAdjGridProps {
  rows: SkuRecommendationRow[]
  onExplain: (row: SkuRecommendationRow) => void
}

function PriceAdjGrid({ rows, onExplain }: PriceAdjGridProps) {
  const [viewMode, setViewMode] = useState<"products" | "skus">("skus")

  const colDefs: (ColDef | ColGroupDef)[] = useMemo(
    () => [
      {
        headerName: "Item Overview",
        children: [
          { field: "sku", headerName: "SKU", flex: 1, minWidth: 100 },
          { field: "productName", headerName: "Product", flex: 2, minWidth: 160 },
          { field: "brand", headerName: "Brand", flex: 1, minWidth: 80, hide: viewMode === "products" },
          { field: "category", headerName: "Category", flex: 1, minWidth: 100 },
        ],
      } as ColGroupDef,
      {
        headerName: "Pricing",
        children: [
          {
            field: "currentPrice",
            headerName: "Current ($)",
            flex: 1,
            minWidth: 90,
            valueFormatter: (p: { value: number }) => `$${p.value.toFixed(2)}`,
          },
          {
            field: "recommendedPrice",
            headerName: "Rec. ($)",
            flex: 1,
            minWidth: 90,
            valueFormatter: (p: { value: number }) => `$${p.value.toFixed(2)}`,
          },
          {
            field: "priceChangePct",
            headerName: "Δ%",
            flex: 1,
            minWidth: 70,
            valueFormatter: (p: { value: number }) => `${p.value.toFixed(1)}%`,
          },
        ],
      } as ColGroupDef,
      {
        headerName: "Financials",
        children: [
          {
            field: "currentGrossMargin",
            headerName: "GM% Now",
            flex: 1,
            minWidth: 90,
            valueFormatter: (p: { value: number }) => `${p.value.toFixed(1)}%`,
          },
          {
            field: "projectedGrossMargin",
            headerName: "GM% Proj.",
            flex: 1,
            minWidth: 90,
            valueFormatter: (p: { value: number }) => `${p.value.toFixed(1)}%`,
          },
          {
            field: "projectedRevenue",
            headerName: "Rev. Proj. ($)",
            flex: 1,
            minWidth: 100,
            valueFormatter: (p: { value: number }) => `$${p.value.toFixed(0)}`,
          },
        ],
      } as ColGroupDef,
      {
        headerName: "Inventory",
        children: [
          {
            field: "currentWeeksOfSupply",
            headerName: "WOS Now",
            flex: 1,
            minWidth: 80,
            valueFormatter: (p: { value: number }) => `${p.value.toFixed(1)}w`,
          },
          {
            field: "projectedWeeksOfSupply",
            headerName: "WOS Proj.",
            flex: 1,
            minWidth: 80,
            valueFormatter: (p: { value: number }) => `${p.value.toFixed(1)}w`,
          },
        ],
      } as ColGroupDef,
      {
        headerName: "",
        children: [
          {
            field: "sku",
            headerName: "Action",
            flex: 1,
            minWidth: 80,
            cellRenderer: (params: { data: SkuRecommendationRow }) => {
              const btn = document.createElement("button")
              btn.textContent = "Explain"
              btn.setAttribute("data-testid", "explain-btn")
              btn.className = "explain-action-btn text-xs text-teal-600 hover:underline font-medium px-1"
              btn.addEventListener("click", () => onExplain(params.data))
              return btn
            },
          },
        ],
      } as ColGroupDef,
    ],
    [viewMode, onExplain],
  )

  function handleExportCsv() {
    const header = [
      "SKU",
      "Product",
      "Category",
      "Brand",
      "Current Price",
      "Recommended Price",
      "Change%",
      "GM% Now",
      "GM% Proj.",
      "Rev Proj",
      "WOS Now",
      "WOS Proj.",
    ]
    const dataRows = rows.map((r) => [
      r.sku,
      r.productName,
      r.category,
      r.brand,
      r.currentPrice.toFixed(2),
      r.recommendedPrice.toFixed(2),
      r.priceChangePct.toFixed(1),
      r.currentGrossMargin.toFixed(1),
      r.projectedGrossMargin.toFixed(1),
      r.projectedRevenue.toFixed(0),
      r.currentWeeksOfSupply.toFixed(1),
      r.projectedWeeksOfSupply.toFixed(1),
    ])
    downloadCsv("price-adjustments.csv", [header, ...dataRows])
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700 text-xs">
          {(["products", "skus"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 capitalize transition-colors ${
                viewMode === mode
                  ? "bg-teal-500 text-white"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-teal-600"
        >
          <Download size={12} strokeWidth={1.5} />
          Export CSV
        </button>
      </div>
      <div
        className="ag-theme-quartz-dark"
        style={{ minHeight: 300, width: "100%" }}
        data-testid="price-adjustment-grid"
      >
        <AgGridReact rowData={rows} columnDefs={colDefs} domLayout="autoHeight" rowHeight={40} />
      </div>

      {/* Accessible testid anchors for BDD/testing — visually hidden but present in DOM */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      >
        {rows.map((row) => (
          <button
            key={row.sku}
            data-testid="explain-btn"
            className="explain-action-btn"
            onClick={() => onExplain(row)}
          >
            Explain {row.sku}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Marketing tile
// ---------------------------------------------------------------------------

function MarketingTileCard({ tile }: { tile: MarketingTile }) {
  const [expanded, setExpanded] = useState(false)

  function handleExportCsv() {
    const header = ["SKU", "Product", "Current Price", "Promo Price"]
    const rows = tile.products.map((p) => [
      p.sku,
      p.productName,
      p.currentPrice.toFixed(2),
      p.promoPrice.toFixed(2),
    ])
    downloadCsv(`${tile.id}-marketing.csv`, [header, ...rows])
  }

  return (
    <div
      className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-2"
      data-testid="marketing-tile"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{tile.campaign}</div>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded">
              {tile.type}
            </span>
            <span className="text-xs text-zinc-500">{tile.discount}</span>
            <span className="text-xs text-teal-600 font-medium">{tile.projectedLift}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCsv}
            className="text-zinc-400 hover:text-teal-600"
            title="Export CSV"
          >
            <Download size={12} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-zinc-400 hover:text-zinc-600"
            data-testid="tile-expand-btn"
          >
            {expanded ? (
              <ChevronDown size={14} strokeWidth={1.5} />
            ) : (
              <ChevronRight size={14} strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>
      <div className="text-xs text-zinc-400">{tile.skuCount} SKUs</div>
      {expanded && (
        <div
          className="mt-2 space-y-1 border-t border-zinc-100 dark:border-zinc-800 pt-2"
          data-testid="tile-products"
        >
          {tile.products.map((p) => (
            <div key={p.sku} className="flex items-center justify-between text-xs">
              <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[60%]">
                {p.productName}
              </span>
              <div className="flex gap-3 text-zinc-500 shrink-0">
                <span>${p.currentPrice.toFixed(2)}</span>
                <span className="text-teal-600 font-medium">→ ${p.promoPrice.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Discount tile
// ---------------------------------------------------------------------------

function DiscountTileCard({ tile }: { tile: DiscountTile }) {
  const [expanded, setExpanded] = useState(false)

  function handleExportCsv() {
    const header = ["SKU", "Product", "Current Price", "Discounted Price"]
    const rows = tile.products.map((p) => [
      p.sku,
      p.productName,
      p.currentPrice.toFixed(2),
      p.discountedPrice.toFixed(2),
    ])
    downloadCsv(`${tile.id}-discounts.csv`, [header, ...rows])
  }

  return (
    <div
      className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-2"
      data-testid="discount-tile"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{tile.name}</div>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200 px-2 py-0.5 rounded">
              {tile.type}
            </span>
            <span className="text-xs text-zinc-500">{tile.depth}</span>
            <span className="text-xs text-teal-600 font-medium">{tile.projectedSellThrough} ST</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCsv}
            className="text-zinc-400 hover:text-teal-600"
            title="Export CSV"
          >
            <Download size={12} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-zinc-400 hover:text-zinc-600"
            data-testid="tile-expand-btn"
          >
            {expanded ? (
              <ChevronDown size={14} strokeWidth={1.5} />
            ) : (
              <ChevronRight size={14} strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>
      <div className="text-xs text-zinc-400">{tile.skuCount} SKUs</div>
      {expanded && (
        <div
          className="mt-2 space-y-1 border-t border-zinc-100 dark:border-zinc-800 pt-2"
          data-testid="tile-products"
        >
          {tile.products.map((p) => (
            <div key={p.sku} className="flex items-center justify-between text-xs">
              <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[60%]">
                {p.productName}
              </span>
              <div className="flex gap-3 text-zinc-500 shrink-0">
                <span>${p.currentPrice.toFixed(2)}</span>
                <span className="text-amber-600 font-medium">→ ${p.discountedPrice.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// All tab summary
// ---------------------------------------------------------------------------

function AllTabSummary({ data, localLevel }: { data: DeepDiveOutput; localLevel: number }) {
  const visibleAdj = data.priceAdjustments.filter((r) => r.unlockLevel <= localLevel)
  const visibleMkt = data.marketingTiles.filter((t) => t.unlockLevel <= localLevel)
  const visibleDisc = data.discountTiles.filter((t) => t.unlockLevel <= localLevel)

  const summaries = [
    {
      label: "Price Adjustments",
      count: visibleAdj.length,
      total: data.priceAdjustments.length,
      color: "text-teal-600",
    },
    {
      label: "Marketing Campaigns",
      count: visibleMkt.length,
      total: data.marketingTiles.length,
      color: "text-blue-600",
    },
    {
      label: "Discount Events",
      count: visibleDisc.length,
      total: data.discountTiles.length,
      color: "text-amber-600",
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {summaries.map(({ label, count, total, color }) => (
        <div
          key={label}
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-center"
        >
          <div className={`text-2xl font-bold ${color}`}>{count}</div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {label}
            <span className="text-zinc-400"> / {total}</span>
          </div>
          <div className="text-xs text-zinc-400 mt-1">unlocked at {localLevel}%</div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Deep Dive Section
// ---------------------------------------------------------------------------

interface DeepDiveSectionProps {
  scenarioId: number
  localLevel: number
}

export function DeepDiveSection({ scenarioId, localLevel }: DeepDiveSectionProps) {
  const [data, setData] = useState<DeepDiveOutput | null>(null)
  const [activeTab, setActiveTab] = useState<DeepDiveTab>("all")
  const [explainTrace, setExplainTrace] = useState<ExplainTrace | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const result = await getDeepDive(scenarioId)
      setData(result)
    } catch {
      setError("Failed to load deep dive data.")
    }
  }, [scenarioId])

  useEffect(() => {
    void load()
  }, [load])

  const visibleAdjustments = useMemo(
    () => data?.priceAdjustments.filter((r) => r.unlockLevel <= localLevel) ?? [],
    [data, localLevel],
  )
  const visibleMarketing = useMemo(
    () => data?.marketingTiles.filter((t) => t.unlockLevel <= localLevel) ?? [],
    [data, localLevel],
  )
  const visibleDiscounts = useMemo(
    () => data?.discountTiles.filter((t) => t.unlockLevel <= localLevel) ?? [],
    [data, localLevel],
  )

  function handleExplain(row: SkuRecommendationRow) {
    setExplainTrace(buildExplainTrace(row))
  }

  const tabs: Array<{ id: DeepDiveTab; label: string; testId: string }> = [
    { id: "all", label: "All", testId: "deep-dive-sub-tab-all" },
    { id: "price-adj", label: "Price Adjustments", testId: "deep-dive-sub-tab-price-adj" },
    { id: "marketing", label: "Marketing", testId: "deep-dive-sub-tab-marketing" },
    { id: "discounts", label: "Discounts", testId: "deep-dive-sub-tab-discounts" },
  ]

  if (error) {
    return <div className="text-xs text-red-500 p-3">{error}</div>
  }

  if (!data) {
    return <div className="text-xs text-zinc-400 p-3">Loading deep dive…</div>
  }

  return (
    <div className="space-y-3" data-testid="deep-dive-section">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map(({ id, label, testId }) => (
          <button
            key={id}
            data-testid={testId}
            onClick={() => setActiveTab(id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors border-b-2 -mb-px ${
              activeTab === id
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "all" && (
        <AllTabSummary data={data} localLevel={localLevel} />
      )}

      {activeTab === "price-adj" && (
        <PriceAdjGrid rows={visibleAdjustments} onExplain={handleExplain} />
      )}

      {activeTab === "marketing" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {visibleMarketing.length} of {data.marketingTiles.length} campaigns unlocked
            </span>
            <button
              onClick={() => {
                const header = ["ID", "Campaign", "Type", "Discount", "SKU Count", "Projected Lift"]
                const rows = visibleMarketing.map((t) => [
                  t.id,
                  t.campaign,
                  t.type,
                  t.discount,
                  String(t.skuCount),
                  t.projectedLift,
                ])
                downloadCsv("marketing-campaigns.csv", [header, ...rows])
              }}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-teal-600"
            >
              <Download size={12} strokeWidth={1.5} />
              Export CSV
            </button>
          </div>
          {visibleMarketing.length === 0 && (
            <div className="text-xs text-zinc-400 text-center py-8">
              Raise the optimization slider to unlock marketing campaigns
            </div>
          )}
          {visibleMarketing.map((tile) => (
            <MarketingTileCard key={tile.id} tile={tile} />
          ))}
        </div>
      )}

      {activeTab === "discounts" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {visibleDiscounts.length} of {data.discountTiles.length} events unlocked
            </span>
            <button
              onClick={() => {
                const header = [
                  "ID",
                  "Name",
                  "Type",
                  "Depth",
                  "SKU Count",
                  "Projected Sell-Through",
                ]
                const rows = visibleDiscounts.map((t) => [
                  t.id,
                  t.name,
                  t.type,
                  t.depth,
                  String(t.skuCount),
                  t.projectedSellThrough,
                ])
                downloadCsv("discount-events.csv", [header, ...rows])
              }}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-teal-600"
            >
              <Download size={12} strokeWidth={1.5} />
              Export CSV
            </button>
          </div>
          {visibleDiscounts.length === 0 && (
            <div className="text-xs text-zinc-400 text-center py-8">
              Raise the optimization slider to unlock discount events
            </div>
          )}
          {visibleDiscounts.map((tile) => (
            <DiscountTileCard key={tile.id} tile={tile} />
          ))}
        </div>
      )}

      {/* Explain modal */}
      {explainTrace && (
        <ExplainModal trace={explainTrace} onClose={() => setExplainTrace(null)} />
      )}
    </div>
  )
}
