# Typeform API Documentation

**Base URL:** `http://localhost:5000/api/v1`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <accessToken>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Description of what happened",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": []
}
```

---

## Auth Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "viewer",
      "avatarUrl": ""
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "viewer",
      "avatarUrl": ""
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### POST /auth/google
Sign up or sign in with Google using a Google ID token.

**Request Body:**
```json
{
  "idToken": "google-id-token-here"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Google signup successful",
  "data": {
    "user": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "viewer",
      "avatarUrl": "https://lh3.googleusercontent.com/a-/photo.jpg"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### POST /auth/logout
Logout the current user (client-side token removal).

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": null
}
```

### POST /auth/refresh-token
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "user": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "viewer",
      "avatarUrl": ""
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### POST /auth/forgot-password
Send password reset link to email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If the email exists, a reset link has been sent",
  "data": null
}
```

### POST /auth/reset-password
Reset password using a reset token.

**Request Body:**
```json
{
  "token": "reset-token-uuid",
  "password": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful",
  "data": null
}
```

### POST /auth/verify-email
Verify email address using a verification token.

**Query Parameters:**
```
?token=verification-token-uuid
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": null
}
```

### GET /auth/me
Get the current authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "viewer",
    "avatarUrl": "",
    "isActive": true,
    "lastLoginAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### PATCH /auth/change-password
Change the current user's password.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "password123",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

---

## Users Endpoints

### GET /users/me
Get the current user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "viewer",
    "avatarUrl": "",
    "isActive": true,
    "lastLoginAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### PATCH /users/me
Update the current user's profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Jane Doe",
  "avatarUrl": "https://example.com/avatar.png"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Jane Doe",
    "email": "john@example.com",
    "role": "viewer",
    "avatarUrl": "https://example.com/avatar.png",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /users
Get all users (admin only).

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `sort` (string, default: "-createdAt")

**Response (200):**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "avatarUrl": "",
      "isActive": true,
      "lastLoginAt": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### GET /users/:id
Get a user by ID (admin only).

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Response (200):**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "avatarUrl": "",
    "isActive": true,
    "lastLoginAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### PATCH /users/:id
Update a user (admin only).

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "role": "editor",
  "isActive": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Updated Name",
    "email": "updated@example.com",
    "role": "editor",
    "avatarUrl": "",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### DELETE /users/:id
Delete a user (admin only).

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": null
}
```

### PATCH /users/:id/role
Update a user's role (admin only).

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User role updated successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "avatarUrl": "",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### PATCH /users/:id/status
Update a user's active status (admin only).

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Request Body:**
```json
{
  "isActive": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User status updated successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "viewer",
    "avatarUrl": "",
    "isActive": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Forms Endpoints

### POST /forms
Create a new form.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Customer Feedback Form"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Form created successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d2",
    "title": "Customer Feedback Form",
    "slug": "customer-feedback-form",
    "status": "draft",
    "theme": {
      "primaryColor": "#000000",
      "backgroundColor": "#ffffff",
      "textColor": "#111111"
    },
    "settings": {
      "oneQuestionAtATime": true,
      "showProgressBar": true,
      "allowMultipleSubmissions": true,
      "requireLogin": false,
      "collectIP": false
    },
    "createdBy": "65f1a2b3c4d5e6f7a8b9c0d1",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /forms
Get all forms for the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `sort` (string, default: "-createdAt")

**Response (200):**
```json
{
  "success": true,
  "message": "Forms retrieved successfully",
  "data": [
    {
      "id": "65f1a2b3c4d5e6f7a8b9c0d2",
      "title": "Customer Feedback Form",
      "slug": "customer-feedback-form",
      "status": "draft",
      "theme": { "primaryColor": "#000000", "backgroundColor": "#ffffff", "textColor": "#111111" },
      "settings": { "oneQuestionAtATime": true, "showProgressBar": true, "allowMultipleSubmissions": true, "requireLogin": false, "collectIP": false },
      "createdBy": "65f1a2b3c4d5e6f7a8b9c0d1",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /forms/:formId
Get a form by ID.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Form retrieved successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d2",
    "title": "Customer Feedback Form",
    "slug": "customer-feedback-form",
    "status": "draft",
    "theme": { "primaryColor": "#000000", "backgroundColor": "#ffffff", "textColor": "#111111" },
    "settings": { "oneQuestionAtATime": true, "showProgressBar": true, "allowMultipleSubmissions": true, "requireLogin": false, "collectIP": false },
    "createdBy": "65f1a2b3c4d5e6f7a8b9c0d1",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PATCH /forms/:formId
Update a form.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Updated Form Title"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Form updated successfully",
  "data": { ...form object... }
}
```

### DELETE /forms/:formId
Delete a form.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Form deleted successfully",
  "data": null
}
```

### PATCH /forms/:formId/duplicate
Duplicate a form.

**Headers:** `Authorization: Bearer <token>`

**Response (201):**
```json
{
  "success": true,
  "message": "Form duplicated successfully",
  "data": { ...new form object... }
}
```

### PATCH /forms/:formId/archive
Archive a form.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Form archived successfully",
  "data": { ...form with status: "archived"... }
}
```

