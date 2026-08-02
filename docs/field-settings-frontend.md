# Field Settings & New Field Types — Frontend Guide

Companion to `docs/form-fields-api.md`. Covers only what changed: the new field types, the new `coverImage` property, and the new per-type `settings` object.

**Endpoints are unchanged.** Everything below is sent/received through the existing routes:

- `POST /forms/:formId/fields`
- `PATCH /forms/:formId/fields/:fieldId`

---

## 1. What's new on every field

Two new properties exist on all field objects:

```jsonc
{
  "coverImage": { "url": "https://…/cover.png", "fileId": "abc123", "alt": "" },
  "settings": { /* only the group for this field's type — see §3 */ }
}
```

**`coverImage`** — available on every type. Upload via the existing `POST /uploads` endpoint, then send the returned `url`/`fileId` here.

| Sending | Result |
|---|---|
| `"coverImage": { "url": "…" }` | Sets/replaces the image |
| `"coverImage": null` | **Clears** the image |
| key omitted | Left unchanged |

**`settings`** — a namespaced object. Only the group belonging to the field's type is stored; everything else is stripped server-side.

---

## 2. Field types

```
shortText  longText  email  phone  number  date  time
radio  checkbox  select  multiSelect  dropdown
file  rating  yesNo  url
statement  address  opinionScale  signature  matrix
```

Newly added: **`statement`**, **`dropdown`**, **`address`**, **`opinionScale`**, **`signature`**, **`matrix`**.

Types with **no** settings group (only `required` + `coverImage`): `shortText`, `url`, `date`, `time`, `dropdown`, `signature`, `yesNo`, `number`, `longText`.

> `number` and `longText` have no settings group because their min/max limits live in the existing **`validation`** object, not in `settings`. See §4.

---

## 3. Settings by field type

The group name is **not** the type name — `select`, `multiSelect`, `radio` and `checkbox` all share the `choice` group.

| Type | `settings` group |
|---|---|
| `email` | `email` |
| `phone` | `phone` |
| `statement` | `statement` |
| `select` / `multiSelect` / `radio` / `checkbox` | `choice` |
| `address` | `address` |
| `rating` | `rating` |
| `opinionScale` | `opinionScale` |
| `file` | `upload` |
| `matrix` | `matrix` |

### email
```json
{ "settings": { "email": { "businessEmailsOnly": false, "emailVerification": false } } }
```

### phone
```json
{
  "settings": {
    "phone": {
      "phoneVerification": false,
      "countryCodeMode": "auto",
      "defaultCountry": { "iso2": "BD", "name": "Bangladesh", "dialCode": "+880" }
    }
  }
}
```
`countryCodeMode` is `"auto"` or `"specific"`. When `"specific"`, `defaultCountry` **must** include `iso2` or `dialCode` or the request is rejected.

### statement
```json
{ "settings": { "statement": { "embedUrl": "", "embedProvider": "youtube", "embedTitle": "" } } }
```
`embedProvider`: `youtube` | `loom` | `vimeo` | `pdf` | `image` | `other`. `embedUrl` must be a valid URL or `""`.

Statement is display-only. Use the existing **`label`** for the heading and **`helperText`** for the description body (there is no separate `description` property). **`required` is always forced to `false`**, whatever you send.

### choice — `select`, `multiSelect`, `radio`, `checkbox`
```json
{
  "settings": {
    "choice": {
      "allowOther": false,
      "otherLabel": "Other",
      "horizontalAlign": false,
      "optionsPerRow": { "desktop": 3, "mobile": 1 },
      "hideLabels": false,
      "selectionLimit": { "mode": "none" }
    }
  }
}
```
- `optionsPerRow` only applies when `horizontalAlign` is `true`. Allowed values: **1–6**.
- `selectionLimit` is only present on multi-answer types (`multiSelect`, `checkbox`).
  - `{ "mode": "none" }`
  - `{ "mode": "exact", "exact": 3 }` — `exact` required
  - `{ "mode": "range", "min": 1, "max": 4 }` — both required, `min <= max`

