import { Given, When, Then } from "@cucumber/cucumber"
import { strict as assert } from "node:assert"
import { getPage } from "../support/browser"

const BASE_URL = process.env.BDD_BASE_URL ?? "http://localhost:5173"
const API_URL = process.env.BDD_API_URL ?? "http://localhost:3000"

interface MonitorEntity {
  id: number
  name: string
  status: "active" | "paused"
}

// ---------------------------------------------------------------------------
// Scenario: Pause and resume a monitor
// ---------------------------------------------------------------------------

Given("a running monitor card", async () => {
  const page = getPage()
  const res = await fetch(`${API_URL}/agents/roster`)
  const roster = (await res.json()) as { monitors: MonitorEntity[] }
  const monitor = roster.monitors[0]
  if (monitor.status !== "active") {
    await fetch(`${API_URL}/agents/monitors/${monitor.id}/resume`, { method: "POST" })
  }
  await page.goto(`${BASE_URL}/agents`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("monitor-card").first().waitFor({ state: "attached" })
})

When("I pause it and then resume it", async () => {
  const page = getPage()
  const card = page.getByTestId("monitor-card").first()
  await card.getByTestId("monitor-toggle-btn").click()
  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-testid="monitor-card"] [data-testid="monitor-toggle-btn"]')
    return btn?.textContent?.includes("Resume")
  })
  await card.getByTestId("monitor-toggle-btn").click()
  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-testid="monitor-card"] [data-testid="monitor-toggle-btn"]')
    return btn?.textContent?.includes("Pause")
  })
})

Then("its state and signals-today counter update accordingly", async () => {
  const page = getPage()
  const card = page.getByTestId("monitor-card").first()
  const statusText = await card.getByTestId("monitor-status").textContent()
  assert.ok(statusText?.toLowerCase().includes("active"), `Expected monitor status "active", got "${statusText}"`)
  const signalsText = await card.getByTestId("monitor-signals-today").textContent()
  assert.ok(signalsText && signalsText.length > 0, "Expected a signals-today counter to be shown")
})

// ---------------------------------------------------------------------------
// Scenario: Hire a standing agent
// ---------------------------------------------------------------------------

Given("the agent roster", async () => {
  const page = getPage()
  await page.goto(`${BASE_URL}/agents`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("hire-agent-btn").waitFor({ state: "attached" })
})

When('I hire a "Price Drift Monitor" from the catalog', async () => {
  const page = getPage()
  await page.getByTestId("hire-agent-btn").click()
  await page.getByTestId("hire-subtype-select").waitFor({ state: "attached" })
  await page.getByTestId("hire-subtype-select").selectOption({ label: "Price Drift Monitor" })
  await page.getByTestId("hire-confirm-btn").click()
})

Then("it appears in the Monitors section", async () => {
  const page = getPage()
  await page.waitForFunction(() => {
    const cards = document.querySelectorAll('[data-testid="monitor-card"]')
    return Array.from(cards).some((c) => c.textContent?.includes("Price Drift Monitor"))
  })
})
