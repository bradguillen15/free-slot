## REMOVED Requirements

### Requirement: Peak-hour free stat card in week view
**Reason**: Peak hours is a concept being removed from the app; the stat has no meaning once peak configuration is gone.
**Migration**: The "Peak-hour free" StatCard is removed from the week header stat row.

### Requirement: Free / peak legend chip in week view
**Reason**: Peak hours concept removed; Free/peak shading in the week grid is also removed.
**Migration**: The chip is deleted from the week-view legend row. If free-window shading is still shown (without peak distinction), the legend chip that referenced "peak" is removed.

### Requirement: Peak hours configuration in Settings
**Reason**: Peak hours concept removed from the product.
**Migration**: The peakStart/peakEnd fields are removed from the Settings form. Existing stored peak_hours data in the profile is ignored but not deleted.

### Requirement: Peak hours step in Onboarding
**Reason**: Peak hours concept removed from the product.
**Migration**: The peak hours form row is removed from the onboarding preferences step. New users no longer configure this.

### Requirement: Productive/Unproductive KPI cards in Dashboard
**Reason**: The app no longer frames time as productive vs unproductive.
**Migration**: The "Productive" duration card and "Productive ratio %" card are removed. The daily bar chart switches from a stacked productive+unproductive layout to a single total-logged bar.
