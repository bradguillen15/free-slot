# planner-zero-target-guard Specification

## Purpose
The AI weekly planner receives each activity's real weekly hour target (not a placeholder) and refuses to run when there is nothing meaningful to schedule, guiding the user to fix it instead of returning a confusing empty result.

## Requirements

### Requirement: Real activity targets reach the planner
The client SHALL send each active activity's actual `target_hours_per_week` value in the `generate-weekly-plan` request body. The client SHALL NOT substitute a hardcoded or placeholder value.

#### Scenario: Configured target is transmitted
- **WHEN** a user has an active activity "Exercise" with `target_hours_per_week: 3` configured on the Activities page
- **AND** the user requests an AI weekly plan
- **THEN** the request body's `activities` array includes an entry for "Exercise" with `target_hours_per_week: 3`

### Requirement: Plan generation is blocked when all active activities have a zero target
The client SHALL NOT invoke `generate-weekly-plan` when every active activity has a `target_hours_per_week` of `0` or less. Instead it SHALL show a localized explanation and a direct action to set targets on the Activities page.

#### Scenario: All-zero targets block generation
- **WHEN** a user has one or more active activities and every one has `target_hours_per_week <= 0`
- **AND** the user clicks "Generate plan"
- **THEN** no request is sent to `generate-weekly-plan`
- **THEN** a localized message is shown explaining that at least one activity needs a weekly target
- **THEN** the message includes an action that navigates to `/app/activities`

#### Scenario: At least one positive target allows generation
- **WHEN** a user has active activities where at least one has `target_hours_per_week > 0`
- **AND** the user clicks "Generate plan"
- **THEN** the request is sent to `generate-weekly-plan` as normal, including any activities that individually have a `0` target

#### Scenario: Guard message matches UI locale
- **WHEN** the all-zero-target guard is triggered
- **THEN** the message and action label are rendered in the user's current UI language (English or Spanish)
