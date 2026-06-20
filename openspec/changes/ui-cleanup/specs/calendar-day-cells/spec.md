## MODIFIED Requirements

### Requirement: Day summary panel
The day summary panel SHALL display: total logged time, and a breakdown by category (name + duration). It SHALL NOT display productive/unproductive split durations, nor a productive-ratio progress bar.

#### Scenario: Summary shows total and category breakdown only
- **WHEN** a user has logged time on a day
- **THEN** the panel shows "Logged: Xh Ym" and lists categories with their durations
- **THEN** no "Productive" or "Unproductive" labels appear
- **THEN** no ratio bar or percentage is shown

#### Scenario: Empty day
- **WHEN** no time has been logged for the day
- **THEN** the panel shows an empty/zero state without any productivity framing

## REMOVED Requirements

### Requirement: Timeline legend row
**Reason**: The Planned/Logged colour legend is redundant — the visual difference between schedule blocks (faint border-left) and log bars (solid fill) is self-evident from the calendar UI itself.
**Migration**: No migration needed; users lose no functionality.

### Requirement: Productive/Unproductive stat cards in day summary
**Reason**: The app is a neutral organiser, not a productivity scorer; the productive/unproductive split adds judgement that the product no longer endorses.
**Migration**: Users see total logged time and category breakdown instead.

### Requirement: Productive ratio bar in day summary
**Reason**: Same as productive/unproductive removal above.
**Migration**: Section is removed; no replacement needed.
