# End Page API & Property Documentation

**Base URL:** `http://localhost:5000/api/v1`

---

## 1. Overview & Architecture

Each Form can contain multiple **End Pages** (Thank You / Completion screens) embedded directly in the form schema (`endPages` array).

- **Multiplicity:** A form can have multiple end pages, sorted by `order`.
- **Automatic Initialization:** When a user creates a new form via `POST /api/v1/forms`, a default **Statement page** and a default **End page** are automatically added.
- **Embedded CRUD Operations:** End pages are managed directly through the `/api/v1/forms/:formId/end-pages` endpoints.

---

## 2. End Page Schema & Properties Reference

Below is the complete TypeScript interface and description of every property on an End Page object:

### TypeScript Interface

```typescript
export interface ICoverImage {
  url: string;
  fileId?: string;
  alt?: string;
}

export type EmbedProvider = "youtube" | "loom" | "vimeo" | "pdf" | "image" | "other";

export interface IEndPageEmbed {
  /** Any embeddable link (YouTube, Loom, Vimeo, PDF URL, etc.) */
  url: string;
  /** Embed provider identifier */
  provider?: EmbedProvider;
  /** Optional title for the embed */
  title?: string;
}

export interface IEndPageButton {
  /** Text displayed on the primary call-to-action button */
  text: string;
  /** URL / external link the button navigates to */
  link: string;
}

export interface IEndPageRedirect {
  /** Whether to automatically redirect the user upon reaching the end page */
  isRedirect: boolean;
  /** Destination URL to redirect to */
  link: string;
}

export interface IEndPageSocialShareMedia {
  facebook: boolean;
  twitter: boolean;
  linkedin: boolean;
  whatsapp?: boolean;
}

export type ContentAlignment = "left" | "center" | "right";

export interface IEndPage {
  /** MongoDB subdocument ID */
  _id?: string;
  /** Unique client/page key (e.g. "end_page_k8s9d2a1") */
  key?: string;
  /** Main heading / title of the end page */
  title: string;
  /** Descriptive message or subtitle */
  helperText?: string;
  /** Backward-compatible message field (matches helperText) */
  paragraph?: string;
  /** Optional cover image */
  coverImage?: ICoverImage;
  /** Media embed (video, PDF, etc.) */
  embed?: IEndPageEmbed;
  /** Text and content alignment: "left" | "center" | "right" */
  alignment: ContentAlignment;
  /** Call-to-action button */
  button: IEndPageButton;
  /** Auto-redirect settings */
  redirect: IEndPageRedirect;
  /** Trigger a confetti animation when page mounts */
  showConfetti: boolean;
  /** Whether social share buttons are enabled */
  socialShareButtons: boolean;
  /** Pre-filled message for social sharing */
  socialShareMessage: string;
  /** Enabled social share channels */
  socialShareMedia: IEndPageSocialShareMedia;
  /** Display order (1-indexed) */
  order: number;
  /** Timestamps */
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
```

---

## 3. Detailed Property Breakdown

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `string` | Auto-generated | MongoDB ObjectId of the end page subdocument. |
| `key` | `string` | `end_page_<nanoid>` | Client-side identifier for keying components. |
| `title` | `string` | `"Thank you!"` | Primary headline displayed to respondent. |
| `helperText` | `string` | `"Your response has been submitted..."` | Subtitle/description text under the title. |
| `paragraph` | `string` | Matches `helperText` | Alias for `helperText` for backwards compatibility. |
| `alignment` | `"left"` \| `"center"` \| `"right"` | `"left"` | Alignment of title, helper text, and button. |
| `coverImage` | `object` \| `undefined` | `undefined` | Optional top banner / cover image `{ url, fileId, alt }`. |
| `embed` | `object` | `{ url: "" }` | Embed media `{ url, provider, title }` (Loom, YouTube, Vimeo, PDF). |
| `button` | `object` | `{ text: "Create your own form", link: "<FRONTEND_URL>" }` | Call-to-action button `{ text, link }`. |
| `redirect` | `object` | `{ isRedirect: false, link: "" }` | Auto-redirect `{ isRedirect, link }`. If `isRedirect: true`, frontend redirects to `link`. |
| `showConfetti` | `boolean` | `false` | If `true`, frontend should trigger confetti celebration animation. |
| `socialShareButtons` | `boolean` | `false` | If `true`, show social share icon buttons. |
| `socialShareMessage` | `string` | `""` | Text prefilled when sharing via social platforms. |
| `socialShareMedia` | `object` | `{ facebook: false, twitter: false, linkedin: false, whatsapp: false }` | Specific social platform toggles. |
| `order` | `number` | `1` | Order position among multiple end pages. |

