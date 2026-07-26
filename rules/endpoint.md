The rules to follow
1) Keep responsibilities separate

Use this flow:

route -> controller -> service -> repository -> mongoose model
route: URL only
controller: request/response only
service: business logic
repository: database queries
model: schema definition

Do not mix all logic in one file.

2) Make one feature one folder

For example, all form logic stays inside modules/forms.
Do not spread form code across 10 folders.

3) Keep controllers thin

Controllers should not contain heavy logic.
They should mostly:

read req
call service
return response
4) Put all database logic in repository

This helps a lot when something breaks.

Bad:

controller directly runs complex query

Good:

controller calls service
service calls repository
repository talks to Mongoose
5) Validate before service

Use zod or joi for:

body
params
query

Never trust incoming request data.

6) Use a global error handler

Create one error system for the whole app:

ApiError
asyncHandler
error.middleware.ts

That makes debugging much easier.

7) Use consistent API response format

Success:

{
  "success": true,
  "message": "Form created successfully",
  "data": {}
}

Error:

{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
8) Add indexes in Mongoose

For big projects, indexes matter a lot.

Examples:

email unique
slug unique
formId + order
formId + submittedAt
9) Use timestamps in every important collection

Always add:

{ timestamps: true }
10) Never store everything in random shape

For answers, keep structure predictable.
That makes reports and filtering easier later.

11) Use TypeScript types everywhere

Keep separate types for:

request body
response data
database document
service input

Do not reuse one type for everything.

12) Keep config outside business logic

Environment, DB connection, CORS, and logger should stay in config/.

13) Add access control early

For your form builder:

admin only for create/edit/publish
public only for filling submitted forms
role checks in middleware
14) Use soft delete only when needed

If you need recovery, use:

isDeleted
deletedAt

If not needed, hard delete is simpler.

15) Use transactions when data must stay synced

Example:

create form
create fields
save share info

If one step fails, rollback with MongoDB session.

Good file naming rules

Use these names consistently:

*.route.ts
*.controller.ts
*.service.ts
*.repository.ts
*.validation.ts
*.types.ts
*.model.ts

That makes the project easy to scan.

For your form builder, this is a clean module split
auth → login, register, token
users → user profile, roles
forms → create/update/publish form
fields → add/reorder form fields
responses → collect and read submissions
public-form → public form view and submit API
Mongoose-specific rules
Put schema in model.ts
Add index() where needed
Use pre('save') only for schema-level logic
Do not put heavy business logic in Mongoose hooks
Use populate() carefully
Prefer projections when reading large documents
Use .lean() when you only need plain objects
Bug-fixing order

When something breaks, check in this order:

route path
validation
controller
service
repository
mongoose schema
middleware
frontend payload

That order catches most bugs fast.

I can also make a ready-to-use folder structure for your form builder project with exact files for auth, forms, fields, and responses in TypeScript + Mongoose.