import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import type { ActionClassEntity, AuditEntry, AutonomyRosterView, LiveActionEntity, TrustRung } from "./autonomy-types"
import { demote, disengageKillSwitch, engageKillSwitch, getAudit, getRoster, promote, undo, veto } from "./autonomy-api"

const PAGE_TRANSITION = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18, ease: "easeOut" as const } }

const TRUST_COLORS: Record<TrustRung, string> = {
  Manual: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  Supervised: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  Autonomous: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200",
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  vetoed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
  applied: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200",
  undone: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
}

function KpiTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  )
}

function ActionClassCard({
  actionClass,
  selected,
  killSwitchEngaged,
  blockedReason,
  onSelect,
  onPromote,
  onDemote,
}: {
  actionClass: ActionClassEntity
  selected: boolean
  killSwitchEngaged: boolean
  blockedReason: string | null
  onSelect: () => void
  onPromote: () => void
  onDemote: () => void
}) {
  return (
    <div
      data-testid="action-class-card"
      onClick={onSelect}
      className={`flex flex-col gap-2 rounded-md border p-3 cursor-pointer transition-colors ${
        selected ? "border-teal-400" : "border-zinc-200 dark:border-zinc-800 hover:border-teal-400"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{actionClass.name}</span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${TRUST_COLORS[actionClass.trustRung]}`}>{actionClass.trustRung}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span>{actionClass.reversibilityClass} reversibility</span>
        <span>{(actionClass.accuracy * 100).toFixed(0)}% accuracy</span>
        <span>${actionClass.liveDollarValue.toLocaleString()} live</span>
      </div>
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="outline" data-testid="promote-btn" disabled={killSwitchEngaged} onClick={onPromote}>
          Promote
        </Button>
        <Button size="sm" variant="ghost" data-testid="demote-btn" onClick={onDemote}>
          Demote
        </Button>
      </div>
      {selected && blockedReason && (
        <p data-testid="promote-blocked-reason" className="text-xs text-red-600 dark:text-red-400">
          {blockedReason}
        </p>
      )}
    </div>
  )
}

function LiveActionRow({
  liveAction,
  killSwitchEngaged,
  secondsRemaining,
  onVeto,
  onUndo,
}: {
  liveAction: LiveActionEntity
  killSwitchEngaged: boolean
  secondsRemaining: number
  onVeto: () => void
  onUndo: () => void
}) {
  return (
    <div data-testid="live-action-row" className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="flex flex-col">
        <span className="text-sm">{liveAction.description}</span>
        <span className="text-xs text-zinc-500">
          <span data-testid="veto-countdown">{Math.max(0, secondsRemaining)}s</span> remaining
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[liveAction.status] ?? ""}`}>{liveAction.status}</span>
        {liveAction.status === "pending" && (
          <Button size="sm" variant="outline" data-testid="veto-btn" disabled={killSwitchEngaged} onClick={onVeto}>
            Veto
          </Button>
        )}
        {liveAction.status === "applied" && (
          <Button size="sm" variant="outline" data-testid="undo-btn" disabled={killSwitchEngaged} onClick={onUndo}>
            Undo
          </Button>
        )}
      </div>
    </div>
  )
}

export function AutonomyScreen() {
  const [roster, setRoster] = useState<AutonomyRosterView | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [blockedReason, setBlockedReason] = useState<string | null>(null)
  const [countdowns, setCountdowns] = useState<Record<number, number>>({})
  const killSwitchEngagedRef = useRef(false)

  async function refresh() {
    const r = await getRoster()
    setRoster(r)
    killSwitchEngagedRef.current = r.killSwitchEngaged
    setCountdowns((prev) => {
      const next = { ...prev }
      for (const la of r.liveActions) {
        if (!(la.id in next)) next[la.id] = la.vetoWindowSeconds
      }
      return next
    })
  }

  useEffect(() => {
    void refresh()
    const interval = setInterval(() => {
      if (killSwitchEngagedRef.current) return
      setCountdowns((prev) => {
        const next = { ...prev }
        for (const id in next) next[id] = Math.max(0, next[id] - 1)
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedId == null) {
      setAudit([])
      return
    }
    void getAudit(selectedId).then(setAudit)
  }, [selectedId])

  if (!roster) {
    return <div className="p-6 text-sm text-zinc-500">Loading autonomy roster…</div>
  }

  const { kpis, actionClasses, liveActions, killSwitchEngaged } = roster

  return (
    <motion.div {...PAGE_TRANSITION} className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pricing Autonomy</h1>
        <Button
          size="sm"
          variant={killSwitchEngaged ? "default" : "outline"}
          data-testid="kill-switch-btn"
          onClick={() =>
            void (killSwitchEngaged ? disengageKillSwitch() : engageKillSwitch()).then(refresh)
          }
        >
          {killSwitchEngaged ? "Disengage Kill Switch" : "Emergency Kill Switch"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Action classes" value={kpis.totalActionClasses} />
        <KpiTile label="Eligible to promote" value={kpis.eligibleToPromote} />
        <KpiTile label="Total live $ value" value={`$${kpis.totalLiveDollarValue.toLocaleString()}`} />
        <KpiTile label="Avg proof accuracy" value={`${(kpis.averageProofAccuracy * 100).toFixed(0)}%`} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Action Classes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {actionClasses.map((ac) => (
            <ActionClassCard
              key={ac.id}
              actionClass={ac}
              selected={selectedId === ac.id}
              killSwitchEngaged={killSwitchEngaged}
              blockedReason={selectedId === ac.id ? blockedReason : null}
              onSelect={() => {
                setSelectedId(ac.id)
                setBlockedReason(null)
              }}
              onPromote={() =>
                void promote(ac.id).then((result) => {
                  setSelectedId(ac.id)
                  setBlockedReason(result.ok ? null : result.reason ?? "Promotion blocked")
                  if (result.ok) void refresh()
                })
              }
              onDemote={() => void demote(ac.id).then(refresh)}
            />
          ))}
        </div>
      </div>

      {selectedId != null && (
        <div data-testid="audit-feed" className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Audit Trail</h2>
          {audit.length === 0 ? (
            <p className="text-xs text-zinc-500">No audit entries yet.</p>
          ) : (
            audit.map((entry) => (
              <div key={entry.id} className="text-xs text-zinc-500">
                {new Date(entry.timestamp).toLocaleString()} — {entry.action} ({entry.actor})
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Live Supervision</h2>
        <div className="flex flex-col gap-2">
          {liveActions.map((la) => (
            <LiveActionRow
              key={la.id}
              liveAction={la}
              killSwitchEngaged={killSwitchEngaged}
              secondsRemaining={countdowns[la.id] ?? la.vetoWindowSeconds}
              onVeto={() => void veto(la.id).then(refresh)}
              onUndo={() => void undo(la.id).then(refresh)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
