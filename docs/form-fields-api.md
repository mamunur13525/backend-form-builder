# Form Fields API Documentation (Embedded Architecture)

**Base URL:** `http://localhost:5000/api/v1`

## Architecture Overview

Form fields are now **embedded subdocuments** inside the Form document. They are NOT stored in a separate collection. All field operations use MongoDB's array update operators (`$push`, `$pull`, positional `$`) directly on the Form document's `fields` array.

### Data Structure

```json
{
  "_id": "65f1a2b3c4d5e6f7a8b9c0d2",
  "title": "Customer Feedback Form",
  "slug": "customer-feedback-form",
  "status": "draft",
  "fields": [
    {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d3",
      "fieldKey": "field_abc12345",
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
| `FormField` collection existed | No separate collection |
| Field had `formId` reference | No `formId` needed (implicit) |
| Deleting form required manual field cleanup | Deleting form auto-deletes its fields |
| Two queries: form + fields | One query: form with fields |
| `FormField.find({ formId })` | `Form.findById(formId).fields` |

---

## Endpoints

### 1. Create a Field

**POST** `/forms/:formId/fields`

**Headers:** `Authorization: Bearer <token>`

**How it works:** The field object is pushed into the Form's `fields` array. The `fieldKey` is auto-generated (e.g., `field_abc12345`), and the `order` is auto-calculated (max existing order + 1).

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

**Field Types:** `shortText`, `longText`, `email`, `phone`, `number`, `date`, `time`, `radio`, `checkbox`, `select`, `multiSelect`, `file`, `rating`, `yesNo`, `url`

**Response (201):**
```json
{
  "success": true,
  "message": "Field created successfully",
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d3",
    "fieldKey": "field_abc123",
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

### 2. Get All Fields

**GET** `/forms/:formId/fields`

**Headers:** `Authorization: Bearer <token>`

**How it works:** Reads the `fields` array from the Form document and returns only active fields (`isActive: true`), sorted by `order`.

**Response (200):**
```json
{
  "success": true,
  "message": "Fields retrieved successfully",
  "data": [
    {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d3",
      "fieldKey": "field_abc123",
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

### 3. Get a Single Field

**GET** `/forms/:formId/fields/:fieldId`

**Headers:** `Authorization: Bearer <token>`

**How it works:** The `fieldId` can be either the MongoDB `_id` of the embedded field OR its `fieldKey` string. Uses MongoDB's positional projection to return only the matching subdocument.

**Response (200):**
```json
{
  "success": true,
  "message": "Field retrieved successfully",
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d3",
    "fieldKey": "field_abc123",
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

### 4. Update a Field

**PATCH** `/forms/:formId/fields/:fieldId`

**Headers:** `Authorization: Bearer <token>`

**How it works:** Uses MongoDB's positional `$` operator to update specific fields of the matched subdocument. Only send the properties you want to change.

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
  "message": "Field updated successfully",
  "data": { ...updated field object... }
}
```

---

### 5. Delete a Field

**DELETE** `/forms/:formId/fields/:fieldId`

**Headers:** `Authorization: Bearer <token>`

**How it works:** Uses MongoDB's `$pull` operator to remove the matching subdocument from the Form's `fields` array by its `_id`.

**Response (200):**
```json
{
  "success": true,
  "message": "Field deleted successfully",
  "data": null
}
```

---

### 6. Reorder Fields

**PATCH** `/forms/:formId/fields/reorder`

**Headers:** `Authorization: Bearer <token>`

**How it works:** The order of `fieldIds` in the array determines the new order (1-based index). Each field's `order` property is updated accordingly.

**Request Body:**
```json
{
  "fieldIds": [
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
  "message": "Fields reordered successfully",
  "data": null
}
```

---

### 7. Duplicate a Field

**PATCH** `/forms/:formId/fields/:fieldId/duplicate`

**Headers:** `Authorization: Bearer <token>`

**How it works:** Reads the existing field, creates a copy with a new `fieldKey`, appends "(copy)" to the label, and pushes it as a new subdocument.

**Response (201):**
```json
{
  "success": true,
  "message": "Field duplicated successfully",
  "data": { ...duplicated field object... }
}
```

---

### 8. Update Field Logic

**PATCH** `/forms/:formId/fields/:fieldId/logic`

**Headers:** `Authorization: Bearer <token>`

**How it works:** Updates only the `logic` array of the matched field subdocument.

**Request Body:**
```json
{
  "logic": [
    {
      "whenFieldKey": "field_abc123",
      "operator": "equals",
      "value": "John Doe",
      "action": "show",
      "targetFieldKey": "field_def456"
    }
  ]
}
```

**Logic Operators:** `equals`, `notEquals`, `contains`, `greaterThan`, `lessThan`

**Logic Actions:** `show`, `hide`, `goToField`, `goToEnd`

**Response (200):**
```json
{
  "success": true,
  "message": "Field logic updated successfully",
  "data": { ...field object with updated logic... }
}
```

---

### 9. Delete Field Logic

**DELETE** `/forms/:formId/fields/:fieldId/logic`

**Headers:** `Authorization: Bearer <token>`

**How it works:** Sets the `logic` array of the matched field to an empty array `[]`.

**Response (200):**
```json
{
  "success": true,
  "message": "Field logic deleted successfully",
  "data": { ...field object with empty logic... }
}
```

---

## Data Model

### Form (with embedded fields)
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
  fields: FormField[];  // <-- embedded array
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### FormField (embedded subdocument)
```typescript
interface FormField {
  _id: string;
  fieldKey: string;
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
    whenFieldKey?: string;
    operator?: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
    value?: any;
    action?: "show" | "hide" | "goToField" | "goToEnd";
    targetFieldKey?: string;
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

1. **No `formId` in field objects** — Since fields are embedded in the form, the `formId` is implicit. The field response no longer includes a `formId` field.

2. **Field identifier** — Use `_id` to reference a specific field. The `fieldKey` can also be used as an alternative identifier for lookups.

3. **Getting form with fields** — When you fetch a form via `GET /forms/:formId`, the response includes the `fields` array directly. No separate API call needed.

4. **Public form schema** — `GET /public/forms/:slug/schema` returns fields without `logic` data (for security). `GET /public/forms/:slug/preview` returns fields with all data.

5. **Order is 1-based** — Field `order` starts at 1 and increments.