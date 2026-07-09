Feature: Approvals Queue
  As a Pricing Strategist
  I want to review pending price scenarios and discount models
  So that I can approve, deny, or request changes with a consistent, auditable reason trail

  Scenario: Deny requires a reason
    Given a pending price scenario in the approvals queue
    When I attempt to deny it without a reason
    Then the deny action is blocked until a reason is entered

  Scenario: Returning a discount model for changes requires a comment
    Given a pending discount model in the approvals queue
    When I attempt to return it for changes without a comment
    Then the return action is blocked until a comment is entered

  Scenario: Decided items move to a separate table
    Given a denied price scenario
    When I open the Approvals queue
    Then it appears in the decided table and not in the pending queue

  Scenario: Viewing a pending discount model opens its review drawer
    Given a pending discount model in the approvals queue
    When I view it in the approvals queue
    Then the drawer shows a risk banner with hard and advisory counts