### address
```json
{
  "settings": {
    "address": {
      "fields": [
        { "key": "address1", "label": "Address",        "placeholder": "", "required": false, "hidden": false, "order": 1 },
        { "key": "address2", "label": "Address line 2", "placeholder": "", "required": false, "hidden": false, "order": 2 },
        { "key": "city",     "label": "City",           "placeholder": "", "required": false, "hidden": false, "order": 3 },
        { "key": "state",    "label": "State",          "placeholder": "", "required": false, "hidden": false, "order": 4 },
        { "key": "zip",      "label": "Zip",            "placeholder": "", "required": false, "hidden": false, "order": 5 },
        { "key": "country",  "label": "Country",        "placeholder": "", "required": false, "hidden": false, "order": 6 }
      ]
    }
  }
}
```
These six are seeded automatically when the field is created. The admin can rename `label`, change `placeholder`, toggle `required` and `hidden`. `key` is fixed — don't invent new ones.

### rating
```json
{ "settings": { "rating": { "style": "star", "max": 5 } } }
```
`style`: `"star"` or `"number"`. `max` is 2–10.

### opinionScale
```json
{ "settings": { "opinionScale": { "min": 0, "max": 10, "leftLabel": "", "rightLabel": "" } } }
```
`min` must be `<` `max`, both within 0–100. The labels render under the left/right ends of the number row.

### upload — type `file`
```json
{
  "settings": {
    "upload": { "allowMultiple": false, "allowedFileTypes": ["image", "application/pdf"], "maxFileSizeMb": 10 }
  }
}
```
`allowedFileTypes` accepts either a **group name** or a **concrete MIME type**. Empty array = allow everything.

| Group | Expands to |
|---|---|
| `image` | jpeg, png, gif, webp, svg+xml, heic |
| `video` | mp4, quicktime, x-msvideo, webm |
| `audio` | mpeg, wav, ogg, webm, mp4 |
| `text` | plain, csv, html, markdown |
| `application` | pdf, doc, docx, xls, xlsx, ppt, pptx, zip, json |

`maxFileSizeMb` max is **100**. Any value outside the table/limit is rejected.

### matrix
```json
{
  "settings": {
    "matrix": {
      "rows":    [{ "key": "r1", "label": "Speed",   "order": 1 }],
      "columns": [{ "key": "c1", "label": "Good",    "order": 1 }],
      "allowMultiplePerRow": false
    }
  }
}
```
Max 50 rows, 20 columns. `key` and `order` are required on each entry; generate `key` client-side and keep it stable.

---

## 4. Character / number limits (existing `validation` object)

`longText` min/max characters and `number` min/max use the **existing** `validation` object, not `settings`:

```json
{ "validation": { "minLength": 10, "maxLength": 500 } }   // longText
{ "validation": { "min": 1, "max": 99 } }                 // number
```

Send **`null`** for "no limit" (the blank input state). `minLength <= maxLength` and `min <= max` are enforced.

---

## 5. Behaviour to code against

1. **Send only the group that matches the type.** Unknown keys in `settings` are rejected (`.strict()`); irrelevant groups are dropped.

2. **Changing a field's `type` wipes its settings.** The server rebuilds them from the new type's defaults. If the user switches `rating` → `file`, the old `{ style, max }` is gone — re-render the panel from the response, don't reuse local state.

3. **Defaults are applied on create.** `POST` a field with no `settings` and the response comes back fully populated (address gets its six rows, upload gets `maxFileSizeMb: 10`, etc.). Use the response to hydrate the settings panel.

4. **Partial updates merge.** `PATCH` with `{ "settings": { "choice": { "hideLabels": true } } }` keeps the other `choice` values intact.

5. **Duplicating a field copies settings and cover image.**

---

## 6. Not yet implemented on the backend

These are **stored as flags only** — no server-side behaviour exists yet. Don't tell users they're active:

- `email.emailVerification` and `phone.phoneVerification` — no OTP is sent or checked.
- `email.businessEmailsOnly` — not enforced on submit.
- **All submission-time validation.** `POST /public/forms/:slug/submit` currently accepts any answers payload without checking `required`, selection limits, upload size/type, or scale bounds. Client-side validation is the only enforcement today.
