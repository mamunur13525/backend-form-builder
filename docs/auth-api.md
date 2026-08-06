# Authentication API Documentation

Frontend integration guide for auth endpoints.

**Base URL:** `{API_ORIGIN}/api/v1/auth`  
**Default dev:** `http://localhost:5000/api/v1/auth`

---

## Connection Setup

| Setting | Value |
|---------|-------|
| Content-Type | `application/json` |
| CORS origin | `FRONTEND_URL` env var (default: `http://localhost:5173`) |
| Max body size | 10 MB |
| Health check | `GET /health` → `{ status, timestamp, uptime }` |

> ⚠️ **CORS:** Backend `.env` must have `FRONTEND_URL` matching your dev origin exactly, or all requests fail preflight.

---

## Response Format

All responses use a consistent envelope:

```ts
// Success
{
  "success": true,
  "message": string,
  "data": T | null
}

// Error
{
  "success": false,
  "message": string,
  "errors"?: Array<{ field: string; message: string }>
}
```

**Validation errors (422)** include field-level detail:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email address" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}
```

---

## Authentication

Protected routes require: `Authorization: Bearer <accessToken>`

**Token lifetimes:**
- `accessToken`: **7 days** (default, configurable via `JWT_EXPIRES_IN`)
- `refreshToken`: **30 days** (default, configurable via `JWT_REFRESH_EXPIRES_IN`)

**JWT payload:** `{ userId, email, role, name, iat, exp }`

**Roles:** `"admin"` | `"editor"` | `"viewer"` (new users default to `viewer`)

---

## Rate Limiting

**Auth-specific limiter:** 10 requests / 15 minutes per IP

Applied to: `/register`, `/login`, `/google`, `/forgot-password`, `/reset-password`

**On `429`:**
```json
{ "success": false, "message": "Too many authentication attempts, please try again later" }
```

Display "Try again in 15 minutes" and disable form submission.

---

## TypeScript Types

```ts
export type Role = "admin" | "editor" | "viewer";

/** Returned by /register, /login, /google */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string; // "" when unset
}

/** Returned by /me (richer than AuthUser) */
export interface UserProfile extends AuthUser {
  isActive: boolean;
  lastLoginAt?: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}
```

---

## Endpoints

### 1. Register — `POST /register` 🟢

Creates an email/password account and returns tokens immediately (no email verification).

**Request Body:**

| Field | Type | Validation |
|-------|------|------------|
| `name` | string | 2–100 characters |
| `email` | string | Valid email (lowercased server-side) |
| `password` | string | 8–128 characters |

**Response `201 Created`:**

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "665f1b2c...",
      "name": "Alex",
      "email": "alex@example.com",
      "role": "viewer",
      "avatarUrl": ""
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

**Errors:**

| Status | Message | Action |
|--------|---------|--------|
| 409 | `Email already registered` | Show error on email field |
| 422 | `Validation failed` | Map `errors[]` to form fields |
| 429 | Rate limit message | Disable submit, show "try later" |

---

### 2. Login — `POST /login` 🟢

**Request Body:**

```json
{
  "email": "alex@example.com",
  "password": "your-password"
}
```

**Response `200 OK`:** Same as register

**Errors:**

| Status | Message | Frontend Action |
|--------|---------|-----------------|
| 401 | `Invalid email or password` | Generic form error (deliberately ambiguous) |
| 401 | `This account uses Google sign-in. Please sign in with Google.` | Highlight Google button |
| 403 | `Account is deactivated` | Show "Contact support" message |
| 422 | `Validation failed` | Field errors |
| 429 | Rate limit | Disable submit |

> **Important:** Two different `401` messages require different UI — branch on `message`, not just status.

---

### 3. Google Sign-In — `POST /google` 🟡

Send the Google ID token (JWT credential from Google Identity Services).

**Request Body:**

```json
{
  "idToken": "eyJhbGciOiJ..."
}
```

**Response `201 Created`:** Same shape as register/login

**Behavior:**
1. Known `googleId` → login
2. Email exists with password → **links** Google to that account
3. Neither → creates new user

> ⚠️ **Caveats:**
> - Always returns `201` even for returning users (no `isNewUser` flag)
> - Invalid/expired Google tokens return `500` instead of `401` — treat as "retry sign-in"

**Errors:**

| Status | Message |
|--------|---------|
| 401 | `Google email is not verified` |
| 500 | Invalid token (see caveat above) |
| 422 / 429 | Validation / rate limit |

---

### 4. Refresh Token — `POST /refresh-token` 🟢

Not authenticated (refresh token is the credential). Not rate-limited.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."  // NEW token (rotation)
  }
}
```

> ⚠️ **No `user` object** — only tokens. Store **both** tokens (refresh rotates).

**Errors:**