### PATCH /forms/:formId/restore
Restore an archived form.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Form restored successfully",
  "data": { ...form with status: "draft"... }
}
```

### PATCH /forms/:formId/publish
Publish a form.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Form published successfully",
  "data": { ...form with status: "published"... }
}
```

### PATCH /forms/:formId/unpublish
Unpublish a form.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Form unpublished successfully",
  "data": { ...form with status: "draft"... }
}
```

### GET /forms/:formId/slug
Get the slug for a form.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Form slug retrieved successfully",
  "data": {
    "slug": "customer-feedback-form",
    "publicUrl": "/public/forms/customer-feedback-form"
  }
}
```

### PATCH /forms/:formId/settings
Update form settings.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "oneQuestionAtATime": false,
  "showProgressBar": true,
  "allowMultipleSubmissions": false,
  "requireLogin": true,
  "collectIP": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Form settings updated successfully",
  "data": { ...form object... }
}
```

### PATCH /forms/:formId/theme
Update form theme.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "primaryColor": "#3b82f6",
  "backgroundColor": "#f8fafc",
  "textColor": "#1e293b"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Form theme updated successfully",
  "data": { ...form object... }
}
```

### PATCH /forms/:formId/share
Update form share settings.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "isPublic": true,
  "password": "secret123",
  "expiresAt": "2025-12-31T23:59:59.000Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Form share settings updated successfully",
  "data": {
    "formId": "65f1a2b3c4d5e6f7a8b9c0d2",
    "publicUrl": "https://app.example.com/public/forms/customer-feedback-form",
    "isPublic": true,
    "password": "secret123",
    "expiresAt": "2025-12-31T23:59:59.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Form Pages Endpoints

**Architecture Note:** Form pages are now **embedded subdocuments** inside the Form document. They are NOT stored in a separate collection. All page operations use MongoDB's array update operators (`$push`, `$pull`, positional `$`) directly on the Form document's `pages` array.

### POST /forms/:formId/pages
Create a new page in a form.

**How it works:** The page object is pushed into the Form's `pages` array using MongoDB's `$push` operator. The `pageKey` is auto-generated (e.g., `page_abc12345`), and the `order` is auto-calculated (max existing order + 1).

**Headers:** `Authorization: Bearer <token>`

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

### GET /forms/:formId/pages
Get all active pages for a form.

**How it works:** Reads the `pages` array from the Form document and filters by `isActive: true`, sorted by `order`.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Pages retrieved successfully",
  "data": [
    { ...page object... }
  ]
}
```

### GET /forms/:formId/pages/:pageId
Get a specific page by ID or pageKey.

**How it works:** Uses MongoDB's positional projection (`"pages.$": 1`) to return only the matching subdocument from the Form's `pages` array. The `pageId` can be either the MongoDB `_id` of the embedded page or its `pageKey` string.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Page retrieved successfully",
  "data": { ...page object... }
}
```

