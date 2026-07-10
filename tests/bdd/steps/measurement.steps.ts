import { Given, When, Then } from "@cucumber/cucumber"
import { strict as assert } from "node:assert"
import { getPage } from "../support/browser"

const BASE_URL = process.env.BDD_BASE_URL ?? "http://localhost:5173"
const API_URL = process.env.BDD_API_URL ?? "http://localhost:3000"

interface BlockView {
  status: "Balanced" | "Imbalanced" | "Missing-arm"
}

interface ClusterView {
  id: number
  arm: "treatment" | "control"
  mlPrice: number | null
}

interface ExperimentView {
  id: number
  status: "setup" | "live" | "concluded"
  blocks: Array<BlockView & { clusters: ClusterView[] }>
  goLiveEligible: boolean
  readout: { verdict: "gathering" | "win" | "kill"; probabilityOfWinning: number } | null
}

// ---------------------------------------------------------------------------
// Anticipated backend surface (not yet implemented — see
// knowledge/specs/001-platform-baseline/validation/SLICE-12-preparation.md):
// GET /measurement/experiments/:id -> ExperimentView
// POST /measurement/experiments/:id/clusters/:clusterId/move -> ClusterView
// POST /measurement/experiments/:id/acknowledge-cost -> ExperimentView
// GET /measurement/experiments/:id/readout -> live readout
// Seed data assumed: experiment 1 = setup, has >=1 imbalanced block, cost not
// acknowledged; experiment 2 = setup, all blocks balanced, cost not yet
// acknowledged, has >=1 treatment cluster with an mlPrice; experiment 3 =
// live, win-probability already >= the win boundary (high-90s%).
// ---------------------------------------------------------------------------

async function openExperiment(id: number) {
  const page = getPage()
  await page.goto(`${BASE_URL}/measurement`, { waitUntil: "domcontentloaded" })
  await page.locator(`[data-testid="experiment-row"][data-experiment-id="${id}"]`).click()
}

// ---------------------------------------------------------------------------
// Scenario: Go Live gated on balance and cost acknowledgment
// ---------------------------------------------------------------------------

Given("an experiment with at least one imbalanced block", async () => {
  const res = await fetch(`${API_URL}/measurement/experiments/1`)
  const experiment = (await res.json()) as ExperimentView
  const hasImbalanced = experiment.blocks.some((b) => b.status === "Imbalanced")
  if (!hasImbalanced) throw new Error("Expected seeded experiment 1 to have an imbalanced block")
  await openExperiment(1)
  await getPage().getByTestId("go-live-btn").waitFor({ state: "attached" })
})

Then('"Go Live" is disabled with an explanatory tooltip', async () => {
  const page = getPage()
  const disabled = await page.getByTestId("go-live-btn").getAttribute("disabled")
  assert.notEqual(disabled, null, "Expected Go Live button to be disabled")
  const tooltip = await page.getByTestId("go-live-tooltip").textContent()
  assert.ok(tooltip && tooltip.trim().length > 0, "Expected an explanatory Go Live tooltip")
})

When("all blocks are balanced and I acknowledge the cost of control", async () => {
  // Experiment 2 is seeded with all blocks already balanced; acknowledging its
  // cost is the actual UI action under test (balance itself is a derived,
  // read-only property of cluster arm assignments, not a directly settable flag).
  const res = await fetch(`${API_URL}/measurement/experiments/2`)
  const experiment = (await res.json()) as ExperimentView
  const allBalanced = experiment.blocks.every((b) => b.status === "Balanced")
  if (!allBalanced) throw new Error("Expected seeded experiment 2 to have all blocks balanced")
  await openExperiment(2)
  await getPage().getByTestId("cost-ack-checkbox").click()
})

Then('"Go Live" becomes enabled', async () => {
  const page = getPage()
  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-testid="go-live-btn"]') as HTMLButtonElement | null
    return btn !== null && !btn.disabled
  })
})

// ---------------------------------------------------------------------------
// Scenario: Moving a cluster to control drops its ML price
// ---------------------------------------------------------------------------

Given("a treatment cluster with an ML price recommendation", async () => {
  const res = await fetch(`${API_URL}/measurement/experiments/2`)
  const experiment = (await res.json()) as ExperimentView
  const cluster = experiment.blocks.flatMap((b) => b.clusters).find((c) => c.arm === "treatment" && c.mlPrice !== null)
  if (!cluster) throw new Error("Expected seeded experiment 2 to have a treatment cluster with an mlPrice")
  await openExperiment(2)
  await getPage().locator(`[data-testid="cluster-row"][data-cluster-id="${cluster.id}"]`).waitFor({ state: "attached" })
})

When("I move it to control", async () => {
  const page = getPage()
  const row = page.getByTestId("cluster-row").filter({ has: page.getByTestId("move-to-control-btn") }).first()
  await row.getByTestId("move-to-control-btn").click()
})

Then("its ML recommendation is removed and it runs BAU pricing", async () => {
  const page = getPage()
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll('[data-testid="cluster-row"]')
    return Array.from(rows).some((r) => r.getAttribute("data-arm") === "control" && r.getAttribute("data-ml-price") === "")
  })
})

// ---------------------------------------------------------------------------
// Scenario: Verdict banner on crossing a boundary
// ---------------------------------------------------------------------------

Given("a live experiment whose win-probability crosses the win boundary", async () => {
  const res = await fetch(`${API_URL}/measurement/experiments/3`)
  const experiment = (await res.json()) as ExperimentView
  if (experiment.status !== "live" || experiment.readout?.verdict !== "win") {
    throw new Error("Expected seeded experiment 3 to be live with a 'win' verdict")
  }
  await openExperiment(3)
})

Then('the verdict banner shows "win" with an action to scale to all matching SKUs', async () => {
  const page = getPage()
  const banner = await page.getByTestId("verdict-banner").textContent()
  assert.ok(banner?.toLowerCase().includes("win"), `Expected verdict banner to show "win", got "${banner}"`)
  await page.getByTestId("scale-btn").waitFor({ state: "attached" })
})
