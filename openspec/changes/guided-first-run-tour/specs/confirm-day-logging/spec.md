# confirm-day-logging Delta Specification

## ADDED Requirements

### Requirement: Confirming today only materializes elapsed blocks
When the confirmed date is today, a schedule block whose end time has not yet passed SHALL NOT produce a log; it is skipped with a distinct `not-elapsed` reason. Past dates are unaffected — all active blocks remain eligible. A block whose end time equals the current time SHALL count as elapsed.

#### Scenario: Future block is skipped today
- **WHEN** today's schedule has Work 09:00–17:00 and Sleep 23:00–07:00, and the user confirms at 20:00
- **THEN** a log is created for Work but not for Sleep
- **THEN** the result marks the Sleep block as skipped with reason `not-elapsed`

#### Scenario: Past date confirms everything
- **WHEN** the user confirms yesterday, which has the same two blocks
- **THEN** logs are created for both blocks regardless of the current time

#### Scenario: Nothing elapsed yet
- **WHEN** the user confirms today before any block has ended
- **THEN** no logs are created and the confirm affordance communicates that nothing has elapsed yet
