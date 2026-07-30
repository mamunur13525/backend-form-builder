# PRD: Draft & Publish Versioning System

## Feature Overview

Implement a **Draft & Publish** workflow for the Form Builder that allows administrators to safely edit a form without affecting the live version that respondents are currently using.

The public form should always display the latest published version. Any edits made by the admin remain in a draft until explicitly published.

---

# Goals

- Prevent unfinished edits from appearing on the live form.
- Allow admins to continuously improve forms.
- Support safe publishing.
- Support discarding unpublished changes.
- Preserve version history.
- Associate every response with the form version it was submitted against.

---

# User Stories

## Admin

- Create a form.
- Publish a form.
- Edit a published form.
- Continue editing without affecting respondents.
- Know when unpublished changes exist.
- Publish changes.
- Discard unpublished changes.
- View version history (future).

## Respondent

- Always see the latest published form.
- Never see draft changes.
- Submit responses against the exact version they opened.

---

# Architecture

```
Form
 ├── draftVersionId
 └── publishedVersionId
         │
         ▼
FormVersion
 ├── Version 1
 ├── Version 2
 ├── Version 3
```

The Form document stores only metadata and pointers.

The complete form schema is stored inside immutable FormVersion documents.

---

# Database Design

## forms

```ts
{
    _id: ObjectId,

    workspaceId: ObjectId,

    title: string,

    slug: string,

    status: "draft" | "published",

    draftVersionId: ObjectId,

    publishedVersionId: ObjectId | null,

    hasUnpublishedChanges: boolean,

    createdAt: Date,

    updatedAt: Date
}
```

---

## form_versions

```ts
{
    _id: ObjectId,

    formId: ObjectId,

    version: Number,

    schema: {
        fields: [],
        settings: {}
    },

    createdBy: ObjectId,

    createdAt: Date
}
```

The schema contains the complete form definition.

FormVersion documents are immutable.

Never update an existing version.

---

## form_responses

```ts
{
    _id: ObjectId,

    formId: ObjectId,

    formVersionId: ObjectId,

    answers: [],

    submittedAt: Date
}
```

Every response must store the version used during submission.

---

# Workflow

## Create Form

```
Admin creates form

↓

Create Version 1

↓

draftVersion = V1

publishedVersion = null

status = draft
```

---

## First Publish

```
Publish

↓

publishedVersion = V1

draftVersion = V1

status = published

hasUnpublishedChanges = false
```

---

## Edit Published Form

Current

```
Published Version (V1)

Q1
Q2
Q3
```

Admin removes Q3.

System behavior:

```
Clone V1

↓

Create V2

↓

Apply changes to V2

↓

draftVersion = V2

publishedVersion = V1

hasUnpublishedChanges = true
```

Result:

Dashboard

```
Q1
Q2
```

Public Form

```
Q1
Q2
Q3
```

Nothing changes for respondents.

---

## Publish Draft

```
Publish

↓

publishedVersion = draftVersion

↓

publishedVersion = V2

↓

hasUnpublishedChanges = false
```

Now everyone receives

```
Q1
Q2
```

---

## Discard Draft

Current

```
draftVersion = V2

publishedVersion = V1
```

Click Discard

```
Delete V2

draftVersion = V1

hasUnpublishedChanges = false
```

Dashboard returns to V1.

---

# Editing Rules

## Rule 1

Never edit a published version.

Published versions are immutable.

---

## Rule 2

When editing begins and

```
draftVersionId == publishedVersionId
```

Create a cloned draft.

```
Clone Published

↓

New Draft Version
```

---

## Rule 3

All subsequent edits modify only the draft version.

---

## Rule 4

Public endpoints never read draft versions.

---

## Rule 5

Publishing only changes the publishedVersionId pointer.

No schema copying is required during publish.

---

# API Design

## Admin

### Get Draft

```
GET /api/forms/:id
```

Returns draft version.

---

### Update Draft

```
PATCH /api/forms/:id
```

If

```
draftVersion == publishedVersion
```

Clone first.

Then update draft.

---

### Publish

```
POST /api/forms/:id/publish
```

Logic

```
publishedVersionId = draftVersionId

status = published

hasUnpublishedChanges = false
```

---

### Discard Draft

```
POST /api/forms/:id/discard
```

Logic

```
Delete draft version

draftVersionId = publishedVersionId

hasUnpublishedChanges = false
```

---

### Version History

```
GET /api/forms/:id/versions
```

Returns all versions.

---

## Public

```
GET /f/:slug
```

Always returns

```
publishedVersion
```

Never return draft.

---

# Backend Logic

## Update Draft

```ts
if (form.draftVersionId.equals(form.publishedVersionId)) {
    const draft = clonePublishedVersion(form.publishedVersionId);

    form.draftVersionId = draft._id;
}

updateDraftSchema();

form.hasUnpublishedChanges = true;
```

---

## Publish

```ts
form.publishedVersionId = form.draftVersionId;

form.status = "published";

form.hasUnpublishedChanges = false;

await form.save();
```

---

## Public Form

```ts
const form = await Form.findOne({ slug });

const version = await FormVersion.findById(
    form.publishedVersionId
);

return version.schema;
```

---

# UI Requirements

## Draft

Show

```
Draft
```

---

## Published

Show

```
Published
```

---

## Unpublished Changes

When

```
draftVersionId != publishedVersionId
```

Display

```
● Unpublished Changes

[ Publish ]

[ Discard ]
```

---

## No Changes

Display

```
✓ Published
```

Disable Publish button.

---

# Version Timeline

```
Create Form

↓

V1 Draft

↓

Publish

↓

V1 Published

↓

Edit

↓

Clone

↓

V2 Draft

↓

Publish

↓

V2 Published

↓

Edit

↓

Clone

↓

V3 Draft

↓

Publish

↓

V3 Published
```

---

# Response Handling

Example

```
V1 Published

↓

User opens form

↓

Admin publishes V2

↓

User submits form
```

The submission must still reference

```
formVersionId = V1
```

This guarantees that responses always match the exact questions the respondent saw.

---

# Future Features

- Restore previous version
- Compare two versions
- Scheduled publish
- Autosave drafts
- Multiple editors
- Approval workflow
- Publish notes
- Audit logs

---

# Acceptance Criteria

- Admin edits never affect the published form.
- Public users always receive the published version.
- Editing a published form automatically creates a draft.
- Publish instantly switches the live version.
- Draft can be discarded.
- Version history is preserved.
- Responses store the submitted version.
- Published versions are immutable.
- Draft versions are editable.
- Public API never exposes draft data.