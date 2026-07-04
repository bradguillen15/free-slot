# ai-output-localization Specification

## Purpose
AI-generated user-facing content (weekly plan rationale/summary, weekly review insights) matches the user's UI language, so signed-in Spanish-speaking users don't receive English-only AI output.

## Requirements

### Requirement: AI plan rationale matches UI locale
The `generate-weekly-plan` edge function SHALL produce slot rationales and the plan summary in the language indicated by the `locale` field of the request body (`"en"` or `"es"`). When `locale` is missing or not one of the supported values, the function SHALL default to English.

#### Scenario: Spanish UI produces Spanish plan text
- **WHEN** a signed-in user with `i18n.language` set to `"es"` requests a weekly plan
- **THEN** the request body sent to `generate-weekly-plan` includes `locale: "es"`
- **THEN** the returned slot rationales and summary are written in Spanish

#### Scenario: English UI produces English plan text
- **WHEN** a signed-in user with `i18n.language` set to `"en"` requests a weekly plan
- **THEN** the request body includes `locale: "en"`
- **THEN** the returned slot rationales and summary are written in English

#### Scenario: Missing locale defaults to English
- **WHEN** `generate-weekly-plan` receives a request body without a `locale` field
- **THEN** the function builds the prompt with English as the target language

### Requirement: AI weekly review matches UI locale
The `weekly-review` edge function SHALL produce the review `insights` text in the language indicated by the `locale` field of the request body. When `locale` is missing or not one of the supported values, the function SHALL default to English.

#### Scenario: Spanish UI produces Spanish review
- **WHEN** a signed-in user with `i18n.language` set to `"es"` requests a weekly review
- **THEN** the request body sent to `weekly-review` includes `locale: "es"`
- **THEN** the returned `insights` text is written in Spanish

#### Scenario: Unsupported locale value falls back to English
- **WHEN** `weekly-review` receives a `locale` value other than `"en"` or `"es"`
- **THEN** the function builds the prompt with English as the target language