---

## 4. End Page CRUD API Endpoints

All CRUD operations require authentication: `Authorization: Bearer <token>`.

### 1. Update an End Page
Updates any property of an existing end page (e.g. `showConfetti`, `title`, `button`, `redirect`, etc.).

- **Method:** `PATCH`
- **Path:** `/api/v1/forms/:formId/end-pages/:endPageId`
- **Request Body (any subset of properties):**
```json
{
  "showConfetti": true,
  "title": "Thank you for your feedback!",
  "helperText": "We appreciate your time.",
  "button": {
    "text": "Visit our website",
    "link": "https://example.com"
  },
  "redirect": {
    "isRedirect": false,
    "link": ""
  },
  "socialShareButtons": true,
  "socialShareMedia": {
    "facebook": true,
    "twitter": true,
    "linkedin": true,
    "whatsapp": true
  }
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "message": "End page updated successfully",
  "data": {
    "endPage": {
      "_id": "6a89fab3d332d8cdf6446d68",
      "key": "end_page_m1n2o3p4",
      "title": "Thank you for your feedback!",
      "helperText": "We appreciate your time.",
      "paragraph": "We appreciate your time.",
      "button": {
        "text": "Visit our website",
        "link": "https://example.com"
      },
      "redirect": {
        "isRedirect": false,
        "link": ""
      },
      "alignment": "left",
      "showConfetti": true,
      "socialShareButtons": true,
      "socialShareMessage": "",
      "socialShareMedia": {
        "facebook": true,
        "twitter": true,
        "linkedin": true,
        "whatsapp": true
      },
      "embed": {
        "url": ""
      },
      "order": 1,
      "createdAt": "2026-08-23T01:00:00.000Z",
      "updatedAt": "2026-08-23T02:00:00.000Z"
    },
    "hasUnpublishedChanges": true
  }
}
```

---

### 2. Create an End Page
Adds a new end page to the form.

- **Method:** `POST`
- **Path:** `/api/v1/forms/:formId/end-pages`
- **Request Body:**
```json
{
  "title": "Thank you!",
  "helperText": "Your submission has been received.",
  "showConfetti": true,
  "button": {
    "text": "Back to Home",
    "link": "https://example.com"
  }
}
```
- **Response (`201 Created`):**
```json
{
  "success": true,
  "message": "End page created successfully",
  "data": {
    "endPage": {
      "_id": "6a89fab3d332d8cdf6446d70",
      "key": "end_page_k8s9d2a1",
      "title": "Thank you!",
      "helperText": "Your submission has been received.",
      "paragraph": "Your submission has been received.",
      "button": {
        "text": "Back to Home",
        "link": "https://example.com"
      },
      "redirect": {
        "isRedirect": false,
        "link": ""
      },
      "alignment": "left",
      "showConfetti": true,
      "socialShareButtons": false,
      "socialShareMessage": "",
      "socialShareMedia": {
        "facebook": false,
        "twitter": false,
        "linkedin": false,
        "whatsapp": false
      },
      "embed": {
        "url": ""
      },
      "order": 2
    },
    "hasUnpublishedChanges": true
  }
}
```

---

