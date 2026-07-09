import { useEffect, useState, useCallback } from "react"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { ResponsiveLine } from "@nivo/line"
import { ResponsiveBar } from "@nivo/bar"
import { Plus, Copy, AlertTriangle, ChevronDown, ChevronRight, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  listModels,
  createModel,
  runModel,
  submitModel,
  deleteModel,
} from "./discount-modeling-api"
import { listFocusSets } from "./focus-sets-ref-api"
import type {
  DiscountModelEntity,
  DiscountModelForm,
  DiscountModelStatus,
  RollupRow,
  RiskPanel,
} from "./discount-model-types"

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  focusGroupId: z.string().min(1, "Focus Set is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  discountFormat: z.enum(["percentage", "flat", "bogo", "fixed"] as const),
  discountDepth: z.string(),
  channel: z.string().min(1, "Channel is required"),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<DiscountModelStatus, string> = {
  new: "New",
  draft: "Draft",
  pending: "Pending Review",
  approved: "Approved",
  returned: "Returned",
  denied: "Denied",
}

const STATUS_COLORS: Record<DiscountModelStatus, string> = {
  new: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  draft: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  approved: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  returned: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200",
  denied: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
}

const GROUP_ORDER: DiscountModelStatus[] = ["new", "draft", "returned", "pending", "approved", "denied"]
const GROUP_LABELS: Partial<Record<DiscountModelStatus, string>> = {
  new: "New",
  draft: "Draft",
  returned: "Pending Review (Returned)",
  pending: "Pending Review",
  approved: "Approved",
  denied: "Denied",
}

function sellThroughClass(st: number): string {
  if (st >= 85) return "text-teal-700 dark:text-teal-300 font-medium"
  if (st >= 70) return "text-amber-700 dark:text-amber-300 font-medium"
  return "text-red-700 dark:text-red-300 font-medium"
}

function exportCsv(rows: RollupRow[], name: string) {
  const header = "Division,SKU Count,Revenue ($),Margin ($),Sell-Through (%),Stock-Out Risk,Confidence"
  const lines = rows.map(
    (r) =>
      `${r.label},${r.skuCount},${r.revenue},${r.margin},${r.sellThrough},${r.stockOutRisk ? "Yes" : "No"},${Math.round(r.confidence * 100)}%`,
  )
  const csv = [header, ...lines].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${name.replace(/\s+/g, "_")}_rollup.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface RiskPanelCardProps {
  panel: RiskPanel
}

function RiskPanelCard({ panel }: RiskPanelCardProps) {
  const [open, setOpen] = useState(false)
  const severityColor =
    panel.severity === "high"
      ? "border-red-400 dark:border-red-600"
      : panel.severity === "medium"
        ? "border-amber-400 dark:border-amber-600"
        : "border-zinc-300 dark:border-zinc-600"
  return (
    <div className={`border rounded-lg overflow-hidden ${severityColor}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium hover:bg-accent text-left"
      >
        <span className="flex items-center gap-2">
          {panel.isHard && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
          {panel.title}
          <span
            className={`text-xs px-1.5 py-0.5 rounded capitalize ${
              panel.severity === "high"
                ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                : panel.severity === "medium"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {panel.severity}
          </span>
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && <p className="px-3 pb-3 text-sm text-muted-foreground">{panel.description}</p>}
    </div>
  )
}

interface RollupTableProps {
  rows: RollupRow[]
  modelName: string
}

type RollupTab = "division" | "channel"

function RollupTable({ rows, modelName }: RollupTableProps) {
  const [tab, setTab] = useState<RollupTab>("division")

  return (
    <div>
      <div className="flex gap-1 border-b mb-3">
        {(["division", "channel"] as RollupTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By {t}
          </button>
        ))}
        <div className="ml-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportCsv(rows, modelName)}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">{tab === "division" ? "Division" : "Channel"}</th>
              <th className="pb-2 pr-3 font-medium text-right">SKUs</th>
              <th className="pb-2 pr-3 font-medium text-right">Revenue</th>
              <th className="pb-2 pr-3 font-medium text-right">Margin</th>
              <th className="pb-2 pr-3 font-medium text-right">Sell-Through</th>
              <th className="pb-2 pr-3 font-medium text-right">Confidence</th>
              <th className="pb-2 font-medium">Risk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b last:border-0">
                <td className="py-1.5 pr-3">{r.label}</td>
                <td className="py-1.5 pr-3 text-right">{r.skuCount}</td>
                <td className="py-1.5 pr-3 text-right">${r.revenue.toLocaleString()}</td>
                <td className={`py-1.5 pr-3 text-right ${r.margin < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                  ${r.margin.toLocaleString()}
                </td>
                <td className={`py-1.5 pr-3 text-right ${sellThroughClass(r.sellThrough)}`}>
                  {r.sellThrough}%
                </td>
                <td className="py-1.5 pr-3 text-right">{Math.round(r.confidence * 100)}%</td>
                <td className="py-1.5">
                  {r.stockOutRisk && (
                    <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded">
                      Stock-Out
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Output View
// ---------------------------------------------------------------------------

interface OutputViewProps {
  model: DiscountModelEntity
  onSubmit: (id: number) => Promise<void>
  onDiscard: (id: number) => Promise<void>
  onBack: () => void
}

function OutputView({ model, onSubmit, onDiscard, onBack }: OutputViewProps) {
  const [copied, setCopied] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [discarding, setDiscarding] = useState(false)

  const output = model.output!
  const hasHardViolation = output.riskPanels.some((p) => p.isHard && p.severity === "high")

  const copyHandle = () => {
    void navigator.clipboard.writeText(output.marketingHandle)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const kpis = [
    { label: "Revenue Impact", value: `$${output.kpis.revenueImpact.toLocaleString()}` },
    { label: "Margin Impact", value: `$${output.kpis.marginImpact.toLocaleString()}` },
    { label: "Unit Lift", value: `+${output.kpis.unitLift}pp` },
    { label: "Sell-Through", value: `${output.kpis.sellThrough}%` },
    { label: "Incremental Rev.", value: `$${output.kpis.incrementalRevenue.toLocaleString()}` },
  ]

  return (
    <div data-testid="model-output" className="flex flex-col gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground mb-1">
            ← Back to list
          </button>
          <h2 className="text-xl font-semibold">{model.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {model.focusGroupName || "No focus set"} · {model.discountDepth ?? "BOGO"}
            {model.discountFormat === "percentage" ? "%" : model.discountFormat === "bogo" ? "" : "$"} off ·{" "}
            {model.channel} · {model.startDate} → {model.endDate}
          </p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${STATUS_COLORS[model.status]}`}
        >
          {STATUS_LABELS[model.status]}
        </span>
      </div>

      {hasHardViolation && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-300 dark:border-red-700 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">Hard Violation Detected — review risk panels before submitting</p>
        </div>
      )}

      {/* Narrative + handle */}
      <div className="p-4 border rounded-lg bg-muted/30">
        <p className="text-sm leading-relaxed">{output.narrative}</p>
        <div className="flex items-center gap-2 mt-3">
          <code className="text-xs bg-background border px-2 py-1 rounded font-mono">
            {output.marketingHandle}
          </code>
          <Button size="sm" variant="ghost" onClick={copyHandle}>
            <Copy className="h-3.5 w-3.5 mr-1" />
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>

      {/* 5-KPI summary */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Impact Summary</h3>
        <div className="grid grid-cols-5 gap-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="border rounded-lg p-3 text-center">
              <p className="text-lg font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast charts */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Forecast</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Revenue ($)</p>
            <div className="h-40">
              <ResponsiveLine
                data={output.forecastRevenue}
                margin={{ top: 8, right: 16, bottom: 24, left: 40 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: "auto", max: "auto" }}
                axisBottom={{ tickSize: 0, tickPadding: 4 }}
                axisLeft={{ tickSize: 0, tickPadding: 4, format: (v) => `$${(v as number / 1000).toFixed(0)}k` }}
                colors={["#71717a", "#0d9488"]}
                lineWidth={2}
                pointSize={4}
                enableGridX={false}
                enableArea
                areaOpacity={0.1}
                animate={false}
              />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Margin ($)</p>
            <div className="h-40">
              <ResponsiveLine
                data={output.forecastMargin}
                margin={{ top: 8, right: 16, bottom: 24, left: 40 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: "auto", max: "auto" }}
                axisBottom={{ tickSize: 0, tickPadding: 4 }}
                axisLeft={{ tickSize: 0, tickPadding: 4, format: (v) => `$${(v as number / 1000).toFixed(0)}k` }}
                colors={["#71717a", "#0d9488"]}
                lineWidth={2}
                pointSize={4}
                enableGridX={false}
                enableArea
                areaOpacity={0.1}
                animate={false}
              />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Units Sold</p>
            <div className="h-40">
              <ResponsiveBar
                data={output.forecastUnits}
                keys={["Baseline", "Promoted"]}
                indexBy="week"
                margin={{ top: 8, right: 16, bottom: 24, left: 36 }}
                colors={["#71717a", "#0d9488"]}
                groupMode="grouped"
                axisBottom={{ tickSize: 0, tickPadding: 4 }}
                axisLeft={{ tickSize: 0, tickPadding: 4 }}
                enableLabel={false}
                animate={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Rollup table */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Rollup</h3>
        <RollupTable rows={output.rollupRows} modelName={model.name} />
      </div>

      {/* Risk panels */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Risk Assessment</h3>
        <div className="flex flex-col gap-2">
          {output.riskPanels.map((panel) => (
            <RiskPanelCard key={panel.title} panel={panel} />
          ))}
        </div>
      </div>

      {/* Actions */}
      {(model.status === "draft" || model.status === "new") && (
        <div className="flex gap-2 pt-2">
          <Button
            onClick={async () => {
              setSubmitting(true)
              try {
                await onSubmit(model.id)
              } finally {
                setSubmitting(false)
              }
            }}
            disabled={submitting || model.status !== "draft"}
          >
            {submitting ? "Submitting…" : "Submit for Approval"}
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDiscard(true)}
          >
            Discard
          </Button>
        </div>
      )}

      {(model.status === "pending" || model.status === "approved" || model.status === "returned" || model.status === "denied") && (
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDiscard(true)}
          >
            Discard
          </Button>
        </div>
      )}

      {confirmDiscard && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-background border rounded-xl p-6 max-w-sm w-full shadow-xl flex flex-col gap-4">
            <h3 className="font-semibold">Discard "{model.name}"?</h3>
            <p className="text-sm text-muted-foreground">This will permanently remove the model and cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setConfirmDiscard(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={discarding}
                data-testid="discard-confirm"
                onClick={async () => {
                  setDiscarding(true)
                  try {
                    await onDiscard(model.id)
                  } finally {
                    setDiscarding(false)
                    setConfirmDiscard(false)
                  }
                }}
              >
                {discarding ? "Discarding…" : "Confirm Discard"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create Form
// ---------------------------------------------------------------------------

interface CreateFormProps {
  onCreated: (model: DiscountModelEntity) => void
  onCancel: () => void
}

function CreateForm({ onCreated, onCancel }: CreateFormProps) {
  const [focusSets, setFocusSets] = useState<Array<{ id: string; name: string; skuCount: number }>>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<DiscountModelForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      focusGroupId: "",
      startDate: "",
      endDate: "",
      discountFormat: "percentage",
      discountDepth: "",
      channel: "digital",
    },
  })

  useEffect(() => {
    listFocusSets()
      .then(setFocusSets)
      .catch(() => setFocusSets([]))
  }, [])

  const watched = watch()
  const format_ = watched.discountFormat
  const selectedFs = focusSets.find((f) => f.id === watched.focusGroupId)

  const isRunEnabled =
    watched.name.length > 0 &&
    watched.focusGroupId.length > 0 &&
    watched.startDate.length > 0 &&
    watched.endDate.length > 0 &&
    (format_ === "bogo" || (watched.discountDepth.length > 0 && !isNaN(Number(watched.discountDepth))))

  const saveAndRun = handleSubmit(async (data) => {
    setRunning(true)
    setError(null)
    try {
      const created = await createModel(data)
      const ran = await runModel(created.id)
      onCreated(ran)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run model")
    } finally {
      setRunning(false)
    }
  })

  const discountLabel =
    format_ === "percentage"
      ? "Discount depth (%)"
      : format_ === "flat"
        ? "Discount depth ($)"
        : format_ === "fixed"
          ? "Fixed price ($)"
          : null

  const previewDuration =
    watched.startDate && watched.endDate
      ? `${watched.startDate} → ${watched.endDate}`
      : null

  const previewHandle =
    watched.name && watched.focusGroupId && watched.startDate
      ? `TCP-${format_?.slice(0, 3).toUpperCase() ?? "???"}-${watched.discountDepth || "NA"}-${watched.channel.slice(0, 3).toUpperCase()}-SUMMER-${watched.startDate.replace(/-/g, "").slice(0, 6)}`
      : null

  return (
    <div className="border rounded-xl p-5 bg-background flex flex-col gap-4">
      <h2 className="font-semibold">New Discount Model</h2>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-sm font-medium">Model name</label>
          <Input aria-label="Model name" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-sm font-medium">Focus Set</label>
          <Controller
            control={control}
            name="focusGroupId"
            render={({ field }) => (
              <select
                {...field}
                data-testid="focus-group-select"
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">— select a Focus Set —</option>
                {focusSets.map((fs) => (
                  <option key={fs.id} value={fs.id}>
                    {fs.name} ({fs.skuCount} SKUs)
                  </option>
                ))}
              </select>
            )}
          />
          {errors.focusGroupId && (
            <p className="text-xs text-destructive">{errors.focusGroupId.message}</p>
          )}
          {selectedFs && (
            <p className="text-xs text-muted-foreground">Est. {selectedFs.skuCount} SKUs</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Start date</label>
          <Input type="date" aria-label="Start date" {...register("startDate")} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">End date</label>
          <Input type="date" aria-label="End date" {...register("endDate")} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Discount format</label>
          <Controller
            control={control}
            name="discountFormat"
            render={({ field }) => (
              <select
                {...field}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat ($)</option>
                <option value="bogo">BOGO</option>
                <option value="fixed">Fixed Price ($)</option>
              </select>
            )}
          />
        </div>

        {discountLabel && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{discountLabel}</label>
            <Input
              type="number"
              step="0.01"
              aria-label="Discount depth"
              {...register("discountDepth")}
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Channel</label>
          <Controller
            control={control}
            name="channel"
            render={({ field }) => (
              <select
                {...field}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="digital">Digital</option>
                <option value="store">Store</option>
                <option value="canada">Canada</option>
              </select>
            )}
          />
        </div>
      </div>

      {/* Live preview */}
      {isRunEnabled && (
        <div className="border rounded-lg p-3 bg-muted/30 text-sm flex flex-col gap-1">
          <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Preview</p>
          {previewDuration && <p>{previewDuration} · {selectedFs?.skuCount ?? "?"} SKUs</p>}
          {previewHandle && (
            <p className="font-mono text-xs">{previewHandle}</p>
          )}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={running}>
          Cancel
        </Button>
        <Button
          data-testid="run-model-btn"
          onClick={() => void saveAndRun()}
          disabled={!isRunEnabled || running}
        >
          {running ? "Running…" : "Run Model"}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Model List
// ---------------------------------------------------------------------------

interface ModelListProps {
  models: DiscountModelEntity[]
  onSelect: (model: DiscountModelEntity) => void
}

function ModelList({ models, onSelect }: ModelListProps) {
  const groups = GROUP_ORDER.map((status) => ({
    status,
    label: GROUP_LABELS[status] ?? STATUS_LABELS[status],
    items: models.filter((m) => m.status === status),
  })).filter((g) => g.items.length > 0)

  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No discount models yet. Create one to get started.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g.status}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {g.label} ({g.items.length})
          </h3>
          <div className="flex flex-col gap-1">
            {g.items.map((m) => (
              <button
                key={m.id}
                data-testid="model-list-row"
                onClick={() => onSelect(m)}
                className="flex items-center gap-3 p-3 border rounded-lg text-left hover:bg-accent transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.focusGroupName || "No focus set"} · {m.skuCount} SKUs ·{" "}
                    {m.discountFormat === "bogo"
                      ? "BOGO"
                      : `${m.discountDepth ?? "?"}${m.discountFormat === "percentage" ? "%" : "$"}`}{" "}
                    · {m.channel} · {m.startDate}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${STATUS_COLORS[m.status]}`}
                >
                  {STATUS_LABELS[m.status]}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

type ScreenView = "list" | "create" | "output"

export function DiscountModelingScreen() {
  const [models, setModels] = useState<DiscountModelEntity[]>([])
  const [view, setView] = useState<ScreenView>("list")
  const [selectedModel, setSelectedModel] = useState<DiscountModelEntity | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setModels(await listModels())
    } catch {
      setError("Failed to load discount models.")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreated = (model: DiscountModelEntity) => {
    setSelectedModel(model)
    setView("output")
    void load()
  }

  const handleSelect = (model: DiscountModelEntity) => {
    setSelectedModel(model)
    setView("output")
  }

  const handleSubmit_ = async (id: number) => {
    try {
      const updated = await submitModel(id)
      setSelectedModel(updated)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit")
    }
  }

  const handleDiscard = async (id: number) => {
    try {
      await deleteModel(id)
      setView("list")
      setSelectedModel(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to discard")
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6 h-full overflow-y-auto">
      {/* Header */}
      {view !== "output" && (
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Discount Modeling</h1>
          {view === "list" && (
            <Button size="sm" onClick={() => setView("create")}>
              <Plus className="h-4 w-4 mr-1" />
              New Model
            </Button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {view === "list" && <ModelList models={models} onSelect={handleSelect} />}

      {view === "create" && (
        <CreateForm
          onCreated={handleCreated}
          onCancel={() => setView("list")}
        />
      )}

      {view === "output" && selectedModel?.output && (
        <OutputView
          model={selectedModel}
          onSubmit={handleSubmit_}
          onDiscard={handleDiscard}
          onBack={() => {
            setView("list")
            setSelectedModel(null)
          }}
        />
      )}
    </div>
  )
}
