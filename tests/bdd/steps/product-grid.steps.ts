import { Before, Given, When, Then } from "@cucumber/cucumber"
import { strict as assert } from "node:assert"
import { getPage } from "../support/browser"

const BASE_URL = process.env.BDD_BASE_URL ?? "http://localhost:5173"
const API_URL = process.env.BDD_API_URL ?? "http://localhost:3000"

/** Seed a Gymboree Focus Set and return its id. */
async function seedGymboreeSet(): Promise<string> {
  const res = await fetch(`${API_URL}/focus-sets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Grid BDD Set",
      filter: {
        type: "group",
        logic: "AND",
        rules: [{ type: "rule", attr: "brand", val: "Gymboree" }],
      },
    }),
  })
  if (!res.ok) throw new Error(`seed failed: ${res.status}`)
  const set = (await res.json()) as { id: string }
  return set.id
}

Before(async () => {
  // Clear all focus sets and product-grid exclusions before each scenario
  const res = await fetch(`${API_URL}/focus-sets`)
  if (!res.ok) return
  const sets = (await res.json()) as { id: string }[]
  await Promise.all(
    sets.map(async (s) => {
      await fetch(`${API_URL}/product-grid/${s.id}/exclusions`, { method: "DELETE" })
      await fetch(`${API_URL}/focus-sets/${s.id}`, { method: "DELETE" })
    }),
  )
})

Given("a Focus Set open in the Product Grid at SKU level", async () => {
  const id = await seedGymboreeSet()
  await getPage().goto(`${BASE_URL}/product-grid?focus=${id}`, {
    waitUntil: "domcontentloaded",
  })
  // Switch to SKU view
  await getPage().getByRole("button", { name: "SKU view" }).click()
  // Wait for SKU rows to appear (attached, not necessarily visible — inside aria-hidden container)
  await getPage().getByTestId("sku-row").first().waitFor({ state: "attached" })
})

Given("a Focus Set open in the Product Grid", async () => {
  const id = await seedGymboreeSet()
  await getPage().goto(`${BASE_URL}/product-grid?focus=${id}`, {
    waitUntil: "domcontentloaded",
  })
  // Wait for grid to load (product view is default)
  await getPage().getByTestId("product-row").first().waitFor({ state: "attached" })
})

When(
  "I remove a SKU and then restore it from the Deleted Items pane",
  async () => {
    const page = getPage()
    // Record initial count
    const countEl = page.getByTestId("active-sku-count")
    await countEl.waitFor({ state: "attached" })
    const initialText = (await countEl.textContent()) ?? ""
    const initialCount = Number(initialText.replace(/\D/g, ""))
    ;(globalThis as Record<string, unknown>).__initialSkuCount = initialCount

    // Click the first Remove button
    await page.getByRole("button", { name: /^Remove/i }).first().click()

    // Wait for Deleted Items pane to be visible
    await page
      .getByRole("region", { name: "Deleted Items" })
      .waitFor({ state: "visible" })

    // Click Restore in the deleted pane
    await page
      .getByRole("region", { name: "Deleted Items" })
      .getByRole("button", { name: /^Restore/i })
      .first()
      .click()
  },
)

Then("the SKU returns to the active grid and the row count updates", async () => {
  const page = getPage()
  const initialCount = (globalThis as Record<string, unknown>).__initialSkuCount as number
  // Deleted Items pane should disappear once all items restored
  await page
    .getByRole("region", { name: "Deleted Items" })
    .waitFor({ state: "detached" })
  // Count should be back to initial
  const countEl = page.getByTestId("active-sku-count")
  await countEl.waitFor({ state: "attached" })
  const finalText = (await countEl.textContent()) ?? ""
  const finalCount = Number(finalText.replace(/\D/g, ""))
  assert.equal(finalCount, initialCount, `expected count ${initialCount}, got ${finalCount}`)
})

When("I toggle from product-level to SKU-level", async () => {
  await getPage().getByRole("button", { name: "SKU view" }).click()
})

Then("the grid expands and shows a live SKU row count", async () => {
  const page = getPage()
  // Individual SKU rows should appear
  await page.getByTestId("sku-row").first().waitFor({ state: "attached" })
  // Count should be positive
  const countEl = page.getByTestId("active-sku-count")
  await countEl.waitFor({ state: "attached" })
  const text = (await countEl.textContent()) ?? ""
  const n = Number(text.replace(/\D/g, ""))
  assert.ok(n > 0, `expected positive SKU count, got "${text}"`)
})