| Status | Message | Action |
|--------|---------|--------|
| 401 | `Invalid refresh token` | Force logout |
| 401 | `Invalid or expired refresh token` | Force logout |

---

### 5. Get Profile — `GET /me` 🟢

**Headers:** `Authorization: Bearer <accessToken>`

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "665f1b...",
    "name": "Alex",
    "email": "alex@example.com",
    "role": "viewer",
    "avatarUrl": "",
    "isActive": true,
    "lastLoginAt": "2026-08-05T09:12:44.001Z",
    "createdAt": "2026-07-02T10:00:00.000Z",
    "updatedAt": "2026-08-05T09:12:44.001Z"
  }
}
```

> Use this endpoint to hydrate the app after page refresh.

**Errors:**

| Status | Message | Action |
|--------|---------|--------|
| 401 | Invalid/expired token | Attempt refresh |
| 404 | `User not found` | Force logout immediately |

> Note: Returns `200` even if `isActive: false` — check this flag client-side.

---

### 6. Change Password — `PATCH /change-password` 🟢

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"  // 8-128 chars
}
```

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

> Existing tokens remain valid after password change (no re-login needed).

**Errors:**

| Status | Message | Action |
|--------|---------|--------|
| 401 | `Current password is incorrect` | Show error on current password field |
| 400 | `Cannot change password. This account uses Google sign-in.` | Hide form for Google users |
| 404 | `User not found` | Force logout |
| 422 | Validation failed | Field errors |

---

### 7. Logout — `POST /logout` 🟡

**Headers:** `Authorization: Bearer <accessToken>`

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Logout successful",
  "data": null
}
```

> ⚠️ **Server does nothing** — no token blacklist. Frontend must clear tokens.

**Implementation:**

```ts
async logout() {
  try {
    await api.post('/logout', {}, { headers: authHeader() });
  } catch {
    // Ignore errors (endpoint is a no-op anyway)
  } finally {
    clearTokens(); // Always clear locally
  }
}
```

---

### 8. Forgot Password — `POST /forgot-password` 🔴

**Request Body:**

```json
{
  "email": "alex@example.com"
}
```

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "If the email exists, a reset link has been sent",
  "data": null
}
```

> 🔴 **Not ready:** No email is actually sent. Token is logged to server console only. UI can be built but flow cannot complete.

---

### 9. Reset Password — `POST /reset-password` 🔴

**Request Body:**

```json
{
  "token": "abc123",
  "password": "new-password"  // 8-128 chars
}
```

> 🔴 **Not implemented:** Always returns `501 "Password reset not fully implemented yet"`

---

### 10. Verify Email — `POST /verify-email` 🔴

> ⚠️ Token goes in **query string**, not body.

**Request:** `POST /verify-email?token=abc123` (empty body)

> 🔴 **Not implemented:** Always returns `501 "Email verification not fully implemented yet"`
>
> Expect this to become `GET` when implemented (email links are GET requests).

---

## Error Handling Guide

| Status | Where | Meaning | Action |
|--------|-------|---------|--------|
| 400 | change-password | Google account, no password exists | Hide password form |
| 401 | login | Wrong credentials / Google-only account | Inline form error |
| 401 | protected routes | Invalid/expired access token | Try refresh → retry once → logout |
| 401 | refresh-token | Refresh token dead | Clear tokens, redirect login |
| 403 | login | Account deactivated | Terminal message |
| 404 | me / change-password | User deleted | Force logout |
| 409 | register | Email already exists | Field error on email |
| 422 | any validated route | Validation failure | Map `errors[]` to fields |
| 429 | limited routes | Rate limited | Disable submit, show timer |
| 500 | google | Invalid Google ID token | "Sign-in failed, retry" |
| 501 | reset/verify | Not implemented | Feature-flag off |

---

## Silent Refresh Flow

