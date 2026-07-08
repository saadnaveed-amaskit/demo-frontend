import { Before, After, setDefaultTimeout } from "@cucumber/cucumber"
import { chromium, Browser, Page } from "playwright"

setDefaultTimeout(30_000)

let browser: Browser
let page: Page

export function getPage(): Page {
  return page
}

Before(async () => {
  browser = await chromium.launch()
  page = await browser.newPage()
})

After(async () => {
  await browser?.close()
})
