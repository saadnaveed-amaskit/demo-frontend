Feature: Guardrails Management
  As a Pricing Strategist
  I want to manage pricing guardrails
  So that price scenarios comply with brand and division constraints

  Scenario: Inline-edit a guardrail threshold
    Given the Guardrails table
    When I change a guardrail's value inline
    Then the new value is persisted

  Scenario: Non-overridable guardrails are enforced
    Given an active non-overridable guardrail
    When a Pricing Team member creates a scenario
    Then that guardrail is enforced as a hard constraint and is not editable
