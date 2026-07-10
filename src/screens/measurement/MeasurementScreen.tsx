import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ResponsiveBar } from "@nivo/bar"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { BlockStatus, ClusterArm, ClusterView, ExperimentView } from "./measurement-types"
import { acknowledgeCost, getExperiment, goLive, kill, listExperiments, moveCluster, scale } from "./measurement-api"

const PAGE_TRANSITION = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18, ease: "easeOut" as const } }

const BLOCK_STATUS_COLORS: Record<BlockStatus, string> = {
  Balanced: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200",
  Imbalanced: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
  "Missing-an-arm": "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
}

function KpiTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  )
}

function otherArm(arm: ClusterArm): ClusterArm {
  return arm === "treatment" ? "control" : "treatment"
}

function ClusterRow({ cluster, onMove }: { cluster: ClusterView; onMove: (arm: ClusterArm) => void }) {
  const target = otherArm(cluster.arm)
  return (
    <div
      data-testid="cluster-row"
      data-cluster-id={cluster.id}
      data-arm={cluster.arm}
      data-ml-price={cluster.mlPrice ?? ""}
      className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 dark:border-zinc-800 p-3"
    >
      <div className="flex flex-col">
        <span className="text-sm font-medium">{cluster.name}</span>
        <span className="text-xs text-zinc-500">
          BAU ${cluster.bauPrice.toFixed(2)} · ML {cluster.mlPrice != null ? `$${cluster.mlPrice.toFixed(2)}` : "—"} · cross-elasticity {cluster.crossElasticity.toFixed(2)} · confidence {(cluster.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded text-xs font-medium capitalize bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{cluster.arm}</span>
        <Button
          size="sm"
          variant="outline"
          data-testid={`move-to-${target}-btn`}
          onClick={() => onMove(target)}
        >
          Move to {target}
        </Button>
      </div>
    </div>
  )
}

export function MeasurementScreen() {
  const [experiments, setExperiments] = useState<ExperimentView[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [experiment, setExperiment] = useState<ExperimentView | null>(null)

  async function refreshList() {
    setExperiments(await listExperiments())
  }

  async function refreshSelected(id: number) {
    setExperiment(await getExperiment(id))
  }

  useEffect(() => {
    void refreshList()
  }, [])

  useEffect(() => {
    if (selectedId == null) {
      setExperiment(null)
      return
    }
    void refreshSelected(selectedId)
  }, [selectedId])

  if (!experiments) {
    return <div className="p-6 text-sm text-zinc-500">Loading experiments…</div>
  }

  const balanceChartData =
    experiment?.blocks.map((b) => ({
      block: b.label,
      revenue: b.metricMatch?.revenue ?? 0,
      grossMargin: b.metricMatch?.grossMargin ?? 0,
      velocity: b.metricMatch?.velocity ?? 0,
    })) ?? []

  const clusters = experiment?.blocks.flatMap((b) => b.clusters) ?? []
  const treatmentCount = clusters.filter((c) => c.arm === "treatment").length
  const controlCount = clusters.filter((c) => c.arm === "control").length
  const balancedBlocks = experiment?.blocks.filter((b) => b.status === "Balanced").length ?? 0

  return (
    <motion.div {...PAGE_TRANSITION} className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Measurement</h1>

      <div className="flex flex-col gap-2">
        {experiments.map((exp) => (
          <div
            key={exp.id}
            data-testid="experiment-row"
            data-experiment-id={exp.id}
            onClick={() => setSelectedId(exp.id)}
            className={`flex items-center justify-between gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
              selectedId === exp.id ? "border-teal-400" : "border-zinc-200 dark:border-zinc-800 hover:border-teal-400"
            }`}
          >
            <span className="text-sm font-medium">{exp.name}</span>
            <span className="text-xs text-zinc-500 capitalize">{exp.status}</span>
          </div>
        ))}
      </div>

      {experiment && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiTile label="Blocks balanced" value={`${balancedBlocks}/${experiment.blocks.length}`} />
            <KpiTile label="Treatment clusters" value={treatmentCount} />
            <KpiTile label="Control clusters" value={controlCount} />
            <KpiTile label="SKUs under test" value={clusters.length} />
            <KpiTile label="Cost acknowledged" value={experiment.costAcknowledged ? "Yes" : "No"} />
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Block Balance</h2>
            <div style={{ height: 220 }}>
              <ResponsiveBar
                data={balanceChartData}
                keys={["revenue", "grossMargin", "velocity"]}
                indexBy="block"
                groupMode="grouped"
                margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
                padding={0.3}
                colors={["#0d9488", "#0891b2", "#7c3aed"]}
                axisLeft={{ legend: "Match %", legendOffset: -40, legendPosition: "middle" }}
                axisBottom={{ legend: "Block", legendOffset: 30, legendPosition: "middle" }}
                theme={{ grid: { line: { stroke: "#3f3f46", strokeWidth: 0.5 } } }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Blocks &amp; Clusters</h2>
            {experiment.blocks.map((block) => (
              <div key={block.id} className="flex flex-col gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{block.label}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${BLOCK_STATUS_COLORS[block.status]}`}>{block.status}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {block.clusters.map((cluster) => (
                    <ClusterRow
                      key={cluster.id}
                      cluster={cluster}
                      onMove={(arm) =>
                        void moveCluster(experiment.id, cluster.id, arm).then(() => refreshSelected(experiment.id))
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {experiment.status === "setup" && (
            <div className="flex flex-col gap-3 rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
              <div className="flex items-center gap-3">
                <Switch
                  data-testid="cost-ack-checkbox"
                  checked={experiment.costAcknowledged}
                  onCheckedChange={() => void acknowledgeCost(experiment.id).then(() => refreshSelected(experiment.id))}
                />
                <span className="text-sm">Acknowledge the cost of running a control</span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  data-testid="go-live-btn"
                  disabled={!experiment.goLiveEligible}
                  onClick={() =>
                    void goLive(experiment.id).then((result) => {
                      if (result.ok) void refreshSelected(experiment.id)
                    })
                  }
                >
                  Go Live
                </Button>
                {!experiment.goLiveEligible && experiment.goLiveBlockedReason && (
                  <span data-testid="go-live-tooltip" className="text-xs text-zinc-500">
                    {experiment.goLiveBlockedReason}
                  </span>
                )}
              </div>
            </div>
          )}

          {experiment.readout && (
            <div className="flex flex-col gap-3 rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
              <div
                data-testid="verdict-banner"
                className={`px-3 py-2 rounded text-sm font-medium capitalize ${
                  experiment.readout.verdict === "win"
                    ? "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200"
                    : experiment.readout.verdict === "kill"
                      ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                Verdict: {experiment.readout.verdict} — probability of winning {(experiment.readout.probabilityOfWinning * 100).toFixed(0)}% (day {experiment.readout.day})
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <KpiTile label="Probability of winning" value={`${(experiment.readout.probabilityOfWinning * 100).toFixed(0)}%`} />
                <KpiTile
                  label="Incremental margin"
                  value={`$${experiment.readout.incrementalMargin.estimate.toLocaleString()} ($${experiment.readout.incrementalMargin.lower.toLocaleString()}–$${experiment.readout.incrementalMargin.upper.toLocaleString()})`}
                />
                <KpiTile label="Observation day" value={experiment.readout.day} />
              </div>

              {experiment.readout.clusterContributions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Per-cluster contribution</h3>
                  {experiment.readout.clusterContributions.map((c) => (
                    <div key={c.clusterId} className="text-xs text-zinc-500">
                      {c.name}: ${c.contribution.toLocaleString()}
                    </div>
                  ))}
                </div>
              )}

              {experiment.status === "live" && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    data-testid="scale-btn"
                    onClick={() => void scale(experiment.id).then(() => refreshSelected(experiment.id))}
                  >
                    Scale to all matching SKUs
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid="kill-btn"
                    onClick={() => void kill(experiment.id).then(() => refreshSelected(experiment.id))}
                  >
                    Kill &amp; revert to BAU
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
