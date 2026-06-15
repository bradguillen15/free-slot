## ADDED Requirements

### Requirement: Shared navigation control renders Today, prev, next in order

The calendar navigation control SHALL render exactly three controls in the order **Today**,
**previous (‹)**, **next (›)**, used identically by the Day, Week, and Month views, with the
visible label "Today" (no "This week" / "This month" variants).

#### Scenario: Nav order and labels are consistent across views

- **WHEN** the Day, Week, or Month view renders its navigation
- **THEN** a "Today" control appears first, then a previous (‹) control, then a next (›) control
- **AND** the today control reads "Today" in every view

#### Scenario: Nav controls fire the correct handlers

- **WHEN** the user activates Today, previous, or next
- **THEN** the view's `onToday`, `onPrev`, or `onNext` handler runs respectively
- **AND** each control exposes an accessible name (`aria-label`) and a stable test-id
  (`calendar-today`, `calendar-prev`, `calendar-next`)

### Requirement: Shared create affordance offers Log time and Add block

The calendar create affordance SHALL present a "Log time" action and an "Add block" action from a
single control, reused by Day and Week, so their create UX is identical.

#### Scenario: Create menu items fire their handlers

- **WHEN** the user opens the create affordance and chooses "Log time" or "Add block"
- **THEN** the corresponding `onLogTime` or `onAddBlock` handler runs
- **AND** the control exposes a per-view test-id (`day-fab`, `week-fab`) without breaking the
  existing Day selectors (`day-fab`, `day-log-time`)

#### Scenario: Week gains the same create UX as Day

- **WHEN** the Week view renders
- **THEN** it exposes a create affordance with both "Log time" and "Add block" items
- **AND** the items behave the same as on the Day view
