# Diagrams

Rendered visuals for FreeSlot's runtime data flow and its database schema. Both blocks are
[Mermaid](https://mermaid.js.org/) and render automatically on GitHub. Keep them in sync with
[`ARCHITECTURE.md`](./ARCHITECTURE.md) and [`src/resources/README.md`](../src/resources/README.md).

---

## 1. Data flow (guest vs. cloud)

How a read or write travels from a page down to storage. The key rule: pages and feature
components only ever touch `dataStore` hooks; `dataStore` is the single place that knows about the
guest/cloud split.

```mermaid
flowchart TD
    subgraph SPA["React SPA (Vite)"]
        Pages["Pages / feature components<br/><i>never import the Supabase client (lint-enforced)</i>"]
        DataStore["dataStore hooks<br/>(useCategories, useTimeLogsInRange, mutations…)"]
        Pages -->|"React Query hooks + mutations"| DataStore

        DataStore -->|"mode === 'cloud'"| Resources["resources provider<br/>ResourcesProvider interface"]
        DataStore -->|"mode === 'guest'"| LocalStore["localStore<br/>localStorage mirror of the schema"]

        Resources --> Supa["_providers/supabase<br/><i>only importer of the Supabase JS SDK</i>"]
        LocalStore --> LS[("localStorage<br/>freeslot.guest.*")]

        Migrate["migrateGuest.ts<br/>(on signup)"]
        LocalStore -.->|"snapshot"| Migrate
        Migrate -.->|"resources.*.insertMany"| Resources
    end

    Supa --> DB[("Supabase Postgres<br/>(RLS: auth.uid() = user_id)")]
    Supa --> Edge["Edge functions (Deno)<br/>generate-weekly-plan · weekly-review · delete-account"]
    Edge --> Gemini["Gemini API<br/>(GEMINI_API_KEY secret)"]

    classDef store fill:#eef,stroke:#557;
    class LS,DB store;
```

**Notes**

- The **AI planner** (`AIPlanPanel` → `generate-weekly-plan`) is cloud-only by design — it is the
  gated feature that incentivises signup, so it deliberately skips the guest branch.
- Guest reactivity comes from a `freeslot:guest-change` `CustomEvent` (plus the native `storage`
  event for cross-tab); `dataStore` hooks re-fetch on it.

---

## 2. Database ER schema

Every table is per-user and isolated by RLS (`auth.uid() = user_id`). `time_logs`, `schedule_blocks`,
and `activities` reference `categories` with `ON DELETE SET NULL`; `weekly_priorities` references
`activities` with `ON DELETE CASCADE`. `time_logs.type` (productive/unproductive/essential) is
**derived from its category at the app layer**, not stored as a column.

```mermaid
erDiagram
    auth_users ||--|| profiles : "id"
    auth_users ||--o{ categories : "user_id"
    auth_users ||--o{ activities : "user_id"
    auth_users ||--o{ schedule_blocks : "user_id"
    auth_users ||--o{ time_logs : "user_id"
    auth_users ||--o{ weekly_priorities : "user_id"
    auth_users ||--o{ weekly_plans : "user_id"
    auth_users ||--o{ weekly_reviews : "user_id"
    auth_users ||--o{ daily_notes : "user_id"
    auth_users ||--o{ inbox_items : "user_id"

    categories ||--o{ schedule_blocks : "category_id (SET NULL)"
    categories ||--o{ time_logs : "category_id (SET NULL)"
    categories ||--o{ activities : "category_id (SET NULL)"
    activities ||--o{ weekly_priorities : "activity_id (CASCADE)"

    profiles {
        uuid id PK "= auth.users.id"
        text email
        jsonb peak_hours
        boolean include_weekends
        int weekly_review_day "0=Sun"
        text time_format "12h | 24h"
        boolean onboarding_completed
        boolean onboarding_skipped
        boolean tour_completed
        timestamptz created_at
    }
    categories {
        uuid id PK
        uuid user_id FK
        text name
        category_type type "productive | unproductive | essential"
        text color
        boolean is_default
        boolean hidden
        int sort_order
        timestamptz created_at
    }
    activities {
        uuid id PK
        uuid user_id FK
        text name
        uuid category_id FK
        numeric target_hours_per_week
        boolean is_active
        timestamptz created_at
    }
    schedule_blocks {
        uuid id PK
        uuid user_id FK
        text name
        uuid category_id FK
        text color
        int_array days_of_week "0=Sun..6=Sat"
        time start_time
        time end_time
        block_type type "fixed | waste_expected"
        int sort_order
        timestamptz created_at
    }
    time_logs {
        uuid id PK
        uuid user_id FK
        date date
        time start_time
        time end_time
        uuid category_id FK
        text title
        text notes
        jsonb note_json
        timestamptz created_at
    }
    weekly_priorities {
        uuid id PK
        uuid user_id FK
        date week_start
        uuid activity_id FK
        int rank
        timestamptz created_at
    }
    weekly_plans {
        uuid id PK
        uuid user_id FK
        date week_start "UNIQUE(user_id, week_start)"
        timestamptz generated_at
        jsonb slots
    }
    weekly_reviews {
        uuid id PK
        uuid user_id FK
        date week_start "UNIQUE(user_id, week_start)"
        timestamptz completed_at
        text insights
    }
    daily_notes {
        uuid user_id PK "PK(user_id, date)"
        date date PK
        jsonb content
        timestamptz updated_at
    }
    inbox_items {
        uuid id PK
        uuid user_id FK
        text content
        timestamptz created_at
        timestamptz archived_at "UI removed; table retained"
    }
```
