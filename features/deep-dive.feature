Feature: Deep Dive

  Scenario: Explain a recommended price
    Given the Price Adjustments grid in Deep Dive
    When I select "Explain" on a row
    Then a modal shows the rationale, driving objectives, decision ladder, and contextual factors

  Scenario: Progressive unlock by optimization level
    Given the optimization slider at 20%
    When I raise it to 60%
    Then additional price adjustments and marketing/discount tiles become visible
