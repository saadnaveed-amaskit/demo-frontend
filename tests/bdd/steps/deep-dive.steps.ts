import { Before, Given, When, Then } from "@cucumber/cucumber"
import { strict as assert } from "node:assert"
import type { Page } from "@playwright/test"
import { getPage } from "../support/browser"

const BASE_URL = process.env.BDD_BASE_URL ?? "http://localhost:5173"
const API_URL = process.env.BDD_API_URL ?? "http://localhost:3000"

async function clearScenariosDD() {
  const res = await fetch(`${API_URL}/price-scenarios`)
  if (!res.ok) return
  const scenarios = (await res.json()) as { id: number }[]
  await Promise.all(
    scenarios.map((s) => fetch(`${API_URL}/price-scenarios/${s.id}`, { method: "DELETE" })),
  )
}

async function clearFocusSetsDD() {
  const res = await fetch(`${API_URL}/focus-sets`)
  if (!res.ok) return
  const sets = (await res.json()) as { id: string }[]
  await Promise.all(sets.map((s) => fetch(`${API_URL}/focus-sets/${s.id}`, { method: "DELETE" })))
}

async function createSetDD(): Promise<string> {
  const res = await fetch(`${API_URL}/focus-sets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Deep Dive Set",
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

async function createRunScenarioDD(
  focusGroupId: string,
  optimizationLevel: number,
): Promise<number> {
  const createRes = await fetch(`${API_URL}/price-scenarios`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "DD Scenario",
      focusGroupId,
      startDate: "2026-08-01",
      endDate: "2026-09-30",
      objectives: { revenue: 50, grossMargin: 30, sellThrough: 20 },
      optimizationLevel,
    }),
  })
  const s = (await createRes.json()) as { id: number }
  await fetch(`${API_URL}/price-scenarios/${s.id}/run`, { method: "POST" })
  return s.id
}

async function setRangeValueDD(page: Page, testId: string, value: number) {
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

async function navigateToDeepDive(page: Page) {
  await page.getByTestId("scenario-list-row").first().click()
  await page.getByTestId("scenario-output").waitFor({ state: "visible" })
  await page.getByTestId("deep-dive-tab-btn").click()
  await page.getByTestId("deep-dive-section").waitFor({ state: "visible" })
}

// cross-step state
let ddFsId = ""
let _ddScenarioId = 0

Before(async () => {
  await clearScenariosDD()
  await clearFocusSetsDD()
  ddFsId = ""
  _ddScenarioId = 0
})

// ---------------------------------------------------------------------------
// Scenario: Explain a recommended price
// ---------------------------------------------------------------------------

Given("the Price Adjustments grid in Deep Dive", async () => {
  const page = getPage()
  ddFsId = await createSetDD()
  _ddScenarioId = await createRunScenarioDD(ddFsId, 80)
  await page.goto(`${BASE_URL}/scenario`, { waitUntil: "domcontentloaded" })
  await navigateToDeepDive(page)
  await page.getByTestId("deep-dive-sub-tab-price-adj").click()
  await page.getByTestId("price-adjustment-grid").waitFor({ state: "visible" })
})

When('I select "Explain" on a row', async () => {
  const page = getPage()
  // Use the hidden testid anchor (same pattern as ProductGrid BDD)
  const explainBtn = page.getByTestId("explain-btn").first()
  await explainBtn.waitFor({ state: "attached" })
  // Use evaluate to trigger the React onClick on the hidden element
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="explain-btn"]') as HTMLButtonElement
    btn?.click()
  })
})

Then(
  "a modal shows the rationale, driving objectives, decision ladder, and contextual factors",
  async () => {
    const page = getPage()
    await page.getByTestId("explain-modal").waitFor({ state: "visible" })
    const rationale = page.getByTestId("explain-rationale")
    const objectives = page.getByTestId("explain-driving-objectives")
    const ladder = page.getByTestId("explain-decision-ladder")
    const factors = page.getByTestId("explain-contextual-factors")
    await rationale.waitFor({ state: "visible" })
    await objectives.waitFor({ state: "visible" })
    await ladder.waitFor({ state: "visible" })
    await factors.waitFor({ state: "visible" })
    assert.ok(await rationale.textContent())
    assert.ok(await objectives.textContent())
    assert.ok(await ladder.textContent())
    assert.ok(await factors.textContent())
  },
)

// ---------------------------------------------------------------------------
// Scenario: Progressive unlock by optimization level
// ---------------------------------------------------------------------------

Given("the optimization slider at 20%", async () => {
  const page = getPage()
  ddFsId = await createSetDD()
  _ddScenarioId = await createRunScenarioDD(ddFsId, 20)
  await page.goto(`${BASE_URL}/scenario`, { waitUntil: "domcontentloaded" })
  await navigateToDeepDive(page)
})

When("I raise it to 60%", async () => {
  const page = getPage()
  await setRangeValueDD(page, "optimization-slider", 60)
  await page.waitForTimeout(300)
})

Then(
  /additional price adjustments and marketing\/discount tiles become visible/,
  async () => {
    const page = getPage()
    await page.getByTestId("deep-dive-sub-tab-marketing").click()
    const tilesAt60 = await page.getByTestId("marketing-tile").count()
    assert.ok(tilesAt60 > 0, `Expected marketing tiles at 60%, got ${tilesAt60}`)

    await page.getByTestId("deep-dive-sub-tab-price-adj").click()
    await page.getByTestId("price-adjustment-grid").waitFor({ state: "visible" })
    const rowsAt60 = await page.locator(".ag-row").count()
    assert.ok(rowsAt60 > 0, `Expected price adjustment rows at 60%, got ${rowsAt60}`)
  },
)