### 3. Get All End Pages of a Form
- **Method:** `GET`
- **Path:** `/api/v1/forms/:formId/end-pages`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "message": "End pages retrieved successfully",
  "data": [
    {
      "_id": "6a89fab3d332d8cdf6446d68",
      "key": "end_page_m1n2o3p4",
      "title": "Thank you!",
      "order": 1
    }
  ]
}
```

---

### 4. Get End Page by ID
- **Method:** `GET`
- **Path:** `/api/v1/forms/:formId/end-pages/:endPageId`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "message": "End page retrieved successfully",
  "data": {
    "_id": "6a89fab3d332d8cdf6446d68",
    "key": "end_page_m1n2o3p4",
    "title": "Thank you!",
    "helperText": "Your response has been submitted.",
    "button": { "text": "Create your own form", "link": "http://localhost:5173" },
    "showConfetti": true,
    "order": 1
  }
}
```

---

### 5. Delete an End Page
- **Method:** `DELETE`
- **Path:** `/api/v1/forms/:formId/end-pages/:endPageId`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "message": "End page deleted successfully",
  "data": {
    "hasUnpublishedChanges": true
  }
}
```

---

### 6. Reorder End Pages
- **Method:** `PATCH`
- **Path:** `/api/v1/forms/:formId/end-pages/reorder`
- **Request Body:**
```json
{
  "endPageIds": ["6a89fab3d332d8cdf6446d70", "6a89fab3d332d8cdf6446d68"]
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "message": "End pages reordered successfully",
  "data": {
    "endPages": [ ... ],
    "hasUnpublishedChanges": true
  }
}
```

---

### 7. Duplicate an End Page
- **Method:** `PATCH`
- **Path:** `/api/v1/forms/:formId/end-pages/:endPageId/duplicate`
- **Response (`201 Created`):**
```json
{
  "success": true,
  "message": "End page duplicated successfully",
  "data": {
    "endPage": {
      "_id": "6a89fab3d332d8cdf6446d75",
      "key": "end_page_ab12cd34",
      "title": "Thank you! (copy)",
      "order": 2
    },
    "hasUnpublishedChanges": true
  }
}
```

---

## 5. Form & Public Endpoints Returning End Pages

### 1. Create a Form (Auto-Generates Statement + End Page)
- **Method:** `POST`
- **Path:** `/api/v1/forms`
- **Response (`201 Created`):** Returns the form draft with `pages` and `endPages`.

### 2. Get Form Details (Admin / Builder)
- **Method:** `GET`
- **Path:** `/api/v1/forms/:formId`

### 3. Get Public Form Schema (Respondent View)
- **Method:** `GET`
- **Path:** `/api/v1/public/forms/:slugOrId/schema`
- **Response (`200 OK`):** Returns published `pages` and `endPages`.

### 4. Get Form Preview
- **Method:** `GET`
- **Path:** `/api/v1/public/forms/:slugOrId/preview`

---

## 6. Frontend Implementation Guide

### A. Rendering the End Page After Submission
When respondent answers the last page and submits the response (`POST /api/v1/public/forms/:slugOrId/submit`):

1. **Select End Page:**
```typescript
const endPage = formSchema.endPages?.[0];
```

2. **Confetti Trigger:**
If `endPage.showConfetti === true`, trigger a confetti burst on mount (e.g. `canvas-confetti`):
```typescript
import confetti from "canvas-confetti";

useEffect(() => {
  if (endPage?.showConfetti) {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}, [endPage]);
```

3. **Auto-Redirect:**
If `endPage.redirect?.isRedirect === true` and `endPage.redirect?.link` is present:
```typescript
useEffect(() => {
  if (endPage?.redirect?.isRedirect && endPage?.redirect?.link) {
    const timer = setTimeout(() => {
      window.location.href = endPage.redirect.link;
    }, 2000); // 2 second pause before redirect
    return () => clearTimeout(timer);
  }
}, [endPage]);
```

4. **Action Button:**
```tsx
{endPage.button?.text && (
  <a
    href={endPage.button.link || "#"}
    target="_blank"
    rel="noopener noreferrer"
    className="btn-primary"
  >
    {endPage.button.text}
  </a>
)}
```

5. **Social Share Links Generation:**
```typescript
const shareUrl = encodeURIComponent(window.location.href);
const shareText = encodeURIComponent(endPage.socialShareMessage || "Check out this form!");

const shareLinks = {
  facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
  twitter: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`,
  linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
  whatsapp: `https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`,
};
```
