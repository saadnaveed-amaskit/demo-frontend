Feature: Measurement
  As a Pricing Strategist
  I want to set up a matched-cluster experiment and monitor its live readout
  So that I can validate a pricing action's causal impact before scaling it

  Scenario: Go Live gated on balance and cost acknowledgment
    Given an experiment with at least one imbalanced block
    Then "Go Live" is disabled with an explanatory tooltip
    When all blocks are balanced and I acknowledge the cost of control
    Then "Go Live" becomes enabled

  Scenario: Moving a cluster to control drops its ML price
    Given a treatment cluster with an ML price recommendation
    When I move it to control
    Then its ML recommendation is removed and it runs BAU pricing

  Scenario: Verdict banner on crossing a boundary
    Given a live experiment whose win-probability crosses the win boundary
    Then the verdict banner shows "win" with an action to scale to all matching SKUs
