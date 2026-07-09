import { Before, Given, When, Then } from "@cucumber/cucumber"
import { strict as assert } from "node:assert"
import { getPage } from "../support/browser"

const BASE_URL = process.env.BDD_BASE_URL ?? "http://localhost:5173"
const API_URL = process.env.BDD_API_URL ?? "http://localhost:3000"

// Today + 30 days for scheduled, today - 30 days for expired
const today = new Date()
const fmt = (d: Date) => d.toISOString().slice(0, 10)
const daysAgo = (n: number) => fmt(new Date(today.getTime() - n * 86400000))
const daysAhead = (n: number) => fmt(new Date(today.getTime() + n * 86400000))

async function clearPromotions() {
  const res = await fetch(`${API_URL}/promotions`)
  if (!res.ok) return
  const promos = (await res.json()) as { id: number }[]
  await Promise.all(promos.map((p) => fetch(`${API_URL}/promotions/${p.id}`, { method: "DELETE" })))
}

async function clearFocusSets() {
  const res = await fetch(`${API_URL}/focus-sets`)
  if (!res.ok) return
  const sets = (await res.json()) as { id: string }[]
  await Promise.all(sets.map((s) => fetch(`${API_URL}/focus-sets/${s.id}`, { method: "DELETE" })))
}

Before(async () => {
  await clearPromotions()
  await clearFocusSets()
})

// ---------------------------------------------------------------------------
// Scenario: Prevent an end date before the start date
// ---------------------------------------------------------------------------

Given("I am creating a promotion", async () => {
  await getPage().goto(`${BASE_URL}/promos`, { waitUntil: "domcontentloaded" })
  await getPage().getByRole("button", { name: /New Promotion/i }).click()
  await getPage().getByLabel("Promotion name").waitFor({ state: "attached" })
})

When("I set an end date earlier than the start date", async () => {
  const page = getPage()
  await page.getByLabel("Promotion name").fill("Test Promo")
  await page.getByLabel("Start date").fill(daysAhead(10))
  await page.getByLabel("End date").fill(daysAhead(5))
  await page.getByRole("button", { name: /^Save promotion/i }).click()
})

Then(
  "the system rejects it and requires an end date strictly after the start",
  async () => {
    // Error message for end date validation should appear
    await getPage()
      .getByText(/end date must be after start/i)
      .waitFor({ state: "attached" })
  },
)

// ---------------------------------------------------------------------------
// Scenario: Filter promotions by status with counts
// ---------------------------------------------------------------------------

Given("promotions in various date ranges", async () => {
  // Seed: 1 active, 1 scheduled, 1 expired
  await Promise.all([
    fetch(`${API_URL}/promotions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Active Promo",
        startDate: daysAgo(5),
        endDate: daysAhead(10),
        discountType: "percentage",
        discountValue: 20,
        focusSetId: "",
        channel: "US",
        color: "#0d9488",
        notes: "",
      }),
    }),
    fetch(`${API_URL}/promotions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Scheduled Promo",
        startDate: daysAhead(5),
        endDate: daysAhead(15),
        discountType: "percentage",
        discountValue: 10,
        focusSetId: "",
        channel: "US",
        color: "#7c3aed",
        notes: "",
      }),
    }),
    fetch(`${API_URL}/promotions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Expired Promo",
        startDate: daysAgo(20),
        endDate: daysAgo(5),
        discountType: "flat",
        discountValue: 5,
        focusSetId: "",
        channel: "CA",
        color: "#dc2626",
        notes: "",
      }),
    }),
  ])

  await getPage().goto(`${BASE_URL}/promos`, { waitUntil: "domcontentloaded" })
  await getPage().getByTestId("promo-item").first().waitFor({ state: "attached" })
})

When('I select the "Active" tab', async () => {
  await getPage().getByRole("button", { name: /^Active \(\d+\)/i }).click()
})

Then(
  "only currently-active promotions are shown and each tab shows a live count",
  async () => {
    const page = getPage()
    // All visible promo items should be active
    const items = page.getByTestId("promo-item")
    await items.first().waitFor({ state: "attached" })
    const all = await items.all()
    for (const item of all) {
      const badge = item.getByTestId("promo-status-badge")
      await badge.waitFor({ state: "attached" })
      const text = ((await badge.textContent()) ?? "").toLowerCase()
      assert.equal(text.trim(), "active", `Expected active status badge, got "${text}"`)
    }
    // Each tab must show a count (e.g. "All (3)")
    await page.getByRole("button", { name: /^All \(\d+\)/i }).waitFor({ state: "attached" })
    await page.getByRole("button", { name: /^Scheduled \(\d+\)/i }).waitFor({ state: "attached" })
    await page.getByRole("button", { name: /^Expired \(\d+\)/i }).waitFor({ state: "attached" })
  },
)

// ---------------------------------------------------------------------------
// Scenario: View per-SKU promo price
// ---------------------------------------------------------------------------

Given("a promotion linked to a Focus Set", async () => {
  // Create a Gymboree focus set
  const fsRes = await fetch(`${API_URL}/focus-sets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Gymboree Set",
      filter: {
        type: "group",
        logic: "AND",
        rules: [{ type: "rule", attr: "brand", val: "Gymboree" }],
      },
    }),
  })
  const fs = (await fsRes.json()) as { id: string }

  // Create a promotion linked to it
  await fetch(`${API_URL}/promotions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Gymboree Promo",
      startDate: daysAgo(3),
      endDate: daysAhead(10),
      discountType: "percentage",
      discountValue: 20,
      focusSetId: fs.id,
      channel: "US",
      color: "#0d9488",
      notes: "",
    }),
  })

  await getPage().goto(`${BASE_URL}/promos`, { waitUntil: "domcontentloaded" })
  await getPage().getByTestId("promo-item").first().waitFor({ state: "attached" })
  // Click the promotion to open the detail drawer
  await getPage().getByTestId("promo-item").first().click()
  await getPage().getByTestId("promo-drawer").waitFor({ state: "attached" })
})

When('I select "View Products"', async () => {
  await getPage().getByRole("button", { name: /View Products/i }).click()
})

Then("I see up to 20 SKUs each with a computed promo price", async () => {
  const page = getPage()
  await page.getByTestId("promo-product-row").first().waitFor({ state: "attached" })
  const rows = await page.getByTestId("promo-product-row").all()
  assert.ok(rows.length > 0, "Expected at least 1 SKU row")
  assert.ok(rows.length <= 20, `Expected at most 20 SKU rows, got ${rows.length}`)
  // Each row must have a promo price cell starting with $
  for (const row of rows.slice(0, Math.min(rows.length, 3))) {
    const cell = row.getByTestId("promo-price")
    await cell.waitFor({ state: "attached" })
    const text = (await cell.textContent()) ?? ""
    assert.ok(text.startsWith("$"), `Expected promo price to start with $, got "${text}"`)
  }
})
