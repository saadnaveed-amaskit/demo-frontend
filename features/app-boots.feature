Feature: Application boots
  As a Retail Nucleus user
  I want the application shell to load
  So that I can access the platform

  Scenario: The app shell renders its brand heading
    Given I open the application
    Then I see the "Retail Nucleus" brand heading
