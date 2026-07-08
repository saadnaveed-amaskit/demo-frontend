Feature: Focus Set management
  As a Pricing Team member
  I want to build, browse, and export reusable Focus Sets
  So that downstream pricing tools can target a consistent product scope

  Scenario: Create a Focus Set with a live preview
    Given I open the Focus Builder
    When I start a new Focus Set named "Girls Scope"
    And I add a rule "Division" equals "GIRLS"
    Then the preview shows a positive match count
    And the preview lists at least one SKU

  Scenario: Warn when a filter matches nothing
    Given I open the Focus Builder
    When I start a new Focus Set named "Empty Scope"
    And I add a rule "Brand" equals "TCP"
    And I add another rule "Division" equals "GIRLS"
    Then the preview shows a no-matches warning

  Scenario: Search the Focus Set library
    Given a saved Focus Set named "Alpha Set" for brand "TCP"
    And a saved Focus Set named "Beta Set" for brand "Gymboree"
    When I open the Focus Builder
    And I search focus sets for "Beta"
    Then I see the Focus Set "Beta Set"
    And I do not see the Focus Set "Alpha Set"

  Scenario: Export a Focus Set to CSV
    Given a saved Focus Set named "Export Me" for brand "Gymboree"
    When I open the Focus Builder
    And I export the Focus Set "Export Me"
    Then a CSV download of matched SKUs is produced
