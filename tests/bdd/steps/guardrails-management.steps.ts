import { Before, Given, When, Then } from "@cucumber/cucumber"
import { strict as assert } from "node:assert"
import { getPage } from "../support/browser"

const BASE_URL = process.env.BDD_BASE_URL ?? "http://localhost:5173"
const API_URL = process.env.BDD_API_URL ?? "http://localhost:3000"

Before(async () => {
  // Reset guardrails to seed state by deleting all then re-seeding via the API.
  // The backend re-seeds automatically when the store is empty (no explicit reset endpoint).
  // We clear any user-created guardrails added during tests by deleting ids > 4 (seed count).
  const res = await fetch(`${API_URL}/guardrails`)
  if (!res.ok) return
  const all = (await res.json()) as { id: number }[]
  await Promise.all(
    all
      .filter((g) => g.id > 4)
      .map((g) => fetch(`${API_URL}/guardrails/${g.id}`, { method: "DELETE" })),
  )
})

// ---------------------------------------------------------------------------
// Scenario: Inline-edit a guardrail threshold
// ---------------------------------------------------------------------------

Given("the Guardrails table", async () => {
  await getPage().goto(`${BASE_URL}/guardrails`, { waitUntil: "domcontentloaded" })
  await getPage().getByTestId("guardrails-table").waitFor({ state: "attached" })
})

When("I change a guardrail's value inline", async () => {
  const page = getPage()
  // Click edit button on the first guardrail row
  await page.getByRole("button", { name: /^Edit guardrail/i }).first().click()
  // Clear and type a new value
  const input = page.getByLabel("Guardrail value")
  await input.fill("99")
  // Store expected value for the Then step
  ;(globalThis as Record<string, unknown>).__newGuardrailValue = "99"
  // Save
  await page.getByRole("button", { name: /^Save guardrail/i }).click()
})

Then("the new value is persisted", async () => {
  const page = getPage()
  const expectedValue = (globalThis as Record<string, unknown>).__newGuardrailValue as string
  // Poll until the first value cell reflects the API response + re-render
  await page.waitForFunction(
    (val: string) => {
      const cell = document.querySelector('[data-testid="guardrail-value-cell"]')
      return (cell?.textContent ?? "").includes(val)
    },
    expectedValue,
    { timeout: 10000 },
  )
  const text = (await page.getByTestId("guardrail-value-cell").first().textContent()) ?? ""
  assert.ok(
    text.includes(expectedValue),
    `Expected cell to contain "${expectedValue}", got "${text}"`,
  )
})

// ---------------------------------------------------------------------------
// Scenario: Non-overridable guardrails are enforced
// ---------------------------------------------------------------------------

Given("an active non-overridable guardrail", async () => {
  await getPage().goto(`${BASE_URL}/guardrails`, { waitUntil: "domcontentloaded" })
  await getPage().getByTestId("guardrails-table").waitFor({ state: "attached" })
  // Seed data includes at least one active non-overridable guardrail (id=2, TCP BOYS Min Price)
  // Verify it exists in the table
  const hardConstraints = getPage().getByTestId("hard-constraint-badge")
  await hardConstraints.first().waitFor({ state: "attached" })
})

When("a Pricing Team member creates a scenario", async () => {
  // In SLICE-04 scope: "creates a scenario" maps to viewing the enforcement
  // preview on the guardrails screen (the constraints a Pricing Team member
  // would see when creating a scenario). The full scenario creation screen is SLICE-07.
  await getPage().getByRole("button", { name: /Enforcement preview/i }).click()
})

Then("that guardrail is enforced as a hard constraint and is not editable", async () => {
  const page = getPage()
  // The enforcement preview shows hard constraints as read-only, non-editable rows
  await page.getByTestId("enforcement-preview").waitFor({ state: "attached" })
  // At least one hard-constraint row must exist
  const rows = page.getByTestId("hard-constraint-row")
  await rows.first().waitFor({ state: "attached" })
  // Hard constraint rows must NOT have an edit button
  const editBtn = rows.first().getByRole("button", { name: /edit/i })
  const count = await editBtn.count()
  assert.equal(count, 0, "Hard constraint row must not have an edit button")
})
