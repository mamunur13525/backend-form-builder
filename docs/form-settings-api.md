# Form Settings API Documentation

**Base URL:** `http://localhost:5000/api/v1`

## Overview

Form settings are stored as a grouped object inside each `FormVersion.formSchema.settings` and are edited **only on the draft version**. Saving any setting on a published form automatically clones the published version into a new draft (`hasUnpublishedChanges = true`). Settings only reach the live form when the draft is published.

The settings object looks like:

```json
{
  "oneQuestionAtATime": true,
  "showProgressBar": true,
  "allowMultipleSubmissions": true,
  "requireLogin": false,
  "collectIP": false,

  "general": {
    "show_progress_bar": true,
    "initial_loader": true,
    "navigation_arrows": true,
    "refill_link": { "isActive": false, "link": "" },
    "show_powered_by_company_name": true,
    "anonymous_survey": false
  },

  "emailSettings": {
    "receive_email_notification": false,
    "multiple_recipients": { "isActive": false, "emails": [] },
    "reply_to": {
      "automatic_first_email_field": false,
      "custom_email": { "isActive": false, "address": "" }
    },
    "email_subject": "",
    "email_body": ""
  },

  "access": {
    "close_form": false,
    "close_form_by_date": { "isActive": false, "date": null },
    "close_form_by_submissions": { "isActive": false, "submissions": 0 },
    "auto_refresh_inactivity": { "isActive": false, "minutes": 5 },
    "preventDuplicateSubmissions": false,
    "detectionMethod": "cookie_ip",
    "responseLimit": { "type": "single", "count": 1, "period": "lifetime" }
  },

  "hiddenFields": { "enabled": false, "fields": [] },
  "variables": [
    { "name": "score", "type": "number", "value": 0 },
    { "name": "price", "type": "number", "value": 0 }
  ]
}
```

> **Default variables:** every form ships with `score` and `price` (both `number`, value `0`) already available in the settings panel. They are always present — a stored variable with the same name overrides the default, and custom variables are appended.

All settings endpoints require `Authorization: Bearer <token>`.

---

## Get Settings

**GET** `/forms/:formId/settings`

Returns the full normalized settings object of the current draft.

```json
{
  "success": true,
  "message": "Form settings retrieved successfully",
  "data": {
    "formId": "65f1a2b3c4d5e6f7a8b9c0d2",
    "settings": { "...": "see shape above" },
    "hasUnpublishedChanges": false
  }
}
```

---

## Update General Settings

**PATCH** `/forms/:formId/settings/general`

All fields optional — missing fields are kept from the current draft.

```json
{
  "show_progress_bar": false,
  "initial_loader": true,
  "navigation_arrows": false,
  "refill_link": { "isActive": true, "link": "https://example.com/refill" },
  "show_powered_by_company_name": false,
  "anonymous_survey": true
}
```

---

## Update Email Settings

**PATCH** `/forms/:formId/settings/email`

```json
{
  "receive_email_notification": true,
  "multiple_recipients": { "isActive": true, "emails": ["owner@example.com"] },
  "reply_to": {
    "automatic_first_email_field": true,
    "custom_email": { "isActive": false, "address": "noreply@example.com" }
  },
  "email_subject": "New response received",
  "email_body": "Someone just submitted your form."
}
```

---

## Update Access & Scheduling Settings

**PATCH** `/forms/:formId/settings/access`

```json
{
  "close_form": true,
  "close_form_by_date": { "isActive": true, "date": "2026-12-31T23:59:59.000Z" },
  "close_form_by_submissions": { "isActive": true, "submissions": 100 },
  "auto_refresh_inactivity": { "isActive": true, "minutes": 20 },
  "preventDuplicateSubmissions": true,
  "detectionMethod": "cookie_ip",
  "responseLimit": { "type": "multiple", "count": 3, "period": "day" }
}
```

**Values** — `detectionMethod`: `cookie` | `ip` | `cookie_ip`; `responseLimit.type`: `single` | `multiple`; `responseLimit.period`: `day` | `month` | `year` | `lifetime`.

Dates are accepted as ISO-8601 strings and stored as `Date`. Send `"date": null` to clear it.

---

## Update Hidden Fields

**PATCH** `/forms/:formId/settings/hidden-fields`

```json
{
  "enabled": true,
  "fields": [
    { "key": "utm_source", "value": "google" },
    { "key": "utm_campaign", "value": "summer-sale" }
  ]
}
```

The `fields` array is REPLACED wholesale on update.

---

## Update Variables

**PATCH** `/forms/:formId/settings/variables`

```json
{
  "variables": [
    { "name": "score", "type": "number", "value": 0 },
    { "name": "price", "type": "number", "value": 0 },
    { "name": "user_id", "type": "text", "value": "123" },
    { "name": "discount", "type": "number", "value": 20 }
  ]
}
```

The `variables` array is REPLACED wholesale on update. Each item: `name` (required), `type` (`text` | `number`), `value` (string | number | boolean).

**Defaults are preserved server-side:** even if the request only contains custom variables (e.g. only `user_id`/`discount`), `score` and `price` are kept/restored in the response. A custom variable named `score` or `price` overrides the default.

---

## Draft / Publish Interaction

- Reads and writes always target the **draft version**.
- If `draftVersionId === publishedVersionId`, the first edit clones the published version into a new draft first.
- Every update sets `hasUnpublishedChanges = true` while a published version exists — the live form is never affected.
- Publish the draft to promote settings to the live form: `POST /forms/:formId/publish`.