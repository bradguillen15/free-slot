## ADDED Requirements

### Requirement: Onboarding and settings use the resources layer

The system SHALL route onboarding/onboarding-gate profile reads/writes through `dataStore`
(`useProfile`/`updateProfile`) and the settings account deletion through
`resources.functions.deleteAccount`, so no `supabase` import remains in those files.

#### Scenario: Onboarding reads/writes profile via hooks

- **WHEN** onboarding or the onboarding gate reads or updates the profile (e.g. onboarding flag)
- **THEN** it uses `useProfile` / `updateProfile`
- **AND** no `supabase` import exists in `Onboarding.tsx` or `OnboardingGate.tsx`

#### Scenario: Account deletion goes through resources

- **WHEN** the user deletes their account from settings
- **THEN** a mutation invokes `resources.functions.deleteAccount`
- **AND** no `supabase` import exists in `SettingsPage.tsx`

### Requirement: Guest migration writes through the resources layer

The system SHALL perform the guest→cloud migration inserts/updates through `resources` batch helpers,
so `migrateGuest.ts` imports `@/resources` (allowed) and not the supabase client.

#### Scenario: Migration uses batch inserts

- **WHEN** a guest's data is migrated to cloud
- **THEN** activities, categories, schedule blocks, time logs, and priorities are written via
  `resources.<entity>.insertMany` (or equivalent)
- **AND** `migrateGuest.ts` does not import `@/integrations/supabase/client`
- **AND** the returned migration counts match the prior behavior
