Here is a solid full API endpoint set for a Typeform-like form builder using Node.js + TypeScript + Mongoose.

Base prefix
/api/v1
Auth
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh-token
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/verify-email
GET    /auth/me
PATCH  /auth/change-password
Users
GET    /users/me
PATCH  /users/me
GET    /users
GET    /users/:id
PATCH  /users/:id
DELETE /users/:id
PATCH  /users/:id/role
PATCH  /users/:id/status
Forms
POST   /forms
GET    /forms
GET    /forms/:formId
PATCH  /forms/:formId
DELETE /forms/:formId
PATCH  /forms/:formId/duplicate
PATCH  /forms/:formId/archive
PATCH  /forms/:formId/restore
PATCH  /forms/:formId/publish
PATCH  /forms/:formId/unpublish
GET    /forms/:formId/slug
PATCH  /forms/:formId/settings
PATCH  /forms/:formId/theme
PATCH  /forms/:formId/share
Form pages
POST   /forms/:formId/pages
GET    /forms/:formId/pages
GET    /forms/:formId/pages/:pageId
PATCH  /forms/:formId/pages/:pageId
DELETE /forms/:formId/pages/:pageId
PATCH  /forms/:formId/pages/reorder
PATCH  /forms/:formId/pages/:pageId/duplicate
PATCH  /forms/:formId/pages/:pageId/logic
DELETE /forms/:formId/pages/:pageId/logic
Form builder blocks / sections
POST   /forms/:formId/blocks
GET    /forms/:formId/blocks
PATCH  /forms/:formId/blocks/:blockId
DELETE /forms/:formId/blocks/:blockId
PATCH  /forms/:formId/blocks/reorder
Form logic / conditions
POST   /forms/:formId/logic
GET    /forms/:formId/logic
PATCH  /forms/:formId/logic/:logicId
DELETE /forms/:formId/logic/:logicId
Public form access
GET  /public/forms/:slug
GET  /public/forms/:slug/schema
GET  /public/forms/:slug/theme
GET  /public/forms/:slug/preview
Public form submissions
POST /public/forms/:slug/submit
POST /public/forms/:slug/save-draft
GET  /public/forms/:slug/submit-status/:submissionId
Responses
GET    /forms/:formId/responses
GET    /forms/:formId/responses/:responseId
DELETE /forms/:formId/responses/:responseId
PATCH  /forms/:formId/responses/:responseId
GET    /forms/:formId/responses/export
GET    /forms/:formId/responses/stats
GET    /forms/:formId/responses/summary
Response actions
PATCH /forms/:formId/responses/:responseId/mark-read
PATCH /forms/:formId/responses/:responseId/mark-unread
PATCH /forms/:formId/responses/:responseId/star
PATCH /forms/:formId/responses/:responseId/unstar
Analytics
GET /forms/:formId/analytics
GET /forms/:formId/analytics/overview
GET /forms/:formId/analytics/views
GET /forms/:formId/analytics/submissions
GET /forms/:formId/analytics/conversion
GET /forms/:formId/analytics/dropoff
GET /forms/:formId/analytics/page/:pageId
Dashboard / Admin stats
GET /dashboard/overview
GET /dashboard/forms
GET /dashboard/responses
GET /dashboard/users
GET /dashboard/activity
File uploads
POST /uploads
DELETE /uploads/:fileId
GET /uploads/:fileId
Notifications
GET    /notifications
PATCH  /notifications/:id/read
PATCH  /notifications/read-all
DELETE /notifications/:id
Team / workspace, if you need multi-user admin
POST   /workspaces
GET    /workspaces
GET    /workspaces/:workspaceId
PATCH  /workspaces/:workspaceId
DELETE /workspaces/:workspaceId

POST   /workspaces/:workspaceId/members
GET    /workspaces/:workspaceId/members
PATCH  /workspaces/:workspaceId/members/:memberId
DELETE /workspaces/:workspaceId/members/:memberId
Recommended route groups in code
app.route("/api/v1/auth", authRoutes)
app.route("/api/v1/users", userRoutes)
app.route("/api/v1/forms", formRoutes)
app.route("/api/v1/public", publicFormRoutes)
app.route("/api/v1/uploads", uploadRoutes)
app.route("/api/v1/notifications", notificationRoutes)
app.route("/api/v1/dashboard", dashboardRoutes)
Minimum MVP endpoints

If you want the first version only, keep these:

POST   /auth/login
GET    /auth/me

POST   /forms
GET    /forms
GET    /forms/:formId
PATCH  /forms/:formId
DELETE /forms/:formId
PATCH  /forms/:formId/publish

POST   /forms/:formId/pages
PATCH  /forms/:formId/pages/reorder

GET    /public/forms/:slug
POST   /public/forms/:slug/submit

GET    /forms/:formId/responses
GET    /forms/:formId/responses/export

A very strong next step is to turn this into a route-by-route folder structure with request body examples for each endpoint.