Feature: Agent Roster
  As a Pricing Strategist
  I want to see and manage the standing monitors, operators, and task agents on my team
  So that I can keep the right signals running and provision new agents as needed

  Scenario: Pause and resume a monitor
    Given a running monitor card
    When I pause it and then resume it
    Then its state and signals-today counter update accordingly

  Scenario: Hire a standing agent
    Given the agent roster
    When I hire a "Price Drift Monitor" from the catalog
    Then it appears in the Monitors section
