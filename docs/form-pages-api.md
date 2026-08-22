# Form Pages API Documentation (Embedded Architecture)

**Base URL:** `http://localhost:5000/api/v1`

## Architecture Overview

Form pages are now **embedded subdocuments** inside the Form document. They are NOT stored in a separate collection. All page operations use MongoDB's array update operators (`$push`, `$pull`, positional `$`) directly on the Form document's `pages` array.

### Data Structure

```json
{
  "_id": "65f1a2b3c4d5e6f7a8b9c0d2",
  "title": "Customer Feedback Form",
  "slug": "customer-feedback-form",
  "status": "draft",
  "pages": [
    {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d3",
      "pageKey": "page_abc12345",
      "label": "What is your name?",
      "type": "shortText",
      "required": true,
      "order": 1,
      "helperText": "",
      "placeholder": "",
      "options": [],
      "validation": {},
      "logic": [],
      "appearance": { "width": "full", "icon": "" },
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Key Differences from Before

| Before (Separate Collection) | Now (Embedded in Form) |
|------------------------------|------------------------|
| `FormPage` collection existed | No separate collection |
| Page had `formId` reference | No `formId` needed (implicit) |
| Deleting form required manual page cleanup | Deleting form auto-deletes its pages |
| Two queries: form + pages | One query: form with pages |
| `FormPage.find({ formId })` | `Form.findById(formId).pages` |

---

## Endpoints

### 1. Create a Page

**POST** `/forms/:formId/pages`

**Headers:** `Authorization: Bearer <token>`

**How it works:** The page object is pushed into the Form's `pages` array. The `pageKey` is auto-generated (e.g., `page_abc12345`), and the `order` is auto-calculated (max existing order + 1).

**Request Body:**
```json
{
  "type": "shortText",
  "label": "What is your name?",
  "helperText": "Please enter your full name",
  "placeholder": "John Doe",
  "required": true,
  "options": [],
  "validation": {
    "minLength": 2,
    "maxLength": 100
  },
  "appearance": {
    "width": "full",
    "icon": "user"
  }
}
```

**Page Types:** `shortText`, `longText`, `email`, `phone`, `number`, `date`, `time`, `radio`, `checkbox`, `select`, `multiSelect`, `file`, `rating`, `yesNo`, `url`

**Response (201):**
```json
{
  "success": true,
  "message": "Page created successfully",
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d3",
    "pageKey": "page_abc123",
    "label": "What is your name?",
    "helperText": "Please enter your full name",
    "placeholder": "John Doe",
    "type": "shortText",
    "required": true,
    "order": 1,
    "options": [],
    "validation": { "minLength": 2, "maxLength": 100 },
    "logic": [],
    "appearance": { "width": "full", "icon": "user" },
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 2. Get All Pages

**GET** `/forms/:formId/pages`

**Headers:** `Authorization: Bearer <token>`

**How it works:** Reads the `pages` array from the Form document and returns only active pages (`isActive: true`), sorted by `order`.

**Response (200):**
```json
{
  "success": true,
  "message": "Pages retrieved successfully",
  "data": [
    {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d3",
      "pageKey": "page_abc123",
      "label": "What is your name?",
      "type": "shortText",
      "required": true,
      "order": 1,
      "options": [],
      "validation": {},
      "logic": [],
      "appearance": { "width": "full", "icon": "" },
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 3. Get a Single Page

**GET** `/forms/:formId/pages/:pageId`

**Headers:** `Authorization: Bearer <token>`

**How it works:** The `pageId` can be either the MongoDB `_id` of the embedded page OR its `pageKey` string. Uses MongoDB's positional projection to return only the matching subdocument.

**Response (200):**
```json
{
  "success": true,
  "message": "Page retrieved successfully",
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d3",
    "pageKey": "page_abc123",
    "label": "What is your name?",
    "type": "shortText",
    "required": true,
    "order": 1,
    "options": [],
    "validation": {},
    "logic": [],
    "appearance": { "width": "full", "icon": "" },
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 4. Update a Page

**PATCH** `/forms/:formId/pages/:pageId`

**Headers:** `Authorization: Bearer <token>`

**How it works:** Uses MongoDB's positional `$` operator to update specific pages of the matched subdocument. Only send the properties you want to change.

**Request Body:**
```json
{
  "label": "Updated question?",
  "required": false,
  "options": [
    { "label": "Option A", "value": "a" },
    { "label": "Option B", "value": "b" }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Page updated successfully",
  "data": { ...updated page object... }
}
```

---

### 5. Delete a Page

**DELETE** `/forms/:formId/pages/:pageId`

**Headers:** `Authorization: Bearer <token>`

**How it works:** Uses MongoDB's `$pull` operator to remove the matching subdocument from the Form's `pages` array by its `_id`.

**Response (200):**
```json
{
  "success": true,
  "message": "Page deleted successfully",
  "data": null
}
```

---

### 6. Reorder Pages

**PATCH** `/forms/:formId/pages/reorder`

**Headers:** `Authorization: Bearer <token>`

**How it works:** The order of `pageIds` in the array determines the new order (1-based index). Each page's `order` property is updated accordingly.

**Request Body:**
```json
{
  "pageIds": [
    "65f1a2b3c4d5e6f7a8b9c0d4",
    "65f1a2b3c4d5e6f7a8b9c0d3",
    "65f1a2b3c4d5e6f7a8b9c0d5"
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Pages reordered successfully",
  "data": null
}
```

---

### 7. Duplicate a Page

**PATCH** `/forms/:formId/pages/:pageId/duplicate`

**Headers:** `Authorization: Bearer <token>`

**How it works:** Reads the existing page, creates a copy with a new `pageKey`, appends "(copy)" to the label, and pushes it as a new subdocument.

**Response (201):**
```json
{
  "success": true,
  "message": "Page duplicated successfully",
  "data": { ...duplicated page object... }
}
```

---

### 8. Update Page Logic

**PATCH** `/forms/:formId/pages/:pageId/logic`

**Headers:** `Authorization: Bearer <token>`

**How it works:** Updates only the `logic` array of the matched page subdocument.

**Request Body:**
```json
{
  "logic": [
    {
      "whenPageKey": "page_abc123",
      "operator": "equals",
      "value": "John Doe",
      "action": "show",
      "targetPageKey": "page_def456"
    }
  ]
}
```

**Logic Operators:** `equals`, `notEquals`, `contains`, `greaterThan`, `lessThan`

**Logic Actions:** `show`, `hide`, `goToPage`, `goToEnd`

**Response (200):**
```json
{
  "success": true,
  "message": "Page logic updated successfully",
  "data": { ...page object with updated logic... }
}
```

---

### 9. Delete Page Logic

**DELETE** `/forms/:formId/pages/:pageId/logic`

**Headers:** `Authorization: Bearer <token>`

**How it works:** Sets the `logic` array of the matched page to an empty array `[]`.

**Response (200):**
```json
{
  "success": true,
  "message": "Page logic deleted successfully",
  "data": { ...page object with empty logic... }
}
```

---

## Data Model

### Form (with embedded pages)
```typescript
interface Form {
  _id: string;
  title: string;
  description: string;
  slug: string;
  status: "draft" | "published" | "archived";
  theme: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
  settings: {
    oneQuestionAtATime: boolean;
    showProgressBar: boolean;
    allowMultipleSubmissions: boolean;
    requireLogin: boolean;
    collectIP: boolean;
  };
  pages: FormPage[];  // <-- embedded array
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### FormPage (embedded subdocument)
```typescript
interface FormPage {
  _id: string;
  pageKey: string;
  label: string;
  helperText: string;
  placeholder: string;
  type: "shortText" | "longText" | "email" | "phone" | "number" | 
        "date" | "time" | "radio" | "checkbox" | "select" | 
        "multiSelect" | "file" | "rating" | "yesNo" | "url";
  required: boolean;
  order: number;
  options: { label?: string; value?: string }[];
  validation: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  logic: {
    whenPageKey?: string;
    operator?: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
    value?: any;
    action?: "show" | "hide" | "goToPage" | "goToEnd";
    targetPageKey?: string;
  }[];
  appearance: {
    width: "full" | "half";
    icon: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Important Notes for Frontend

1. **No `formId` in page objects** — Since pages are embedded in the form, the `formId` is implicit. The page response no longer includes a `formId` page.

2. **Page identifier** — Use `_id` to reference a specific page. The `pageKey` can also be used as an alternative identifier for lookups.

3. **Getting form with pages** — When you fetch a form via `GET /forms/:formId`, the response includes the `pages` array directly. No separate API call needed.

4. **Public form schema** — `GET /public/forms/:slug/schema` returns pages without `logic` data (for security). `GET /public/forms/:slug/preview` returns pages with all data.

5. **Order is 1-based** — Page `order` starts at 1 and increments.