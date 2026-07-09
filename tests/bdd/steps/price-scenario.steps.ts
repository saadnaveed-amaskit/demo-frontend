import { Before, Given, When, Then } from "@cucumber/cucumber"
import { strict as assert } from "node:assert"
import type { Page } from "@playwright/test"
import { getPage } from "../support/browser"

const BASE_URL = process.env.BDD_BASE_URL ?? "http://localhost:5173"
const API_URL = process.env.BDD_API_URL ?? "http://localhost:3000"

async function clearScenarios() {
  const res = await fetch(`${API_URL}/price-scenarios`)
  if (!res.ok) return
  const scenarios = (await res.json()) as { id: number }[]
  await Promise.all(
    scenarios.map((s) => fetch(`${API_URL}/price-scenarios/${s.id}`, { method: "DELETE" })),
  )
}

async function clearFocusSets7() {
  const res = await fetch(`${API_URL}/focus-sets`)
  if (!res.ok) return
  const sets = (await res.json()) as { id: string }[]
  await Promise.all(sets.map((s) => fetch(`${API_URL}/focus-sets/${s.id}`, { method: "DELETE" })))
}

async function createSet(): Promise<string> {
  const res = await fetch(`${API_URL}/focus-sets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Scenario Set",
      filter: {
        type: "group",
        logic: "AND",
        rules: [{ type: "rule", attr: "brand", val: "TCP" }],
      },
    }),
  })
  const fs = (await res.json()) as { id: string }
  return fs.id
}

async function createRunScenario(focusGroupId: string, opts: { optimizationLevel?: number } = {}): Promise<number> {
  const createRes = await fetch(`${API_URL}/price-scenarios`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "BDD Scenario",
      focusGroupId,
      startDate: "2026-08-01",
      endDate: "2026-09-30",
      objectives: { revenue: 50, grossMargin: 30, sellThrough: 20 },
      optimizationLevel: opts.optimizationLevel ?? 50,
    }),
  })
  const s = (await createRes.json()) as { id: number }
  await fetch(`${API_URL}/price-scenarios/${s.id}/run`, { method: "POST" })
  return s.id
}

async function setRangeValue(page: Page, testId: string, value: number) {
  await page.evaluate(
    ({ tid, val }: { tid: string; val: number }) => {
      const input = document.querySelector(`[data-testid="${tid}"]`) as HTMLInputElement
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!
      setter.call(input, String(val))
      input.dispatchEvent(new Event("input", { bubbles: true }))
    },
    { tid: testId, val: value },
  )
}

// cross-step state
let scenarioFsId7 = ""

Before(async () => {
  await clearScenarios()
  await clearFocusSets7()
  scenarioFsId7 = ""
})

// ---------------------------------------------------------------------------
// Scenario: Objective sliders always sum to 100
// ---------------------------------------------------------------------------

Given("I am creating a new price scenario", async () => {
  const page = getPage()
  scenarioFsId7 = await createSet()
  await page.goto(`${BASE_URL}/scenario`, { waitUntil: "domcontentloaded" })
  await page.getByRole("button", { name: /New Scenario/i }).click()
  await page.getByTestId("revenue-weight-input").waitFor({ state: "attached" })
})

When("I increase the Revenue weight to 60", async () => {
  const page = getPage()
  await setRangeValue(page, "revenue-weight-input", 60)
})

Then("the other weights redistribute so the total remains 100", async () => {
  const page = getPage()
  await page.waitForTimeout(100)
  const gmVal = await page.getByTestId("gross-margin-weight-input").inputValue()
  const stVal = await page.getByTestId("sell-through-weight-input").inputValue()
  const total = 60 + Number(gmVal) + Number(stVal)
  assert.equal(total, 100, `Expected weights to sum to 100, got ${total}`)
})

// ---------------------------------------------------------------------------
// Scenario: Move the scenario position along the frontier
// ---------------------------------------------------------------------------

Given("a price scenario with output at optimization level 30", async () => {
  const page = getPage()
  const fsId = await createSet()
  const scenId = await createRunScenario(fsId, { optimizationLevel: 30 })
  await page.goto(`${BASE_URL}/scenario`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("scenario-list-row").first().waitFor({ state: "attached" })
  await page.getByTestId("scenario-list-row").first().click()
  await page.getByTestId("scenario-output").waitFor({ state: "attached" })
  // suppress unused warning
  void scenId
})

When("I move the optimization slider to 70", async () => {
  const page = getPage()
  await setRangeValue(page, "optimization-slider", 70)
})

Then('the risk band label shows "Aggressive"', async () => {
  const page = getPage()
  await page.waitForTimeout(100)
  const label = await page.getByTestId("risk-band-label").textContent()
  assert.ok(label?.includes("Aggressive"), `Expected risk band "Aggressive", got "${label}"`)
})

// ---------------------------------------------------------------------------
// Scenario: Freeze edits once submitted
// ---------------------------------------------------------------------------

Given("a pending price scenario in the list", async () => {
  const page = getPage()
  const fsId = await createSet()
  const scenId = await createRunScenario(fsId)
  await fetch(`${API_URL}/price-scenarios/${scenId}/submit`, { method: "POST" })
  await page.goto(`${BASE_URL}/scenario`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("scenario-list-row").first().waitFor({ state: "attached" })
})

When("I view it", async () => {
  await getPage().getByTestId("scenario-list-row").first().click()
  await getPage().getByTestId("scenario-output").waitFor({ state: "attached" })
})

Then("the optimization slider and submit button are disabled", async () => {
  const page = getPage()
  const sliderDisabled = await page.getByTestId("optimization-slider").getAttribute("disabled")
  assert.notEqual(sliderDisabled, null, "Expected optimization slider to be disabled")
  const submitCount = await page.getByTestId("submit-btn").count()
  assert.equal(submitCount, 0, "Expected submit button to be absent when pending")
})

// ---------------------------------------------------------------------------
// Scenario: Resubmit a returned scenario
// ---------------------------------------------------------------------------

Given("a returned price scenario with a change request comment {string}", async (comment: string) => {
  const page = getPage()
  const fsId = await createSet()
  const scenId = await createRunScenario(fsId)
  await fetch(`${API_URL}/price-scenarios/${scenId}/submit`, { method: "POST" })
  await fetch(`${API_URL}/price-scenarios/${scenId}/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "returned", comment }),
  })
  await page.goto(`${BASE_URL}/scenario`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("scenario-list-row").first().waitFor({ state: "attached" })
})

Then("I can see the reviewer comment and the Resubmit button is enabled", async () => {
  const page = getPage()
  const comment = await page.getByTestId("change-request-comment").textContent()
  assert.ok(comment?.includes("Adjust revenue weight"), `Expected comment text, got "${comment}"`)
  const resubmit = page.getByTestId("resubmit-btn")
  await resubmit.waitFor({ state: "attached" })
  const disabled = await resubmit.getAttribute("disabled")
  assert.equal(disabled, null, "Expected Resubmit button to be enabled")
})
