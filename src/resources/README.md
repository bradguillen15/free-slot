# Resources Layer

Cloud-only data access boundary. `localStore` handles guest/offline reads; this layer handles cloud reads via the `ResourcesProvider` interface.

## Layer diagram

```
pages / components
       │
       ▼
  dataStore (hooks)        ← mode branch: guest → localStore | cloud → resources
       │
       ▼
 resources/index.ts        ← getResourcesProvider() singleton
       │
       ▼
 _providers/supabase/      ← createSupabaseProvider() — only place that imports supabase client
       │
       ▼
  supabase cloud DB
```

## Import rules

| From | May import | Must NOT import |
|------|-----------|-----------------|
| pages/components | `@/resources` types only (via `dataStore` hooks) | `_providers` internals |
| `dataStore` | `@/resources` (reads), `@/lib/localStore` (guest branch) | `@/integrations/supabase/client` directly |
| `resources/index.ts` | `_providers/types`, `_providers/supabase` | supabase client directly |
| `_providers/supabase/*` | `@/integrations/supabase/client` | localStore, hooks |

## Adding a new read entity

1. Define the DTO type in `types/<entity>.ts` (alias the `localStore` shape where it exists).
2. Add the read method(s) to `ResourcesProvider` in `_providers/types.ts`.
3. Implement in `_providers/supabase/client.ts` + mapper in `mappers.ts`.
4. Re-export the type from `index.ts`.
5. Add a guest branch + cloud branch in the relevant `dataStore` hook.
6. Tests: mapper unit test + provider contract test (mocked supabase) + hook routing test.

## Test injection

```ts
import { setResourcesProvider } from "@/resources";
import { createMockResourcesProvider } from "@/test/mockResourcesProvider";

beforeEach(() => {
  setResourcesProvider(createMockResourcesProvider({ categories: { list: vi.fn().mockResolvedValue([...]) } }));
});
```

The Supabase provider is the default singleton. Tests that mock supabase directly (via `vi.mock("@/integrations/supabase/client", ...)`) also work without injecting a mock provider, since the Supabase client inside the provider is replaced.

## Scope

- Phase 0 (this file): cloud reads via provider interface, `dataFetchers.ts` deleted.
- Phase 1: mutations migrated from `dataStore.ts` inline calls to `resources`.
- Phase 2–3: feature-specific reads (weekly review, AI priorities) through resources.
- Phase 4: onboarding / settings / migrateGuest.
- Phase 5: ESLint enforcement (`no-restricted-imports`), full docs sweep.
