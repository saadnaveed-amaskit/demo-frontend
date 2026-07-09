import { Before, Given, When, Then } from "@cucumber/cucumber"
import { strict as assert } from "node:assert"
import { getPage } from "../support/browser"

const BASE_URL = process.env.BDD_BASE_URL ?? "http://localhost:5173"
const API_URL = process.env.BDD_API_URL ?? "http://localhost:3000"

async function clearDiscountModels() {
  const res = await fetch(`${API_URL}/discount-models`)
  if (!res.ok) return
  const models = (await res.json()) as { id: number }[]
  await Promise.all(
    models.map((m) => fetch(`${API_URL}/discount-models/${m.id}`, { method: "DELETE" })),
  )
}

async function clearFocusSets() {
  const res = await fetch(`${API_URL}/focus-sets`)
  if (!res.ok) return
  const sets = (await res.json()) as { id: string }[]
  await Promise.all(sets.map((s) => fetch(`${API_URL}/focus-sets/${s.id}`, { method: "DELETE" })))
}

async function createGymboreeSet(): Promise<string> {
  const res = await fetch(`${API_URL}/focus-sets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Gymboree All",
      filter: {
        type: "group",
        logic: "AND",
        rules: [{ type: "rule", attr: "brand", val: "Gymboree" }],
      },
    }),
  })
  const fs = (await res.json()) as { id: string }
  return fs.id
}

async function createApprovedModel(focusGroupId: string): Promise<number> {
  // Create model
  const createRes = await fetch(`${API_URL}/discount-models`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "BDD Approved Model",
      focusGroupId,
      startDate: "2026-08-01",
      endDate: "2026-08-14",
      discountFormat: "percentage",
      discountDepth: 20,
      channel: "digital",
    }),
  })
  const model = (await createRes.json()) as { id: number }

  // Run model → status: draft
  await fetch(`${API_URL}/discount-models/${model.id}/run`, { method: "POST" })

  // Submit → pending
  await fetch(`${API_URL}/discount-models/${model.id}/submit`, { method: "POST" })

  // Force to approved via PATCH (bypass approvals workflow for BDD)
  await fetch(`${API_URL}/discount-models/${model.id}/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "approved" }),
  })

  return model.id
}

// cross-step state for Scenario 1
let scenarioFsId = ""

Before(async () => {
  await clearDiscountModels()
  await clearFocusSets()
  scenarioFsId = ""
})

// ---------------------------------------------------------------------------
// Scenario: Run Model gated on required fields
// ---------------------------------------------------------------------------

Given("a new discount model with no dates set", async () => {
  const page = getPage()
  // Create focus set BEFORE navigating so the form loads with it available
  scenarioFsId = await createGymboreeSet()
  await page.goto(`${BASE_URL}/discount-modeling`, { waitUntil: "domcontentloaded" })
  await page.getByRole("button", { name: /New Model/i }).click()
  await page.getByTestId("run-model-btn").waitFor({ state: "attached" })
})

Then('"Run Model" is disabled', async () => {
  const btn = getPage().getByTestId("run-model-btn")
  await btn.waitFor({ state: "attached" })
  const disabled = await btn.getAttribute("disabled")
  assert.notEqual(disabled, null, "Expected Run Model button to be disabled")
})

When("I set name, focus group, both dates, and a valid depth", async () => {
  const page = getPage()
  // Wait for the option to appear in the select (form loads focus sets async)
  await page.waitForSelector(
    `select[data-testid="focus-group-select"] option[value="${scenarioFsId}"]`,
    { state: "attached", timeout: 10000 },
  )
  await page.getByLabel("Model name").fill("Summer Markdown")
  await page.getByTestId("focus-group-select").selectOption(scenarioFsId)
  await page.getByLabel("Start date").fill("2026-08-01")
  await page.getByLabel("End date").fill("2026-08-14")
  await page.getByLabel("Discount depth").fill("20")
})

Then('"Run Model" becomes enabled', async () => {
  const btn = getPage().getByTestId("run-model-btn")
  await btn.waitFor({ state: "attached" })
  const disabled = await btn.getAttribute("disabled")
  assert.equal(disabled, null, "Expected Run Model button to be enabled")
})

// ---------------------------------------------------------------------------
// Scenario: Open an existing model's output directly
// ---------------------------------------------------------------------------

Given("an approved discount model in the list", async () => {
  const page = getPage()
  const fsId = await createGymboreeSet()
  await createApprovedModel(fsId)

  await page.goto(`${BASE_URL}/discount-modeling`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("model-list-row").first().waitFor({ state: "attached" })
})

When("I click its row", async () => {
  await getPage().getByTestId("model-list-row").first().click()
})

Then("its Output view opens without the create form or Run step", async () => {
  const page = getPage()
  await page.getByTestId("model-output").waitFor({ state: "attached" })
  // "Run Model" button must NOT be present
  const runBtn = page.getByTestId("run-model-btn")
  const count = await runBtn.count()
  assert.equal(count, 0, "Expected no Run Model button in Output view")
})

// ---------------------------------------------------------------------------
// Scenario: Discard a model regardless of status
// ---------------------------------------------------------------------------

Given("an approved discount model opened via its row", async () => {
  const page = getPage()
  const fsId = await createGymboreeSet()
  await createApprovedModel(fsId)

  await page.goto(`${BASE_URL}/discount-modeling`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("model-list-row").first().waitFor({ state: "attached" })
  await page.getByTestId("model-list-row").first().click()
  await page.getByTestId("model-output").waitFor({ state: "attached" })
})

When("I discard it and confirm", async () => {
  const page = getPage()
  await page.getByRole("button", { name: /Discard/i }).click()
  await page.getByTestId("discard-confirm").waitFor({ state: "attached" })
  await page.getByTestId("discard-confirm").click()
})

Then("it is permanently removed from the list", async () => {
  const page = getPage()
  // Should navigate back to list (output closed)
  await page.getByTestId("model-output").waitFor({ state: "detached" })
  const rows = page.getByTestId("model-list-row")
  const count = await rows.count()
  assert.equal(count, 0, `Expected empty list, got ${count} rows`)
})
