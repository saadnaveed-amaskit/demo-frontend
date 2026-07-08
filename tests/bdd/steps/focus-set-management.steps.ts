import { Before, Given, When, Then } from "@cucumber/cucumber"
import { strict as assert } from "node:assert"
import { getPage } from "../support/browser"

const BASE_URL = process.env.BDD_BASE_URL ?? "http://localhost:5173"
const API_URL = process.env.BDD_API_URL ?? "http://localhost:3000"

Before(async () => {
  const res = await fetch(`${API_URL}/focus-sets`)
  if (!res.ok) return
  const sets = (await res.json()) as { id: string }[]
  await Promise.all(
    sets.map((s) => fetch(`${API_URL}/focus-sets/${s.id}`, { method: "DELETE" })),
  )
})

async function seedFocusSet(name: string, brand: string): Promise<void> {
  const res = await fetch(`${API_URL}/focus-sets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      filter: { type: "group", logic: "AND", rules: [{ type: "rule", attr: "brand", val: brand }] },
    }),
  })
  if (!res.ok) throw new Error(`seed failed: ${res.status}`)
}

Given("a saved Focus Set named {string} for brand {string}", async (name: string, brand: string) => {
  await seedFocusSet(name, brand)
})

Given("I open the Focus Builder", async () => {
  await getPage().goto(`${BASE_URL}/focus`, { waitUntil: "domcontentloaded" })
})

When("I start a new Focus Set named {string}", async (name: string) => {
  const page = getPage()
  await page.getByRole("button", { name: "New Focus Set" }).click()
  await page.getByLabel("Focus set name").fill(name)
})

async function setRule(index: number, attr: string, val: string): Promise<void> {
  const page = getPage()
  const row = page.getByTestId(`rule-${index}`)
  await row.getByRole("combobox", { name: "Attribute" }).click()
  await page.getByRole("option", { name: attr, exact: true }).click()
  await row.getByRole("combobox", { name: "Value" }).click()
  await page.getByRole("option", { name: val, exact: true }).click()
}

When("I add a rule {string} equals {string}", async (attr: string, val: string) => {
  await setRule(0, attr, val)
})

When("I add another rule {string} equals {string}", async (attr: string, val: string) => {
  await getPage().getByRole("button", { name: "Add rule" }).click()
  await setRule(1, attr, val)
})

Then("the preview shows a positive match count", async () => {
  const page = getPage()
  const count = page.getByTestId("preview-count")
  await count.waitFor({ state: "visible" })
  const text = (await count.textContent()) ?? ""
  const n = Number(text.replace(/\D/g, ""))
  assert.ok(n > 0, `expected positive match count, got "${text}"`)
})

Then("the preview lists at least one SKU", async () => {
  const rows = getPage().getByTestId("preview-sku")
  await rows.first().waitFor({ state: "visible" })
  assert.ok((await rows.count()) >= 1)
})

Then("the preview shows a no-matches warning", async () => {
  await getPage().getByRole("alert", { name: /no matches/i }).waitFor({ state: "visible" })
})

When("I search focus sets for {string}", async (term: string) => {
  await getPage().getByLabel("Search focus sets").fill(term)
})

Then("I see the Focus Set {string}", async (name: string) => {
  await getPage().getByRole("heading", { name, level: 3 }).waitFor({ state: "visible" })
})

Then("I do not see the Focus Set {string}", async (name: string) => {
  await getPage().waitForTimeout(300)
  assert.equal(await getPage().getByRole("heading", { name, level: 3 }).count(), 0)
})

When("I export the Focus Set {string}", async (name: string) => {
  const page = getPage()
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: `Export ${name}` }).click(),
  ])
  ;(globalThis as Record<string, unknown>).__lastDownload = await download.path()
})

Then("a CSV download of matched SKUs is produced", async () => {
  const path = (globalThis as Record<string, unknown>).__lastDownload
  assert.ok(path, "expected a CSV download to have occurred")
})