### PATCH /forms/:formId/pages/:pageId
Update a page's properties.

**How it works:** Uses MongoDB's positional `$` operator to update specific pages of the matched subdocument (e.g., `{ $set: { "pages.$.label": "New label" } }`).

**Headers:** `Authorization: Bearer <token>`

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

### DELETE /forms/:formId/pages/:pageId
Delete a page from a form.

**How it works:** Uses MongoDB's `$pull` operator to remove the matching subdocument from the Form's `pages` array by its `_id`.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Page deleted successfully",
  "data": null
}
```

### PATCH /forms/:formId/pages/reorder
Reorder pages in a form.

**How it works:** Iterates over the provided `pageIds` array and updates each page's `order` value using MongoDB's positional `$` operator. The index in the array determines the new order (1-based).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "pageIds": ["65f1a2b3c4d5e6f7a8b9c0d4", "65f1a2b3c4d5e6f7a8b9c0d3", "65f1a2b3c4d5e6f7a8b9c0d5"]
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

### PATCH /forms/:formId/pages/:pageId/duplicate
Duplicate a page.

**How it works:** Reads the existing page from the Form's `pages` array, creates a copy with a new `pageKey`, appends "(copy)" to the label, and pushes it as a new subdocument with `$push`.

**Headers:** `Authorization: Bearer <token>`

**Response (201):**
```json
{
  "success": true,
  "message": "Page duplicated successfully",
  "data": { ...duplicated page object... }
}
```

### PATCH /forms/:formId/pages/:pageId/logic
Update page logic (conditional logic).

**How it works:** Uses MongoDB's positional `$` operator to update only the `logic` page of the matched subdocument: `{ $set: { "pages.$.logic": [...] } }`.

**Headers:** `Authorization: Bearer <token>`

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

**Response (200):**
```json
{
  "success": true,
  "message": "Page logic updated successfully",
  "data": { ...page object with updated logic... }
}
```

### DELETE /forms/:formId/pages/:pageId/logic
Delete page logic (set to empty array).

**How it works:** Uses MongoDB's positional `$` operator to set the `logic` page to an empty array: `{ $set: { "pages.$.logic": [] } }`.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Page logic deleted successfully",
  "data": { ...page object with empty logic... }
}
```

---

## Form Blocks (Sections) Endpoints

### POST /forms/:formId/blocks
Create a new block/section in a form.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Personal Information",
  "type": "section"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Block created successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d6",
    "formId": "65f1a2b3c4d5e6f7a8b9c0d2",
    "title": "Personal Information",
    "type": "section",
    "order": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /forms/:formId/blocks
Get all blocks for a form.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Blocks retrieved successfully",
  "data": [ { ...block object... } ]
}
```

### PATCH /forms/:formId/blocks/:blockId
Update a block.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Updated Section Title"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Block updated successfully",
  "data": { ...updated block object... }
}
```

### DELETE /forms/:formId/blocks/:blockId
Delete a block.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Block deleted successfully",
  "data": null
}
```

### PATCH /forms/:formId/blocks/reorder
Reorder blocks in a form.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "blockIds": ["65f1a2b3c4d5e6f7a8b9c0d6", "65f1a2b3c4d5e6f7a8b9c0d7"]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Blocks reordered successfully",
  "data": null
}
```

---

## Form Logic (Conditions) Endpoints

