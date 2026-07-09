import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { ResponsiveLine } from "@nivo/line"
import { Plus, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type {
  FrontierPoint,
  ScenarioEntity,
  ScenarioObjectives,
  ScenarioOutput,
} from "./scenario-types"
import { createScenario, deleteScenario, listScenarios, runScenario, submitScenario } from "./scenarios-api"
import { listFocusSets } from "../discount-modeling/focus-sets-ref-api"
import type { FocusSetSummary } from "../discount-modeling/focus-sets-ref-api"

const PAGE_TRANSITION = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18, ease: "easeOut" as const } }

type Mode = "list" | "create" | "output"

function riskBand(level: number): { label: string; uplift: string } {
  if (level <= 20) return { label: "Conservative", uplift: "+2–5% revenue" }
  if (level <= 40) return { label: "Moderate", uplift: "+5–10% revenue" }
  if (level <= 60) return { label: "Balanced", uplift: "+10–15% revenue" }
  if (level <= 80) return { label: "Aggressive", uplift: "+15–20% revenue" }
  return { label: "Full Optimization", uplift: "+20–25% revenue" }
}

function interpolateFrontier(frontier: FrontierPoint[], level: number): FrontierPoint {
  const lower = Math.floor(level / 10) * 10
  const upper = Math.min(100, lower + 10)
  const lp = frontier.find((p) => p.level === lower) ?? frontier[0]
  const up = frontier.find((p) => p.level === upper) ?? frontier[frontier.length - 1]
  const t = (level - lower) / 10
  return {
    level,
    revenue: Math.round(lp.revenue + t * (up.revenue - lp.revenue)),
    profit: Math.round(lp.profit + t * (up.profit - lp.profit)),
  }
}

function redistribute(
  changed: keyof ScenarioObjectives,
  newValue: number,
  current: ScenarioObjectives,
): ScenarioObjectives {
  const keys: (keyof ScenarioObjectives)[] = ["revenue", "grossMargin", "sellThrough"]
  const others = keys.filter((k) => k !== changed)
  const clamped = Math.max(0, Math.min(100, newValue))
  const remainder = 100 - clamped
  const otherTotal = others.reduce((s, k) => s + current[k], 0)
  const updated = { ...current, [changed]: clamped }
  if (otherTotal === 0) {
    const share = Math.floor(remainder / others.length)
    others.forEach((k, i) => {
      updated[k] = i === 0 ? remainder - share * (others.length - 1) : share
    })
  } else {
    let allocated = 0
    others.forEach((k, i) => {
      if (i === others.length - 1) {
        updated[k] = Math.max(0, remainder - allocated)
      } else {
        const share = Math.round((current[k] / otherTotal) * remainder)
        updated[k] = share
        allocated += share
      }
    })
  }
  return updated
}

