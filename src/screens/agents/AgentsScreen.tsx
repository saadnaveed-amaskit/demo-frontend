import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import type { AgentCatalogView, AgentRosterView, HireKind, MonitorEntity, OperatorView, TaskAgentEntity } from "./agent-types"
import { getCatalog, getRoster, hireAgent, pauseMonitor, resumeMonitor, retireTaskAgent } from "./agents-api"

const PAGE_TRANSITION = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18, ease: "easeOut" as const } }

const TRUST_COLORS: Record<string, string> = {
  Low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  High: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200",
}

function KpiTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  )
}

function MonitorCard({ monitor, onToggle }: { monitor: MonitorEntity; onToggle: () => void }) {
  return (
    <div data-testid="monitor-card" className="flex flex-col gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{monitor.name}</span>
        <span
          data-testid="monitor-status"
          className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
            monitor.status === "active" ? "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {monitor.status}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span data-testid="monitor-signals-today">{monitor.signalsToday} signals today</span>
        <span>Last activity: {new Date(monitor.lastActivity).toLocaleString()}</span>
      </div>
      <Button size="sm" variant="outline" data-testid="monitor-toggle-btn" onClick={onToggle}>
        {monitor.status === "active" ? "Pause" : "Resume"}
      </Button>
    </div>
  )
}

function OperatorCard({ operator, onOpenAutonomy }: { operator: OperatorView; onOpenAutonomy: () => void }) {
  return (
    <div
      data-testid="operator-card"
      onClick={onOpenAutonomy}
      className="flex flex-col gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 p-3 cursor-pointer hover:border-teal-400 transition-colors"
    >
      <span className="text-sm font-medium">{operator.name}</span>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${TRUST_COLORS[operator.trustLevel]}`}>{operator.trustLevel} trust</span>
        <span className="text-xs text-zinc-500 capitalize">{operator.evidenceStatus.replace("-", " ")}</span>
      </div>
      <span className="text-xs text-zinc-500">{operator.trackRecord}</span>
    </div>
  )
}

function TaskAgentCard({ taskAgent, onRetire }: { taskAgent: TaskAgentEntity; onRetire: () => void }) {
  const navigate = useNavigate()
  return (
    <div data-testid="task-agent-card" className="flex flex-col gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{taskAgent.name}</span>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
            taskAgent.status === "running" ? "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {taskAgent.status}
        </span>
      </div>
      <span className="text-xs text-zinc-500">Spawned by: {taskAgent.spawnedBy}</span>
      <span className="text-xs text-zinc-500">Retires when: {taskAgent.retirementCondition}</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" data-testid="task-agent-open-btn" onClick={() => navigate(taskAgent.openLink)}>
          Open
        </Button>
        {taskAgent.status === "running" && (
          <Button size="sm" variant="ghost" data-testid="task-agent-retire-btn" onClick={onRetire}>
            Retire
          </Button>
        )}
      </div>
    </div>
  )
}

export function AgentsScreen() {
  const navigate = useNavigate()
  const [roster, setRoster] = useState<AgentRosterView | null>(null)
  const [catalog, setCatalog] = useState<AgentCatalogView | null>(null)
  const [hiring, setHiring] = useState(false)
  const [hireKind, setHireKind] = useState<HireKind>("monitor")
  const [hireSubtype, setHireSubtype] = useState("")

  async function refresh() {
    setRoster(await getRoster())
  }

  useEffect(() => {
    void refresh()
    void getCatalog().then(setCatalog)
  }, [])

  useEffect(() => {
    if (!catalog) return
    const options = hireKind === "monitor" ? catalog.monitorTypes : catalog.operatorTypes
    setHireSubtype(options[0] ?? "")
  }, [hireKind, catalog])

  if (!roster || !catalog) {
    return <div className="p-6 text-sm text-zinc-500">Loading agent roster…</div>
  }

  const { kpis, monitors, operators, taskAgents } = roster
  const options = hireKind === "monitor" ? catalog.monitorTypes : catalog.operatorTypes

  return (
    <motion.div {...PAGE_TRANSITION} className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Agents</h1>
        <Button size="sm" data-testid="hire-agent-btn" onClick={() => setHiring((v) => !v)}>
          Hire Agent
        </Button>
      </div>

      {hiring && (
        <div className="flex items-end gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500" htmlFor="hire-kind-select">
              Kind
            </label>
            <select
              id="hire-kind-select"
              data-testid="hire-kind-select"
              value={hireKind}
              onChange={(e) => setHireKind(e.target.value as HireKind)}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="monitor">Monitor</option>
              <option value="operator">Operator</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500" htmlFor="hire-subtype-select">
              Type
            </label>
            <select
              id="hire-subtype-select"
              data-testid="hire-subtype-select"
              value={hireSubtype}
              onChange={(e) => setHireSubtype(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            data-testid="hire-confirm-btn"
            onClick={() =>
              void hireAgent({ kind: hireKind, subtype: hireSubtype }).then(async () => {
                setHiring(false)
                await refresh()
              })
            }
          >
            Confirm
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiTile label="Agents on team" value={kpis.agentsOnTeam} />
        <KpiTile label="Signals today" value={kpis.signalsToday} />
        <KpiTile label="Acting autonomously" value={kpis.actingAutonomously} />
        <KpiTile label="Evidence-backed" value={`${kpis.evidenceBackedCount}/${kpis.evidenceBackedTotal}`} />
        <KpiTile label="Task agents running" value={kpis.taskAgentsRunning} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Monitors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {monitors.map((m) => (
            <MonitorCard
              key={m.id}
              monitor={m}
              onToggle={() =>
                void (m.status === "active" ? pauseMonitor(m.id) : resumeMonitor(m.id)).then(refresh)
              }
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Operators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {operators.map((o) => (
            <OperatorCard key={o.id} operator={o} onOpenAutonomy={() => navigate("/autonomy")} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Task Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {taskAgents.map((t) => (
            <TaskAgentCard key={t.id} taskAgent={t} onRetire={() => void retireTaskAgent(t.id).then(refresh)} />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