### POST /forms/:formId/logic
Create form-level logic.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "conditions": [
    {
      "pageKey": "page_abc123",
      "operator": "equals",
      "value": "Yes"
    }
  ],
  "actions": [
    {
      "action": "goToPage",
      "target": "page_def456"
    }
  ]
}
```

**Operators:** `equals`, `notEquals`, `contains`, `greaterThan`, `lessThan`

**Actions:** `show`, `hide`, `goToPage`, `goToEnd`, `skipTo`

**Response (201):**
```json
{
  "success": true,
  "message": "Logic created successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d8",
    "formId": "65f1a2b3c4d5e6f7a8b9c0d2",
    "conditions": [ { "pageKey": "page_abc123", "operator": "equals", "value": "Yes" } ],
    "actions": [ { "action": "goToPage", "target": "page_def456" } ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /forms/:formId/logic
Get all logic for a form.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Logics retrieved successfully",
  "data": [ { ...logic object... } ]
}
```

### PATCH /forms/:formId/logic/:logicId
Update a logic rule.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "conditions": [
    { "pageKey": "page_abc123", "operator": "equals", "value": "No" }
  ],
  "actions": [
    { "action": "goToEnd" }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logic updated successfully",
  "data": { ...updated logic object... }
}
```

### DELETE /forms/:formId/logic/:logicId
Delete a logic rule.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Logic deleted successfully",
  "data": null
}
```

---

## Responses Endpoints

### GET /forms/:formId/responses
Get all responses for a form.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `sort` (string, default: "-createdAt")

**Response (200):**
```json
{
  "success": true,
  "message": "Responses retrieved successfully",
  "data": [
    {
      "id": "65f1a2b3c4d5e6f7a8b9c0d9",
      "formId": "65f1a2b3c4d5e6f7a8b9c0d2",
      "respondentId": null,
      "sessionId": "session_1704067200000",
      "answers": [
        {
          "pageKey": "page_abc123",
          "label": "What is your name?",
          "type": "shortText",
          "value": "John Doe"
        }
      ],
      "metadata": {
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "referrer": "https://example.com",
        "country": "",
        "city": ""
      },
      "submittedAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /forms/:formId/responses/:responseId
Get a specific response by ID.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Response retrieved successfully",
  "data": { ...response object... }
}
```

### DELETE /forms/:formId/responses/:responseId
Delete a response.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Response deleted successfully",
  "data": null
}
```

### PATCH /forms/:formId/responses/:responseId
Update a response.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "answers": [
    {
      "pageKey": "page_abc123",
      "label": "What is your name?",
      "type": "shortText",
      "value": "Jane Doe"
    }
  ],
  "metadata": {
    "ipAddress": "10.0.0.1",
    "userAgent": "Mozilla/5.0...",
    "referrer": "https://google.com"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Response updated successfully",
  "data": { ...updated response object... }
}
```

### GET /forms/:formId/responses/export
Export responses in a specific format.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `format` (string: "json" | "csv", default: "json")

**Response (200):**
```json
{
  "success": true,
  "message": "Responses exported successfully",
  "data": {
    "format": "json",
    "count": 1,
    "responses": [ { ...response object... } ]
  }
}
```

### GET /forms/:formId/responses/stats
Get response statistics.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Response stats retrieved successfully",
  "data": {
    "totalResponses": 150,
    "uniqueRespondents": 120,
    "todayResponses": 15,
    "averageCompletionTime": 120,
    "completionRate": 85.5
  }
}
```

### GET /forms/:formId/responses/summary
Get response summary.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Response summary retrieved successfully",
  "data": {
    "totalResponses": 150,
    "pages": [
      {
        "pageKey": "page_abc123",
        "label": "What is your name?",
        "type": "shortText",
        "answerCount": 150,
        "uniqueAnswers": 148
      }
    ]
  }
}
```

### PATCH /forms/:formId/responses/:responseId/mark-read
Mark a response as read.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Response marked as read",
  "data": { ...response object... }
}
```

### PATCH /forms/:formId/responses/:responseId/mark-unread
Mark a response as unread.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Response marked as unread",
  "data": { ...response object... }
}
```

### PATCH /forms/:formId/responses/:responseId/star
Star a response.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Response starred",
  "data": { ...response object... }
}
```

