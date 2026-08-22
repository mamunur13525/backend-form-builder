# Form Draft & Publish API Documentation

API specification for managing the **Draft & Publish Versioning System**.

---

## Overview & Versioning State

Every form uses an immutable versioning system:
- **`status`**: `"draft"` | `"published"` | `"archived"`
- **`draftVersionId`**: Reference ID to the active working draft version.
- **`publishedVersionId`**: Reference ID to the active live published version (`null` if never published).
- **`hasUnpublishedChanges`**: `true` when draft edits exist that have not been published yet.

---

## 1. Admin Endpoints (Auth Required)

### 1.1 Publish Form
Publishes the current draft version and makes it live for respondents.

- **URL**: `POST /api/v1/forms/:formId/publish` *(or `PATCH /api/v1/forms/:formId/publish`)*
- **Headers**: `Authorization: Bearer <token>`
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "message": "Form published successfully",
  "data": {
    "id": "60d5ec49f1b2c80015b6d123",
    "title": "Customer Survey",
    "slug": "customer-survey",
    "status": "published",
    "draftVersionId": "60d5ec49f1b2c80015b6d456",
    "publishedVersionId": "60d5ec49f1b2c80015b6d456",
    "hasUnpublishedChanges": false,
    "version": 1
  }
}
```

---

### 1.2 Discard Draft
Deletes the unpublished draft version and reverts back to the active published version.

- **URL**: `POST /api/v1/forms/:formId/discard`
- **Headers**: `Authorization: Bearer <token>`
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "message": "Draft discarded successfully",
  "data": {
    "id": "60d5ec49f1b2c80015b6d123",
    "status": "published",
    "draftVersionId": "60d5ec49f1b2c80015b6d456",
    "publishedVersionId": "60d5ec49f1b2c80015b6d456",
    "hasUnpublishedChanges": false,
    "version": 1
  }
}
```

---

### 1.3 Unpublish Form
Changes form status back to `draft`. The public URL will return `404` until re-published.

- **URL**: `PATCH /api/v1/forms/:formId/unpublish`
- **Headers**: `Authorization: Bearer <token>`
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "message": "Form unpublished successfully",
  "data": {
    "id": "60d5ec49f1b2c80015b6d123",
    "status": "draft"
  }
}
```

---

### 1.4 Get Form Version History
Retrieves all historical versions for a form.

- **URL**: `GET /api/v1/forms/:formId/versions`
- **Headers**: `Authorization: Bearer <token>`
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "message": "Form versions retrieved successfully",
  "data": [
    {
      "id": "60d5ec49f1b2c80015b6d789",
      "formId": "60d5ec49f1b2c80015b6d123",
      "version": 2,
      "isPublished": false,
      "isDraft": true,
      "createdAt": "2026-07-30T18:45:00.000Z"
    },
    {
      "id": "60d5ec49f1b2c80015b6d456",
      "formId": "60d5ec49f1b2c80015b6d123",
      "version": 1,
      "isPublished": true,
      "isDraft": false,
      "createdAt": "2026-07-30T18:40:00.000Z"
    }
  ]
}
```

---

### 1.5 Get Public Shareable Link
Retrieves the form slug and public URL.

- **URL**: `GET /api/v1/forms/:formId/slug`
- **Headers**: `Authorization: Bearer <token>`
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "data": {
    "slug": "customer-survey",
    "publicUrl": "/public/forms/customer-survey"
  }
}
```

---

## 2. Public Respondent Endpoints (No Auth Required)

### 2.1 Get Published Form (Direct Route)
Returns the live published form schema. Returns `404` if the form is unpublished or in draft status.

- **URL**: `GET /f/:slug` *(or `GET /api/v1/public/forms/:slug`)*
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "data": {
    "id": "60d5ec49f1b2c80015b6d123",
    "title": "Customer Survey",
    "slug": "customer-survey",
    "status": "published",
    "formVersionId": "60d5ec49f1b2c80015b6d456",
    "version": 1,
    "pages": [
      {
        "pageKey": "page_a1b2c3d4",
        "label": "Your Name",
        "type": "shortText",
        "required": true,
        "order": 1
      }
    ],
    "theme": {
      "primaryColor": "#000000",
      "backgroundColor": "#ffffff",
      "textColor": "#111111"
    },
    "settings": {
      "oneQuestionAtATime": true,
      "showProgressBar": true,
      "allowMultipleSubmissions": true
    }
  }
}
```

---

### 2.2 Submit Form Response
Submits respondent answers against the exact published version ID.

- **URL**: `POST /api/v1/public/forms/:slug/submit`
- **Request Body**:
```json
{
  "answers": [
    {
      "pageKey": "page_a1b2c3d4",
      "label": "Your Name",
      "type": "shortText",
      "value": "Alice"
    }
  ]
}
```
- **Response** `(200 OK)`:
```json
{
  "success": true,
  "data": {
    "submissionId": "60d5ec49f1b2c80015b6d999",
    "formVersionId": "60d5ec49f1b2c80015b6d456",
    "message": "Form submitted successfully"
  }
}
```