const TAG_COLORS: Record<string, string> = {
  Pricing: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  Marketing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Merch: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  Inventory: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    new: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    draft: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
    approved: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200",
    denied: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
    returned: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200",
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${cls[status] ?? ""}`}>
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Frontier chart with custom markers
// ---------------------------------------------------------------------------

interface MarkerLayerProps {
  xScale: (v: number) => number
  yScale: (v: number) => number
  currentPoint: FrontierPoint
  mlRecPoint: FrontierPoint
  scenarioPoint: FrontierPoint
}

function MarkerLayer({ xScale, yScale, currentPoint, mlRecPoint, scenarioPoint }: MarkerLayerProps) {
  const markers = [
    { point: currentPoint, color: "#71717a", label: "Current" },
    { point: mlRecPoint, color: "#0d9488", label: "ML Rec" },
    { point: scenarioPoint, color: "#f59e0b", label: "Scenario" },
  ]
  return (
    <g>
      {markers.map(({ point, color, label }) => (
        <g key={label}>
          <circle
            cx={xScale(point.revenue)}
            cy={yScale(point.profit)}
            r={7}
            fill={color}
            stroke="white"
            strokeWidth={2}
          />
          <text
            x={xScale(point.revenue) + 10}
            y={yScale(point.profit) + 4}
            fill={color}
            fontSize={11}
            fontWeight={600}
          >
            {label}
          </text>
        </g>
      ))}
    </g>
  )
}

interface FrontierChartProps {
  output: ScenarioOutput
  scenarioPoint: FrontierPoint
}

function FrontierChart({ output, scenarioPoint }: FrontierChartProps) {
  const lineData = [
    {
      id: "Frontier",
      color: "#0d9488",
      data: output.frontier.map((p) => ({ x: p.revenue, y: p.profit })),
    },
  ]

  const customLayer = (props: unknown) => {
    const p = props as MarkerLayerProps
    return (
      <MarkerLayer
        xScale={p.xScale}
        yScale={p.yScale}
        currentPoint={output.currentPoint}
        mlRecPoint={output.mlRecPoint}
        scenarioPoint={scenarioPoint}
      />
    )
  }

  return (
    <div className="h-48">
      <ResponsiveLine
        data={lineData}
        margin={{ top: 10, right: 20, bottom: 40, left: 60 }}
        xScale={{ type: "linear" }}
        yScale={{ type: "linear" }}
        axisBottom={{ legend: "Revenue ($)", legendOffset: 30, legendPosition: "middle" }}
        axisLeft={{ legend: "Profit ($)", legendOffset: -50, legendPosition: "middle" }}
        enablePoints={false}
        colors={["#0d9488"]}
        lineWidth={2}
        enableGridX={false}
        theme={{ grid: { line: { stroke: "#3f3f46", strokeWidth: 0.5 } } }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        layers={["grid", "axes", "areas", "lines", "mesh", customLayer as any]}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Objective weight sliders
// ---------------------------------------------------------------------------

interface ObjectiveWeightsProps {
  objectives: ScenarioObjectives
  onChange: (next: ScenarioObjectives) => void
}

function ObjectiveWeights({ objectives, onChange }: ObjectiveWeightsProps) {
  function handleChange(key: keyof ScenarioObjectives, raw: string) {
    const value = parseInt(raw, 10)
    if (isNaN(value)) return
    onChange(redistribute(key, value, objectives))
  }

  const weights: Array<{ key: keyof ScenarioObjectives; label: string; testId: string }> = [
    { key: "revenue", label: "Revenue", testId: "revenue-weight-input" },
    { key: "grossMargin", label: "Gross Margin", testId: "gross-margin-weight-input" },
    { key: "sellThrough", label: "Sell-Through", testId: "sell-through-weight-input" },
  ]

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>Objectives</span>
        <span className={`font-semibold ${objectives.revenue + objectives.grossMargin + objectives.sellThrough === 100 ? "text-teal-500" : "text-red-500"}`}>
          Total: {objectives.revenue + objectives.grossMargin + objectives.sellThrough}%
        </span>
      </div>
      {weights.map(({ key, label, testId }) => (
        <div key={key} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">{label}</span>
            <span className="font-medium">{objectives[key]}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={objectives[key]}
            data-testid={testId}
            onChange={(e) => handleChange(key, e.target.value)}
            className="w-full accent-teal-500"
          />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create form
// ---------------------------------------------------------------------------

interface CreateFormProps {
  focusSets: FocusSetSummary[]
  onRun: (scenario: ScenarioEntity) => void
  onCancel: () => void
}

function CreateForm({ focusSets, onRun, onCancel }: CreateFormProps) {
  const [name, setName] = useState("")
  const [focusGroupId, setFocusGroupId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [objectives, setObjectives] = useState<ScenarioObjectives>({ revenue: 50, grossMargin: 30, sellThrough: 20 })
  const [optimizationLevel, setOptimizationLevel] = useState(50)
  const [creating, setCreating] = useState(false)
  const [running, setRunning] = useState(false)
  const [created, setCreated] = useState<ScenarioEntity | null>(null)

  const canRun = name.trim() && focusGroupId && startDate && endDate

  async function handleRun() {
    if (!canRun) return
    try {
      setCreating(true)
      let s: ScenarioEntity
      if (!created) {
        s = await createScenario({ name: name.trim(), focusGroupId, startDate, endDate, objectives, optimizationLevel })
        setCreated(s)
      } else {
        s = created
      }
      setCreating(false)
      setRunning(true)
      const ran = await runScenario(s.id)
      onRun(ran)
    } catch {
      setCreating(false)
      setRunning(false)
    }
  }

  return (
    <div className="space-y-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">New Price Scenario</h3>

      <div className="space-y-1">
        <label className="text-xs text-zinc-500">Model name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer Markdown" />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-zinc-500">Focus Group</label>
        <select
          value={focusGroupId}
          onChange={(e) => setFocusGroupId(e.target.value)}
          data-testid="focus-group-select-scenario"
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm px-3 py-2"
        >
          <option value="">Select focus group…</option>
          {focusSets.map((fs) => (
            <option key={fs.id} value={fs.id}>
              {fs.name} ({fs.skuCount} SKUs)
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Start date</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">End date</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <ObjectiveWeights objectives={objectives} onChange={setObjectives} />

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Starting optimization level</span>
          <span className="font-medium">{optimizationLevel}% — {riskBand(optimizationLevel).label}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={optimizationLevel}
          onChange={(e) => setOptimizationLevel(parseInt(e.target.value, 10))}
          className="w-full accent-teal-500"
        />
      </div>

      {focusGroupId && startDate && endDate && (
        <div className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800 rounded p-2">
          <span className="font-medium">Preview:</span>{" "}
          {focusSets.find((f) => f.id === focusGroupId)?.skuCount ?? "–"} SKUs ·{" "}
          {startDate && endDate ? `${startDate} → ${endDate}` : "–"} ·{" "}
          Revenue {objectives.revenue}% / GM {objectives.grossMargin}% / ST {objectives.sellThrough}%
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleRun}
          disabled={!canRun || creating || running}
          data-testid="run-model-btn"
        >
          {creating ? "Creating…" : running ? "Running…" : "Run Model"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Output view
// ---------------------------------------------------------------------------

interface OutputViewProps {
  scenario: ScenarioEntity
  output: ScenarioOutput
  onDiscard: () => void
  onSubmit: () => void
  onResubmit: () => void
}

function OutputView({ scenario, output, onDiscard, onSubmit, onResubmit }: OutputViewProps) {
  const frozen = ["pending", "approved", "denied"].includes(scenario.status)
  const [localLevel, setLocalLevel] = useState(scenario.optimizationLevel)
  const [expandedRecs, setExpandedRecs] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const scenarioPoint = useMemo(
    () => interpolateFrontier(output.frontier, localLevel),
    [output.frontier, localLevel],
  )

  const band = riskBand(localLevel)

  const latestCR = scenario.changeRequests.at(-1)

  return (
    <motion.div {...PAGE_TRANSITION} data-testid="scenario-output" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{scenario.name}</h2>
          <div className="flex gap-2 items-center mt-1">
            <StatusBadge status={scenario.status} />
            <span className="text-xs text-zinc-500">{scenario.focusGroupName} · {scenario.skuCount} SKUs</span>
          </div>
        </div>
        <div className="flex gap-2">
          {scenario.status === "draft" && (
            <Button size="sm" onClick={onSubmit} data-testid="submit-btn">
              Submit for Approval
            </Button>
          )}
          {scenario.status === "returned" && (
            <Button size="sm" onClick={onResubmit} data-testid="resubmit-btn">
              Resubmit
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setConfirmDiscard(true)}>
            Discard
          </Button>
        </div>
      </div>

      {/* Change request banner */}
      {scenario.status === "returned" && latestCR && (
        <div className="rounded-md border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950 p-3 text-sm">
          <div className="text-xs text-orange-500 mb-1 font-medium">Reviewer requested changes</div>
          <span data-testid="change-request-comment">{latestCR.comment}</span>
        </div>
      )}

      {/* Optimization slider */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Optimization Level</span>
          <span className="font-semibold text-teal-600" data-testid="risk-band-label">
            {localLevel}% — {band.label} <span className="text-zinc-400">({band.uplift})</span>
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={localLevel}
          disabled={frozen}
          data-testid="optimization-slider"
          onChange={(e) => setLocalLevel(parseInt(e.target.value, 10))}
          className="w-full accent-teal-500 disabled:opacity-40"
        />
        <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
          {["Conservative", "Moderate", "Balanced", "Aggressive", "Full Opt."].map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </div>

      {/* Frontier chart */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="text-xs font-medium text-zinc-500 mb-2">Profit vs Revenue Frontier</div>
        <FrontierChart output={output} scenarioPoint={scenarioPoint} />
      </div>

      {/* 3-column comparison table */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="text-left px-3 py-2 text-zinc-500 font-medium">Metric</th>
              <th className="text-right px-3 py-2 text-zinc-500 font-medium">Current</th>
              <th className="text-right px-3 py-2 text-teal-600 font-medium">Scenario</th>
              <th className="text-right px-3 py-2 text-zinc-500 font-medium">ML Rec</th>
            </tr>
          </thead>
          <tbody>
            {output.comparison.map((row) => (
              <tr key={row.metric} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 font-medium">{row.metric}</td>
                <td className="px-3 py-1.5 text-right text-zinc-500">{row.current}</td>
                <td className="px-3 py-1.5 text-right font-semibold text-teal-600">{row.scenario}</td>
                <td className="px-3 py-1.5 text-right text-zinc-500">{row.mlRec}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Narrative */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
        <div className="text-xs font-medium text-zinc-500">AI Narrative</div>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{output.narrative}</p>
        <div className="flex items-center gap-1.5 text-xs text-amber-600">
          <AlertTriangle size={12} strokeWidth={1.5} />
          <span>{output.uncertainty}</span>
        </div>
      </div>

      {/* Guardrail results */}
      {output.guardrailResults.length > 0 && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
          <div className="text-xs font-medium text-zinc-500 mb-2">Guardrail Compliance</div>
          <div className="space-y-1">
            {output.guardrailResults.map((g) => (
              <div key={g.id} className="flex items-center justify-between text-xs">
                <span className={g.passed ? "text-teal-600" : "text-red-500"}>
                  {g.passed ? "✓" : "✗"} {g.rule} {g.op} {g.threshold}{g.unit}
                </span>
                <span className={`text-xs ${g.severity === "hard" ? "text-red-500" : "text-amber-500"}`}>
                  {g.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tagged recommendations */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <button
          className="flex items-center gap-1.5 w-full text-left text-xs font-medium text-zinc-500 mb-2"
          onClick={() => setExpandedRecs((v) => !v)}
        >
          {expandedRecs ? <ChevronDown size={12} strokeWidth={1.5} /> : <ChevronRight size={12} strokeWidth={1.5} />}
          Recommendations ({output.recommendations.length})
        </button>
        {expandedRecs && (
          <div className="space-y-2 mt-2">
            {output.recommendations.map((rec, i) => (
              <div key={i} className="flex gap-2 items-start text-xs">
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${TAG_COLORS[rec.tag] ?? ""}`}>
                  {rec.tag}
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">{rec.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discard confirm */}
      {confirmDiscard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold mb-2">Discard scenario?</h3>
            <p className="text-sm text-zinc-500 mb-4">
              This will permanently delete &ldquo;{scenario.name}&rdquo; and cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDiscard(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDiscard}
                data-testid="discard-confirm"
                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
              >
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function PriceScenariosScreen() {
  const [scenarios, setScenarios] = useState<ScenarioEntity[]>([])
  const [selected, setSelected] = useState<ScenarioEntity | null>(null)
  const [mode, setMode] = useState<Mode>("list")
  const [focusSets, setFocusSets] = useState<FocusSetSummary[]>([])

  useEffect(() => {
    void listScenarios().then(setScenarios)
    void listFocusSets().then(setFocusSets)
  }, [])

  function handleSelectRow(s: ScenarioEntity) {
    setSelected(s)
    setMode("output")
  }

  function handleNewScenario() {
    setSelected(null)
    setMode("create")
  }

  function handleCancelCreate() {
    setMode("list")
  }

  function handleRunComplete(ran: ScenarioEntity) {
    setScenarios((prev) => {
      const exists = prev.find((s) => s.id === ran.id)
      return exists ? prev.map((s) => (s.id === ran.id ? ran : s)) : [ran, ...prev]
    })
    setSelected(ran)
    setMode("output")
  }

  async function handleSubmit() {
    if (!selected) return
    const updated = await submitScenario(selected.id)
    setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    setSelected(updated)
  }

  async function handleResubmit() {
    if (!selected) return
    const updated = await submitScenario(selected.id)
    setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    setSelected(updated)
  }

  async function handleDiscard() {
    if (!selected) return
    await deleteScenario(selected.id)
    setScenarios((prev) => prev.filter((s) => s.id !== selected.id))
    setSelected(null)
    setMode("list")
  }

  return (
    <motion.div {...PAGE_TRANSITION} className="h-full flex gap-4 p-4">
      {/* Left: scenario list */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Price Scenarios</h2>
          <Button size="sm" variant="ghost" onClick={handleNewScenario} className="gap-1">
            <Plus size={14} strokeWidth={1.5} />
            New Scenario
          </Button>
        </div>

        {scenarios.length === 0 && (
          <div className="text-xs text-zinc-400 text-center py-8">No scenarios yet</div>
        )}

        {scenarios.map((s) => (
          <button
            key={s.id}
            data-testid="scenario-list-row"
            onClick={() => handleSelectRow(s)}
            className={`w-full text-left rounded-lg border p-3 text-xs transition-colors ${
              selected?.id === s.id
                ? "border-teal-400 bg-teal-50 dark:bg-teal-950"
                : "border-zinc-200 dark:border-zinc-800 hover:border-teal-300"
            }`}
          >
            <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate mb-1">{s.name}</div>
            <div className="flex items-center justify-between">
              <StatusBadge status={s.status} />
              <span className="text-zinc-400">{s.skuCount} SKUs</span>
            </div>
          </button>
        ))}
      </div>

      {/* Right: content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {mode === "list" && (
          <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
            Select a scenario or create a new one
          </div>
        )}

        {mode === "create" && (
          <CreateForm focusSets={focusSets} onRun={handleRunComplete} onCancel={handleCancelCreate} />
        )}

        {mode === "output" && selected?.output && (
          <OutputView
            scenario={selected}
            output={selected.output}
            onDiscard={handleDiscard}
            onSubmit={handleSubmit}
            onResubmit={handleResubmit}
          />
        )}
      </div>
    </motion.div>
  )
}