### PATCH /forms/:formId/responses/:responseId/unstar
Unstar a response.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Response unstarred",
  "data": { ...response object... }
}
```

---

## Public Form Endpoints

### GET /public/forms/:slug
Get a published form by slug (public, no auth).

**Response (200):**
```json
{
  "success": true,
  "message": "Form retrieved successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d2",
    "title": "Customer Feedback Form",
    "slug": "customer-feedback-form",
    "status": "published",
    "theme": { "primaryColor": "#000000", "backgroundColor": "#ffffff", "textColor": "#111111" },
    "settings": {
      "oneQuestionAtATime": true,
      "showProgressBar": true,
      "allowMultipleSubmissions": true,
      "requireLogin": false,
      "general": {
        "show_progress_bar": true,
        "initial_loader": true,
        "navigation_arrows": true,
        "refill_link": { "isActive": false, "link": "" },
        "show_powered_by_company_name": true,
        "anonymous_survey": false
      },
      "variables": [
        { "name": "score", "type": "number", "value": 0 },
        { "name": "price", "type": "number", "value": 0 }
      ]
    },
    "createdBy": "65f1a2b3c4d5e6f7a8b9c0d1",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /public/forms/:slug/schema
Get form schema with pages (public, no auth).

**Response (200):**
```json
{
  "success": true,
  "message": "Form schema retrieved successfully",
  "data": {
    "form": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d2",
      "title": "Customer Feedback Form",
      "settings": {
        "oneQuestionAtATime": true,
        "showProgressBar": true,
        "allowMultipleSubmissions": true,
        "requireLogin": false,
        "general": {
          "show_progress_bar": true,
          "initial_loader": true,
          "navigation_arrows": true,
          "refill_link": { "isActive": false, "link": "" },
          "show_powered_by_company_name": true,
          "anonymous_survey": false
        },
        "variables": [
          { "name": "score", "type": "number", "value": 0 },
          { "name": "price", "type": "number", "value": 0 }
        ]
      }
    },
    "pages": [ { ...page object... } ]
  }
}
```

### GET /public/forms/:slug/theme
Get form theme (public, no auth).

**Response (200):**
```json
{
  "success": true,
  "message": "Form theme retrieved successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d2",
    "title": "Customer Feedback Form",
    "theme": { "primaryColor": "#000000", "backgroundColor": "#ffffff", "textColor": "#111111" }
  }
}
```

### GET /public/forms/:slug/preview
Get form preview with all pages (public, no auth).

**Response (200):**
```json
{
  "success": true,
  "message": "Form preview retrieved successfully",
  "data": {
    "form": { ...form object... },
    "pages": [ { ...page object... } ]
  }
}
```

### POST /public/forms/:slug/submit
Submit a form response (public, no auth, rate-limited).

**Request Body:**
```json
{
  "answers": [
    {
      "pageKey": "page_abc123",
      "label": "What is your name?",
      "type": "shortText",
      "value": "John Doe"
    },
    {
      "pageKey": "page_def456",
      "label": "Email address",
      "type": "email",
      "value": "john@example.com"
    }
  ],
  "sessionId": "session_1704067200000"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Form submitted successfully",
  "data": {
    "submissionId": "65f1a2b3c4d5e6f7a8b9c0d9",
    "message": "Form submitted successfully"
  }
}
```

### POST /public/forms/:slug/save-draft
Save a form submission as draft (public, no auth).

**Request Body:**
```json
{
  "answers": [
    {
      "pageKey": "page_abc123",
      "label": "What is your name?",
      "type": "shortText",
      "value": "John Doe"
    }
  ],
  "sessionId": "draft_1704067200000"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Draft saved successfully",
  "data": {
    "submissionId": "65f1a2b3c4d5e6f7a8b9c0d9",
    "sessionId": "draft_1704067200000",
    "message": "Draft saved successfully"
  }
}
```

### GET /public/forms/:slug/submit-status/:submissionId
Check submission status (public, no auth).

**Response (200):**
```json
{
  "success": true,
  "message": "Submission status retrieved successfully",
  "data": {
    "submissionId": "65f1a2b3c4d5e6f7a8b9c0d9",
    "submittedAt": "2024-01-01T00:00:00.000Z",
    "status": "completed"
  }
}
```

---

## Analytics Endpoints

### GET /forms/:formId/analytics
Get overall analytics for a form.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "formId": "65f1a2b3c4d5e6f7a8b9c0d2",
    "formTitle": "Customer Feedback Form",
    "totalViews": 500,
    "totalSubmissions": 150,
    "conversionRate": "30.00"
  }
}
```

### GET /forms/:formId/analytics/overview
Get analytics overview.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "totalResponses": 150,
    "todayResponses": 15,
    "totalPages": 5,
    "averageResponsesPerDay": "5.0"
  }
}
```

