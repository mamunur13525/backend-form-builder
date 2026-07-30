# Publish Form API

## Base URL
```
http://localhost:5000/api/v1
```

---

## 1. Publish Form

**PATCH** `/forms/:formId/publish`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "form-id",
    "status": "published"
  }
}
```

---

## 2. Unpublish Form

**PATCH** `/forms/:formId/unpublish`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "form-id",
    "status": "draft"
  }
}
```

---

## 3. Get Shareable Link

**GET** `/forms/:formId/slug`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "slug": "form-slug",
    "publicUrl": "/public/forms/form-slug"
  }
}
```

---

## Status Values

- `draft` - Form is being edited
- `published` - Form is live and accepting responses
- `archived` - Form is archived

---

## Quick Implementation

```javascript
// Publish
const res = await fetch(`/forms/${formId}/publish`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await res.json();
setFormStatus(data.status); // "published"

// Unpublish
const res = await fetch(`/forms/${formId}/unpublish`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await res.json();
setFormStatus(data.status); // "draft"

// Get link
const res = await fetch(`/forms/${formId}/slug`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await res.json();
console.log(data.publicUrl); // Use this to share
```

---

## Notes

- No request body needed for publish/unpublish
- Check `data.status` to update UI
- Publishing doesn't auto-enable public access (use share settings)