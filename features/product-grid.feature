Feature: Product Grid
  As a Pricing Team member
  I want to browse and curate the SKUs within a Focus Set
  So that downstream pricing work targets the right product scope

  Scenario: Soft-delete and restore a SKU
    Given a Focus Set open in the Product Grid at SKU level
    When I remove a SKU and then restore it from the Deleted Items pane
    Then the SKU returns to the active grid and the row count updates

  Scenario: Toggle product and SKU views
    Given a Focus Set open in the Product Grid
    When I toggle from product-level to SKU-level
    Then the grid expands and shows a live SKU row count
