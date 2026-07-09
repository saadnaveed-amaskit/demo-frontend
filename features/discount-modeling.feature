Feature: Discount Modeling
  As a Pricing Team member
  I want to create and run discount models against Focus Sets
  So that I can simulate markdown impact before submitting for approval

  Scenario: Run Model gated on required fields
    Given a new discount model with no dates set
    Then "Run Model" is disabled
    When I set name, focus group, both dates, and a valid depth
    Then "Run Model" becomes enabled

  Scenario: Open an existing model's output directly
    Given an approved discount model in the list
    When I click its row
    Then its Output view opens without the create form or Run step

  Scenario: Discard a model regardless of status
    Given an approved discount model opened via its row
    When I discard it and confirm
    Then it is permanently removed from the list
