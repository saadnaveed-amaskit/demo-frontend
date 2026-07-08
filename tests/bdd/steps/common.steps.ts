import { Given } from "@cucumber/cucumber"
import { getPage } from "../support/browser"

const BASE_URL = process.env.BDD_BASE_URL ?? "http://localhost:5173"

Given("I open the application", async () => {
  await getPage().goto(BASE_URL, { waitUntil: "domcontentloaded" })
})
