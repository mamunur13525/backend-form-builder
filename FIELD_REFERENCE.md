# Page Reference Guide

This document shows where the `title` page is used across the project. Use this as a reference when you need to modify or rename the title page.

---

## Forms Module

### Model & Schema
- **`src/models/Form.ts`**
  - Line 53: `IForm` interface - `title: string;`
  - Line 152: Mongoose schema - `title: { type: String, required: true }`

### Types
- **`src/modules/forms/form.types.ts`**
  - Line 2: `CreateFormBody` interface - `title: string;`
  - Line 7: `UpdateFormBody` interface - `title?: string;`
  - Line 33: `FormResponse` interface - `title: string;`

### Validation
- **`src/modules/forms/form.validation.ts`**
  - Line 5: `createFormSchema` - `title: z.string().min(1, "Title is required").max(200)`
  - Line 12: `updateFormSchema` - `title: z.string().min(1).max(200).optional()`

### Service
- **`src/modules/forms/form.service.ts`**
  - Line 17: `toFormResponse()` - `title: form.title`
  - Line 34: `createForm()` - `generateUniqueSlug(data.title, ...)`
  - Line 36: `createForm()` - `title: data.title`
  - Line 98: `duplicateForm()` - `${original.title} (copy)`
  - Line 103: `duplicateForm()` - `title: \`${original.title} (copy)\``

### Repository
- **`src/modules/forms/form.repository.ts`**
  - Line 6: `createForm()` parameter - `title: string;`

### Public Form Service
- **`src/modules/public-form/public-form.service.ts`**
  - Line 34: `getFormSchema()` - `title: form.title`
  - Line 44: `getFormTheme()` - `.select("theme title")`

---

## Blocks Module (Form Sections)

### Types
- **`src/modules/blocks/block.types.ts`**
  - Line 2: `CreateBlockBody` interface - `title?: string;`
  - Line 7: `UpdateBlockBody` interface - `title?: string;`
  - Line 13: `IBlock` interface (repository) - `title: string;`

### Validation
- **`src/modules/blocks/block.validation.ts`**
  - Line 4: `createBlockSchema` - `title: z.string().max(200).optional()`
  - Line 11: `updateBlockSchema` - `title: z.string().max(200).optional()`

### Service
- **`src/modules/blocks/block.service.ts`**
  - Line 10: `createBlock()` - `title: data.title || ""`

### Repository
- **`src/modules/blocks/block.repository.ts`**
  - Line 6: `IBlock` interface - `title: string;`
  - Line 18: Mongoose schema - `title: { type: String, default: "" }`
  - Line 35: `createBlock()` parameter - `title: string;`

---

## Utilities

### Slug Generation
- **`src/utils/slug.ts`**
  - Line 1: `generateSlug()` parameter - `title: string`
  - Line 7: `generateUniqueSlug()` parameter - `title: string`
  - Line 12: `generateSlug(title)` usage
  - Line 16: `generateSlug(title)` usage

---

## Analytics & Dashboard

### Analytics Controller
- **`src/modules/analytics/analytics.controller.ts`**
  - Line 4: `.select("title createdAt")`
  - Line 12: `formTitle: form?.title`

### Dashboard Controller
- **`src/modules/dashboard/dashboard.controller.ts`**
  - Line 5: `.select("title status createdAt")`
  - Line 12: `.populate("formId", "title")`

---

## Tests

### API Tests
- **`src/tests/api.test.ts`**
  - Line 74: Form creation - `title: "Test Form"`
  - Line 79: Assertion - `expect(res.body.data.title).toBe("Test Form")`
  - Line 98: Form update - `title: "Updated Form"`
  - Line 103: Assertion - `expect(res.body.data.title).toBe("Updated Form")`

---

## Documentation

### API Documentation
- **`API_DOCUMENTATION.md`**
  - Multiple locations showing form and block examples with title page
  - Request/response examples for all form endpoints
  - Request/response examples for all block endpoints

---

## Summary

**Total Files with Title Page: 15 files**

### If you want to rename 'title' to something else (e.g., 'name'):

1. **Models** (2 files)
   - `src/models/Form.ts`
   - `src/modules/blocks/block.repository.ts`

2. **Types** (3 files)
   - `src/modules/forms/form.types.ts`
   - `src/modules/blocks/block.types.ts`

3. **Validation** (2 files)
   - `src/modules/forms/form.validation.ts`
   - `src/modules/blocks/block.validation.ts`

4. **Services** (3 files)
   - `src/modules/forms/form.service.ts`
   - `src/modules/blocks/block.service.ts`
   - `src/modules/public-form/public-form.service.ts`

5. **Repositories** (2 files)
   - `src/modules/forms/form.repository.ts`
   - `src/modules/blocks/block.repository.ts`

6. **Controllers** (2 files)
   - `src/modules/analytics/analytics.controller.ts`
   - `src/modules/dashboard/dashboard.controller.ts`

7. **Utilities** (1 file)
   - `src/utils/slug.ts`

8. **Tests** (1 file)
   - `src/tests/api.test.ts`

9. **Documentation** (1 file)
   - `API_DOCUMENTATION.md`

---

## Quick Change Instructions

When you want to change 'title' to a new name, tell me:
- "Change title to [new-name] in forms only"
- "Change title to [new-name] in blocks only"
- "Change title to [new-name] everywhere"

I will update all the files listed above accordingly.