Feature: Promotions Calendar
  As a Pricing Team member
  I want to manage pricing promotions
  So that I can coordinate time-boxed discounts across channels and SKU sets

  Scenario: Prevent an end date before the start date
    Given I am creating a promotion
    When I set an end date earlier than the start date
    Then the system rejects it and requires an end date strictly after the start

  Scenario: Filter promotions by status with counts
    Given promotions in various date ranges
    When I select the "Active" tab
    Then only currently-active promotions are shown and each tab shows a live count

  Scenario: View per-SKU promo price
    Given a promotion linked to a Focus Set
    When I select "View Products"
    Then I see up to 20 SKUs each with a computed promo price
