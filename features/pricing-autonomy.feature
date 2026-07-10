Feature: Pricing Autonomy
  As a Pricing Strategist
  I want to govern which action classes may act autonomously and retain an emergency kill switch
  So that autonomous pricing actions stay within approved trust and reversibility bounds

  Scenario: Block promotion below the reversibility ceiling
    Given an action class at its reversibility ceiling
    When I attempt to promote it
    Then promotion is blocked with a clear reason

  Scenario: Kill switch disables controls
    Given in-flight autonomous actions
    When I engage the emergency kill switch
    Then all promote, veto, and undo controls are disabled and veto countdowns freeze
