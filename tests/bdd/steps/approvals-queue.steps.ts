import { Before, Given, When, Then } from "@cucumber/cucumber"
import { strict as assert } from "node:assert"
import { getPage } from "../support/browser"

const BASE_URL = process.env.BDD_BASE_URL ?? "http://localhost:5173"
const API_URL = process.env.BDD_API_URL ?? "http://localhost:3000"

async function clearScenarios() {
  const res = await fetch(`${API_URL}/price-scenarios`)
  if (!res.ok) return
  const scenarios = (await res.json()) as { id: number }[]
  await Promise.all(scenarios.map((s) => fetch(`${API_URL}/price-scenarios/${s.id}`, { method: "DELETE" })))
}

async function clearDiscountModels() {
  const res = await fetch(`${API_URL}/discount-models`)
  if (!res.ok) return
  const models = (await res.json()) as { id: number }[]
  await Promise.all(models.map((m) => fetch(`${API_URL}/discount-models/${m.id}`, { method: "DELETE" })))
}

async function clearFocusSets() {
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
      name: "Approvals Set",
      filter: { type: "group", logic: "AND", rules: [{ type: "rule", attr: "brand", val: "TCP" }] },
    }),
  })
  const fs = (await res.json()) as { id: string }
  return fs.id
}

async function createPendingScenario(focusGroupId: string): Promise<number> {
  const createRes = await fetch(`${API_URL}/price-scenarios`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Approvals BDD Scenario",
      focusGroupId,
      startDate: "2026-08-01",
      endDate: "2026-09-30",
      objectives: { revenue: 50, grossMargin: 30, sellThrough: 20 },
      optimizationLevel: 50,
    }),
  })
  const s = (await createRes.json()) as { id: number }
  await fetch(`${API_URL}/price-scenarios/${s.id}/run`, { method: "POST" })
  await fetch(`${API_URL}/price-scenarios/${s.id}/submit`, { method: "POST" })
  return s.id
}

async function createPendingDiscountModel(focusGroupId: string): Promise<number> {
  const createRes = await fetch(`${API_URL}/discount-models`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Approvals BDD Model",
      focusGroupId,
      startDate: "2026-08-01",
      endDate: "2026-08-14",
      discountFormat: "percentage",
      discountDepth: 20,
      channel: "digital",
    }),
  })
  const model = (await createRes.json()) as { id: number }
  await fetch(`${API_URL}/discount-models/${model.id}/run`, { method: "POST" })
  await fetch(`${API_URL}/discount-models/${model.id}/submit`, { method: "POST" })
  return model.id
}

Before(async () => {
  await clearScenarios()
  await clearDiscountModels()
  await clearFocusSets()
})

// ---------------------------------------------------------------------------
// Scenario: Deny requires a reason
// ---------------------------------------------------------------------------

Given("a pending price scenario in the approvals queue", async () => {
  const page = getPage()
  const fsId = await createSet()
  await createPendingScenario(fsId)
  await page.goto(`${BASE_URL}/approvals`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("approval-tab-scenarios").click()
  await page.getByTestId("approval-row").first().waitFor({ state: "attached" })
})

When("I attempt to deny it without a reason", async () => {
  const page = getPage()
  await page.getByTestId("approval-row").first().getByTestId("deny-btn").click()
  await page.getByTestId("deny-reason-input").waitFor({ state: "attached" })
})

Then("the deny action is blocked until a reason is entered", async () => {
  const page = getPage()
  const confirmBtn = page.getByTestId("deny-confirm-btn")
  const disabledBefore = await confirmBtn.getAttribute("disabled")
  assert.notEqual(disabledBefore, null, "Expected deny-confirm-btn to be disabled with no reason")
  await page.getByTestId("deny-reason-input").fill("Margin impact too high")
  const disabledAfter = await confirmBtn.getAttribute("disabled")
  assert.equal(disabledAfter, null, "Expected deny-confirm-btn to be enabled once a reason is entered")
})

// ---------------------------------------------------------------------------
// Scenario: Returning a discount model for changes requires a comment
// ---------------------------------------------------------------------------

Given("a pending discount model in the approvals queue", async () => {
  const page = getPage()
  const fsId = await createSet()
  await createPendingDiscountModel(fsId)
  await page.goto(`${BASE_URL}/approvals`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("approval-tab-discounts").click()
  await page.getByTestId("approval-row").first().waitFor({ state: "attached" })
})

When("I attempt to return it for changes without a comment", async () => {
  const page = getPage()
  await page.getByTestId("approval-row").first().getByTestId("return-btn").click()
  await page.getByTestId("return-comment-input").waitFor({ state: "attached" })
})

Then("the return action is blocked until a comment is entered", async () => {
  const page = getPage()
  const confirmBtn = page.getByTestId("return-confirm-btn")
  const disabledBefore = await confirmBtn.getAttribute("disabled")
  assert.notEqual(disabledBefore, null, "Expected return-confirm-btn to be disabled with no comment")
  await page.getByTestId("return-comment-input").fill("Please re-check competitive pricing")
  const disabledAfter = await confirmBtn.getAttribute("disabled")
  assert.equal(disabledAfter, null, "Expected return-confirm-btn to be enabled once a comment is entered")
})

// ---------------------------------------------------------------------------
// Scenario: Decided items move to a separate table
// ---------------------------------------------------------------------------

Given("a denied price scenario", async () => {
  const fsId = await createSet()
  const id = await createPendingScenario(fsId)
  await fetch(`${API_URL}/price-scenarios/${id}/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "denied", comment: "Not aligned with quarter targets" }),
  })
})

When("I open the Approvals queue", async () => {
  const page = getPage()
  await page.goto(`${BASE_URL}/approvals`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("approval-tab-scenarios").click()
})

Then("it appears in the decided table and not in the pending queue", async () => {
  const page = getPage()
  await page.getByTestId("decided-table-row").first().waitFor({ state: "attached" })
  const pendingCount = await page.getByTestId("approval-row").count()
  assert.equal(pendingCount, 0, "Expected no pending rows once the scenario is denied")
  const decidedCount = await page.getByTestId("decided-table-row").count()
  assert.equal(decidedCount, 1, `Expected 1 decided row, got ${decidedCount}`)
})

// ---------------------------------------------------------------------------
// Scenario: Viewing a pending discount model opens its review drawer
// ---------------------------------------------------------------------------
// Reuses the "a pending discount model in the approvals queue" Given above.

When("I view it in the approvals queue", async () => {
  const page = getPage()
  await page.getByTestId("approval-row").first().click()
  await page.getByTestId("discount-review-drawer").waitFor({ state: "attached" })
})

Then("the drawer shows a risk banner with hard and advisory counts", async () => {
  const page = getPage()
  await page.getByTestId("risk-banner-hard-count").waitFor({ state: "attached" })
  await page.getByTestId("risk-banner-advisory-count").waitFor({ state: "attached" })
})
