import { When, Then } from "@cucumber/cucumber"
import { strict as assert } from "node:assert"
import { getPage } from "../support/browser"

Then("I see the {string} navigation section", async (name: string) => {
  await getPage().getByRole("heading", { name, level: 2 }).waitFor({ state: "visible" })
})

Then("I see a navigation link to {string}", async (name: string) => {
  await getPage().getByRole("link", { name }).waitFor({ state: "visible" })
})

When("I click the {string} navigation link", async (name: string) => {
  await getPage().getByRole("link", { name }).click()
})

Then("the page heading is {string}", async (name: string) => {
  await getPage().getByRole("heading", { name, level: 1 }).waitFor({ state: "visible" })
})

Then("the URL path is {string}", async (path: string) => {
  const page = getPage()
  await page.waitForURL((url) => url.pathname === path, { timeout: 10_000 })
  assert.equal(new URL(page.url()).pathname, path)
})

Then("I see the global {string} filter", async (label: string) => {
  await getPage().getByRole("combobox", { name: label }).waitFor({ state: "visible" })
})

When("I set the {string} filter to {string}", async (label: string, value: string) => {
  const page = getPage()
  await page.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { name: value }).click()
})

Then("the URL query contains {string}", async (fragment: string) => {
  const page = getPage()
  const [key, val] = fragment.split("=")
  await page.waitForURL((url) => url.searchParams.get(key) === val, { timeout: 10_000 })
  assert.equal(new URL(page.url()).searchParams.get(key), val)
})