```typescript
// Concurrent 401s must share a single in-flight refresh
let refreshing: Promise<AuthTokens> | null = null;

async function refreshTokens(): Promise<AuthTokens> {
  if (!refreshing) {
    const rt = getRefreshToken();
    refreshing = api.post<AuthTokens>('/refresh-token', { refreshToken: rt })
      .then(tokens => {
        saveTokens(tokens);
        return tokens;
      })
      .catch(err => {
        clearTokens();
        throw err;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function authenticatedRequest<T>(path: string, options: RequestInit): Promise<T> {
  try {
    return await api.request<T>(path, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${getAccessToken()}`
      }
    });
  } catch (err) {
    if (err.status === 401) {
      await refreshTokens(); // throws → redirects to login
      return api.request<T>(path, options); // retry once
    }
    throw err;
  }
}
```

---

## App Boot Flow

```typescript
async function initializeAuth() {
  const token = getAccessToken();
  
  if (!token) {
    redirectToLogin();
    return;
  }
  
  try {
    const profile = await api.get<UserProfile>('/me');
    
    if (!profile.isActive) {
      clearTokens();
      showDeactivatedMessage();
      return;
    }
    
    setUser(profile);
  } catch (err) {
    if (err.status === 401) {
      // Try refresh
      try {
        await refreshTokens();
        return initializeAuth(); // retry
      } catch {
        redirectToLogin();
      }
    } else if (err.status === 404) {
      clearTokens();
      redirectToLogin();
    }
  }
}
```

---

## Reference Implementation

```typescript
// auth-client.ts
const BASE = `${import.meta.env.VITE_API_URL}/api/v1/auth`;

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors: Array<{ field: string; message: string }> = []
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Convenience for react-hook-form setError */
  get byField(): Record<string, string> {
    return Object.fromEntries(
      this.fieldErrors.map(e => [e.field, e.message])
    );
  }
}

const tokens = {
  get access() {
    return localStorage.getItem("accessToken");
  },
  get refresh() {
    return localStorage.getItem("refreshToken");
  },
  set({ accessToken, refreshToken }: AuthTokens) {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  },
  clear() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }
};

async function request<T>(
  path: string,
  init: RequestInit = {},
  auth = false
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(auth && tokens.access ? { Authorization: `Bearer ${tokens.access}` } : {}),
      ...(init.headers ?? {})
    }
  });

  const body = await res.json().catch(() => ({ message: res.statusText }));

  if (!res.ok) {
    throw new ApiError(res.status, body.message ?? "Request failed", body.errors ?? []);
  }
  
  return body.data as T;
}

let refreshing: Promise<AuthTokens> | null = null;

function refreshOnce(): Promise<AuthTokens> {
  if (!refreshing) {
    const rt = tokens.refresh;
    refreshing = (rt
      ? request<AuthTokens>("/refresh-token", {
          method: "POST",
          body: JSON.stringify({ refreshToken: rt })
        })
      : Promise.reject(new ApiError(401, "No refresh token"))
    )
      .then(next => {
        tokens.set(next);
        return next;
      })
      .catch(err => {
        tokens.clear();
        throw err;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, init, true);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await refreshOnce();
      return request<T>(path, init, true);
    }
    throw err;
  }
}

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    request<AuthResponse>("/register", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/login", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  google: (idToken: string) =>
    request<AuthResponse>("/google", {
      method: "POST",
      body: JSON.stringify({ idToken })
    }),

  me: () => authed<UserProfile>("/me"),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    authed<null>("/change-password", {
      method: "PATCH",
      body: JSON.stringify(body)
    }),

  logout: async () => {
    try {
      await authed<null>("/logout", { method: "POST" });
    } catch {
      // Server is no-op; ignore errors
    } finally {
      tokens.clear();
    }
  },

  tokens
};
```

---

## Implementation Checklist

**Environment**
- [ ] `FRONTEND_URL` in backend `.env` matches your dev origin
- [ ] `VITE_API_URL` points to backend (e.g., `http://localhost:5000`)

**Core Features**
- [ ] Register form with proper validation (name 2-100, password 8-128)
- [ ] Login form with 4 distinct error branches (401 wrong creds, 401 Google-only, 403 deactivated, generic errors)
- [ ] Google Identity Services integration → POST `/google` with `credential`
- [ ] Token storage + `Authorization` header injection
- [ ] Single-flight refresh interceptor with one retry
- [ ] App boot via `/me` with `isActive` check
- [ ] Logout clearing tokens in `finally` block
- [ ] Change password form (`PATCH`) hidden for Google provider users

**Error Handling**
- [ ] `422` validation errors mapped to form fields
- [ ] `429` rate limit → disable submit + "try in 15 min"
- [ ] `403`/`404` user gone → force logout
- [ ] Guard `res.json()` for non-JSON responses

**Feature-Flagged**
- [ ] Forgot password (responds but doesn't send email)
- [ ] Reset password (`501` stub)
- [ ] Verify email (`501` stub, query-string token)

---

## Implementation Status

**Ready to build:**
- Register
- Login
- Google sign-in
- Session hydration (`/me`)
- Silent refresh
- Change password
- Logout (client-side only)

**Blocked on backend:**
- Password reset (no email delivery)
- Email verification (not implemented)

---

## Known Backend Issues

For backend team awareness:

1. **Credential leak** — `src/modules/auth/auth.service.ts:50,52` logs plaintext passwords to console
2. **`/verify-email` inconsistency** — POST with query param; should be GET when implemented
3. **`/google` error mapping** — invalid tokens return 500 instead of 401
4. **Token revocation gap** — 7-day access tokens with no blacklist; consider shortening to 15min
