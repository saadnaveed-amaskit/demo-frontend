import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { App } from "@/App"

describe("App shell", () => {
  it("renders the Retail Nucleus brand heading", () => {
    render(<App />)
    expect(
      screen.getByRole("heading", { name: "Retail Nucleus" }),
    ).toBeInTheDocument()
  })

  it("renders persona-grouped navigation sections", () => {
    render(<App />)
    expect(
      screen.getByRole("heading", { name: "Pricing Team", level: 2 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Pricing Strategist", level: 2 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Guardrails" }),
    ).toBeInTheDocument()
  })
})