### GET /forms/:formId/analytics/views
Get form views analytics.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "formId": "65f1a2b3c4d5e6f7a8b9c0d2",
    "views": 0,
    "uniqueVisitors": 0
  }
}
```

### GET /forms/:formId/analytics/submissions
Get recent submissions analytics.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "total": 100,
    "submissions": [
      { "submittedAt": "2024-01-01T00:00:00.000Z" }
    ]
  }
}
```

### GET /forms/:formId/analytics/conversion
Get conversion analytics.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "formId": "65f1a2b3c4d5e6f7a8b9c0d2",
    "views": 150,
    "submissions": 150,
    "conversionRate": "0",
    "dropOffRate": "0"
  }
}
```

### GET /forms/:formId/analytics/dropoff
Get page dropoff analytics.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "formId": "65f1a2b3c4d5e6f7a8b9c0d2",
    "dropoffData": [
      {
        "pageId": "65f1a2b3c4d5e6f7a8b9c0d3",
        "pageKey": "page_abc123",
        "label": "What is your name?",
        "reached": 150,
        "answered": 145,
        "dropoff": 3.33
      }
    ]
  }
}
```

### GET /forms/:formId/analytics/page/:pageId
Get analytics for a specific page.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "page": { ...page object... },
    "totalResponses": 145,
    "answers": [
      {
        "pageKey": "page_abc123",
        "label": "What is your name?",
        "type": "shortText",
        "value": "John Doe"
      }
    ]
  }
}
```

---

## Dashboard Endpoints (Admin Only)

### GET /dashboard/overview
Get dashboard overview statistics.

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "totalForms": 50,
    "totalResponses": 5000,
    "totalUsers": 200,
    "recentForms": [
      {
        "id": "65f1a2b3c4d5e6f7a8b9c0d2",
        "title": "Customer Feedback Form",
        "status": "published",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### GET /dashboard/forms
Get recent forms for dashboard.

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": [ { ...form object with createdBy populated... } ]
}
```

### GET /dashboard/responses
Get response statistics for dashboard.

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "total": 5000,
    "today": 150,
    "thisWeek": 1000,
    "thisMonth": 4500
  }
}
```

### GET /dashboard/users
Get user statistics for dashboard.

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "total": 200,
    "active": 180,
    "admins": 5,
    "editors": 0,
    "viewers": 0
  }
}
```

### GET /dashboard/activity
Get recent activity for dashboard.

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "65f1a2b3c4d5e6f7a8b9c0d9",
      "formId": { "title": "Customer Feedback Form" },
      "submittedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## Uploads Endpoints

### POST /uploads
Upload a file.

**Headers:** `Authorization: Bearer <token>`

**Form Data:**
```
file: <binary file data>
```

**Allowed file types:** jpg, jpeg, png, gif, webp, pdf, doc, docx, csv, xlsx

**Response (201):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "fileId": "65f1a2b3-c4d5-e6f7-a8b9-c0d1e2f3a4b5",
    "filename": "document.pdf",
    "mimeType": "application/pdf",
    "size": 102400,
    "url": "/api/v1/uploads/65f1a2b3-c4d5-e6f7-a8b9-c0d1e2f3a4b5"
  }
}
```

### GET /uploads/:fileId
Get/download a file (public, no auth).

**Response:** Binary file content with appropriate Content-Type header.

### DELETE /uploads/:fileId
Delete a file.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "File deleted successfully",
  "data": null
}
```

