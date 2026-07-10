import { Given, When, Then } from "@cucumber/cucumber"
import { strict as assert } from "node:assert"
import { getPage } from "../support/browser"

const BASE_URL = process.env.BDD_BASE_URL ?? "http://localhost:5173"
const API_URL = process.env.BDD_API_URL ?? "http://localhost:3000"

interface ActionClassEntity {
  id: number
  atReversibilityCeiling: boolean
}

// ---------------------------------------------------------------------------
// Scenario: Block promotion below the reversibility ceiling
//
// Anticipated backend surface (not yet implemented — see
// knowledge/specs/001-platform-baseline/validation/SLICE-11-preparation.md):
// GET /autonomy/roster -> { actionClasses: ActionClassEntity[], ... }
// POST /autonomy/action-classes/:id/promote -> 400 with a blocked reason when
// atReversibilityCeiling is true.
// ---------------------------------------------------------------------------

Given("an action class at its reversibility ceiling", async () => {
  const page = getPage()
  const res = await fetch(`${API_URL}/autonomy/roster`)
  const roster = (await res.json()) as { actionClasses: ActionClassEntity[] }
  const actionClass = roster.actionClasses.find((a) => a.atReversibilityCeiling)
  if (!actionClass) throw new Error("Expected a seeded action class at its reversibility ceiling")
  await page.goto(`${BASE_URL}/autonomy`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("action-class-card").first().waitFor({ state: "attached" })
})

When("I attempt to promote it", async () => {
  const page = getPage()
  await page.getByTestId("action-class-card").first().click()
  await page.getByTestId("promote-btn").click()
})

Then("promotion is blocked with a clear reason", async () => {
  const page = getPage()
  const reason = await page.getByTestId("promote-blocked-reason").textContent()
  assert.ok(reason && reason.trim().length > 0, "Expected a non-empty blocked-promotion reason to be shown")
})

// ---------------------------------------------------------------------------
// Scenario: Kill switch disables controls
//
// Anticipated backend surface (not yet implemented):
// POST /autonomy/kill-switch/engage -> { killSwitchEngaged: true }
// ---------------------------------------------------------------------------

Given("in-flight autonomous actions", async () => {
  const page = getPage()
  await page.goto(`${BASE_URL}/autonomy`, { waitUntil: "domcontentloaded" })
  await page.getByTestId("live-action-row").first().waitFor({ state: "attached" })
})

When("I engage the emergency kill switch", async () => {
  await getPage().getByTestId("kill-switch-btn").click()
})

Then("all promote, veto, and undo controls are disabled and veto countdowns freeze", async () => {
  const page = getPage()
  const promoteDisabled = await page.getByTestId("promote-btn").first().getAttribute("disabled")
  assert.notEqual(promoteDisabled, null, "Expected promote button to be disabled while kill switch is engaged")
  const vetoDisabled = await page.getByTestId("veto-btn").first().getAttribute("disabled")
  assert.notEqual(vetoDisabled, null, "Expected veto button to be disabled while kill switch is engaged")
  const undoDisabled = await page.getByTestId("undo-btn").first().getAttribute("disabled")
  assert.notEqual(undoDisabled, null, "Expected undo button to be disabled while kill switch is engaged")
  const countdown = await page.getByTestId("veto-countdown").first().textContent()
  const countdownAfterWait = await (async () => {
    await page.waitForTimeout(1200)
    return page.getByTestId("veto-countdown").first().textContent()
  })()
  assert.equal(countdown, countdownAfterWait, "Expected veto countdown to freeze (not advance) while kill switch is engaged")
})
