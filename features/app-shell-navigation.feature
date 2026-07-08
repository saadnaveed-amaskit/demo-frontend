Feature: Application shell and navigation
  As a Retail Nucleus user
  I want a sidebar that groups screens by persona and a global brand/channel filter
  So that I can navigate the platform and scope what I see

  Scenario: Sidebar shows persona-grouped navigation
    Given I open the application
    Then I see the "Pricing Team" navigation section
    And I see the "Pricing Strategist" navigation section
    And I see the "Admin" navigation section
    And I see a navigation link to "Focus Builder"
    And I see a navigation link to "Guardrails"

  Scenario: Navigating to a screen resolves its route
    Given I open the application
    When I click the "Guardrails" navigation link
    Then the page heading is "Guardrails"
    And the URL path is "/guardrails"

  Scenario: Global brand and channel filters are present and URL-synced
    Given I open the application
    Then I see the global "Brand" filter
    And I see the global "Channel" filter
    When I set the "Brand" filter to "TCP"
    Then the URL query contains "brand=tcp"
