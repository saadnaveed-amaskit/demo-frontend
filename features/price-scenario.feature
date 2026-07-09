Feature: Price Scenario Optimization

  Scenario: Objective sliders always sum to 100
    Given I am creating a new price scenario
    When I increase the Revenue weight to 60
    Then the other weights redistribute so the total remains 100

  Scenario: Move the scenario position along the frontier
    Given a price scenario with output at optimization level 30
    When I move the optimization slider to 70
    Then the risk band label shows "Aggressive"

  Scenario: Freeze edits once submitted
    Given a pending price scenario in the list
    When I view it
    Then the optimization slider and submit button are disabled

  Scenario: Resubmit a returned scenario
    Given a returned price scenario with a change request comment "Adjust revenue weight"
    When I view it
    Then I can see the reviewer comment and the Resubmit button is enabled
