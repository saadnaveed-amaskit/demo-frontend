import { Then } from "@cucumber/cucumber"
import { strict as assert } from "node:assert"
import { getPage } from "../support/browser"

Then("I see the {string} brand heading", async (text: string) => {
  const heading = getPage().getByRole("heading", { name: text })
  await heading.waitFor({ state: "visible", timeout: 10_000 })
  assert.ok(await heading.isVisible(), `Expected heading "${text}" to be visible`)
})
