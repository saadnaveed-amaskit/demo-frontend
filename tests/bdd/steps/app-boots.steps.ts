import { Given, Then, Before, After, setDefaultTimeout } from "@cucumber/cucumber"
import { chromium, Browser, Page } from "playwright"
import { strict as assert } from "node:assert"

setDefaultTimeout(30_000)

const BASE_URL = process.env.BDD_BASE_URL ?? "http://localhost:5173"

let browser: Browser
let page: Page

Before(async () => {
  browser = await chromium.launch()
  page = await browser.newPage()
})

After(async () => {
  await browser?.close()
})

Given("I open the application", async () => {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" })
})

Then("I see the {string} brand heading", async (text: string) => {
  const heading = page.getByRole("heading", { name: text })
  await heading.waitFor({ state: "visible", timeout: 10_000 })
  assert.ok(await heading.isVisible(), `Expected heading "${text}" to be visible`)
})
