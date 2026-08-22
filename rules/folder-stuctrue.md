src/
├── app.ts
├── server.ts
├── config/
│   ├── env.ts
│   ├── db.ts
│   ├── cors.ts
│   └── logger.ts
│
├── routes/
│   └── index.ts
│
├── middlewares/
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   ├── validate.middleware.ts
│   ├── not-found.middleware.ts
│   └── rate-limit.middleware.ts
│
├── utils/
│   ├── ApiError.ts
│   ├── ApiResponse.ts
│   ├── asyncHandler.ts
│   ├── slug.ts
│   └── pagination.ts
│
├── constants/
│   ├── roles.ts
│   ├── status.ts
│   └── httpStatus.ts
│
├── modules/
│   ├── auth/
│   │   ├── auth.route.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.validation.ts
│   │   ├── auth.types.ts
│   │   └── auth.utils.ts
│   │
│   ├── users/
│   │   ├── user.model.ts
│   │   ├── user.route.ts
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.repository.ts
│   │   ├── user.validation.ts
│   │   └── user.types.ts
│   │
│   ├── forms/
│   │   ├── form.model.ts
│   │   ├── form.route.ts
│   │   ├── form.controller.ts
│   │   ├── form.service.ts
│   │   ├── form.repository.ts
│   │   ├── form.validation.ts
│   │   └── form.types.ts
│   │
│   ├── pages/
│   │   ├── page.model.ts
│   │   ├── page.route.ts
│   │   ├── page.controller.ts
│   │   ├── page.service.ts
│   │   ├── page.repository.ts
│   │   ├── page.validation.ts
│   │   └── page.types.ts
│   │
│   ├── responses/
│   │   ├── response.model.ts
│   │   ├── response.route.ts
│   │   ├── response.controller.ts
│   │   ├── response.service.ts
│   │   ├── response.repository.ts
│   │   ├── response.validation.ts
│   │   └── response.types.ts
│   │
│   └── public-form/
│       ├── public-form.route.ts
│       ├── public-form.controller.ts
│       ├── public-form.service.ts
│       └── public-form.validation.ts
│
├── tests/
│   ├── unit/
│   └── integration/
│
└── types/
    └── express.d.ts