---

## Notifications Endpoints

### GET /notifications
Get all notifications for the current user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": [
    {
      "id": 1,
      "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
      "title": "New form submission",
      "message": "Your form received a new submission",
      "read": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### PATCH /notifications/:id/read
Mark a notification as read.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": { ...notification object... }
}
```

### PATCH /notifications/read-all
Mark all notifications as read.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": null
}
```

### DELETE /notifications/:id
Delete a notification.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Notification deleted successfully",
  "data": null
}
```

---

## Workspaces Endpoints

### POST /workspaces
Create a new workspace.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Marketing Team",
  "description": "Workspace for marketing team projects"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Workspace created successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0da",
    "name": "Marketing Team",
    "description": "Workspace for marketing team projects",
    "createdBy": "65f1a2b3c4d5e6f7a8b9c0d1",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /workspaces
Get all workspaces for the current user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Workspaces retrieved successfully",
  "data": [ { ...workspace object... } ]
}
```

### GET /workspaces/:workspaceId
Get a workspace by ID.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Workspace retrieved successfully",
  "data": { ...workspace object... }
}
```

### PATCH /workspaces/:workspaceId
Update a workspace.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Updated Workspace Name",
  "description": "Updated description"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Workspace updated successfully",
  "data": { ...updated workspace object... }
}
```

### DELETE /workspaces/:workspaceId
Delete a workspace.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Workspace deleted successfully",
  "data": null
}
```

### POST /workspaces/:workspaceId/members
Add a member to a workspace.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
  "role": "editor"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Member added successfully",
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0db",
    "workspaceId": "65f1a2b3c4d5e6f7a8b9c0da",
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "role": "editor",
    "joinedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /workspaces/:workspaceId/members
Get all members of a workspace.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Members retrieved successfully",
  "data": [ { ...member object... } ]
}
```

### PATCH /workspaces/:workspaceId/members/:memberId
Update a workspace member's role.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Member updated successfully",
  "data": { ...updated member object... }
}
```

### DELETE /workspaces/:workspaceId/members/:memberId
Remove a member from a workspace.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Member removed successfully",
  "data": null
}
```

---

## Data Models

### User
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  provider: "email" | "google";
  avatarUrl: string;
  role: "admin" | "editor" | "viewer";
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Form
```typescript
interface Form {
  id: string;
  title: string;
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
  pages: FormPage[];
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Note:** FormPages are now embedded subdocuments within the Form document. They are not stored as a separate collection.

### FormPage (embedded in Form)
```typescript
interface FormPage {
  _id: string;
  pageKey: string;
  label: string;
  helperText: string;
  placeholder: string;
  type: "shortText" | "longText" | "email" | "phone" | "number" | "date" | "time" | "radio" | "checkbox" | "select" | "multiSelect" | "file" | "rating" | "yesNo" | "url";
  required: boolean;
  order: number;
  options: { label?: string; value?: string }[];
  validation: { minLength?: number; maxLength?: number; min?: number; max?: number; pattern?: string; message?: string };
  logic: { whenPageKey?: string; operator?: string; value?: any; action?: string; targetPageKey?: string }[];
  appearance: { width: "full" | "half"; icon: string };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### FormResponse
```typescript
interface FormResponse {
  id: string;
  formId: string;
  respondentId?: string;
  sessionId: string;
  answers: { pageKey: string; label: string; type: string; value: any }[];
  metadata: { ipAddress: string; userAgent: string; referrer: string; country: string; city: string };
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### FormShare
```typescript
interface FormShare {
  id: string;
  formId: string;
  publicUrl: string;
  isPublic: boolean;
  password: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Workspace
```typescript
interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Roles

| Role | Description |
|------|-------------|
| `admin` | Full access to all endpoints |
| `editor` | Can create/edit forms, manage responses |
| `viewer` | Read-only access to forms and responses |

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |</arg_value>
</write_to_file>