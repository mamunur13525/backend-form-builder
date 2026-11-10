/// <reference types="jest" />
import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import { User } from "../models/User";

const api = request(app);

const createTestUser = async (role: "admin" | "viewer" = "viewer") => {
  const email = `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@example.com`;
  const res = await api.post("/api/v1/auth/register").send({
    name: "Test User",
    email,
    password: "password123",
  });
  const userId = res.body.data.user.id;
  if (role === "admin") {
    await User.findByIdAndUpdate(userId, { role: "admin" });
  }
  const loginRes = await api.post("/api/v1/auth/login").send({
    email,
    password: "password123",
  });
  return {
    userId,
    email,
    authToken: loginRes.body.data.tokens.accessToken as string,
  };
};

const createTestForm = async (token: string, title = "Test Form") => {
  const res = await api
    .post("/api/v1/forms")
    .set("Authorization", `Bearer ${token}`)
    .send({ title });
  return {
    formId: res.body.data.id as string,
    slug: res.body.data.slug as string,
  };
};

describe("Typeform API Endpoints", () => {
  describe("Auth Endpoints", () => {
    it("should register a new user", async () => {
      const email = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@example.com`;
      const res = await api.post("/api/v1/auth/register").send({
        name: "Test User",
        email,
        password: "password123",
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(email);
    });

    it("should login with registered user", async () => {
      const user = await createTestUser();
      const res = await api.post("/api/v1/auth/login").send({
        email: user.email,
        password: "password123",
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it("should get current user profile", async () => {
      const user = await createTestUser();
      const res = await api
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${user.authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(user.email);
    });

    it("should fail with invalid credentials", async () => {
      const res = await api.post("/api/v1/auth/login").send({
        email: "nonexistent@example.com",
        password: "wrongpassword",
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Forms Endpoints", () => {
    let authToken: string;
    let formId: string;

    beforeEach(async () => {
      const u = await createTestUser();
      authToken = u.authToken;
      const f = await createTestForm(authToken);
      formId = f.formId;
    });

    it("should create a new form", async () => {
      const res = await api
        .post("/api/v1/forms")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Brand New Form" });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Brand New Form");
    });

    it("should get all forms", async () => {
      const res = await api
        .get("/api/v1/forms")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("should get form by id", async () => {
      const res = await api
        .get(`/api/v1/forms/${formId}`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(formId);
    });

    it("should update form", async () => {
      const res = await api
        .patch(`/api/v1/forms/${formId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Updated Form Title" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Updated Form Title");
    });

    it("should publish form", async () => {
      const res = await api
        .patch(`/api/v1/forms/${formId}/publish`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("published");
    });

    it("should duplicate form", async () => {
      const res = await api
        .patch(`/api/v1/forms/${formId}/duplicate`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Pages Endpoints", () => {
    let authToken: string;
    let formId: string;
    let pageId: string;

    beforeEach(async () => {
      const u = await createTestUser();
      authToken = u.authToken;
      const f = await createTestForm(authToken);
      formId = f.formId;

      const pageRes = await api
        .post(`/api/v1/forms/${formId}/pages`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ type: "shortText", label: "Initial Page", required: true });
      pageId = pageRes.body.data._id || pageRes.body.data.id;
    });

    it("should create a new page", async () => {
      const res = await api
        .post(`/api/v1/forms/${formId}/pages`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ type: "email", label: "Email Page", required: false });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order).toBeGreaterThanOrEqual(1);
    });

    it("should update page without changing order", async () => {
      const res = await api
        .patch(`/api/v1/forms/${formId}/pages/${pageId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ label: "Updated First Page", required: false });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.label).toBe("Updated First Page");
    });

    it("should allow empty label and helperText on page update", async () => {
      const res = await api
        .patch(`/api/v1/forms/${formId}/pages/${pageId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ label: "", helperText: "" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.label).toBe("");
      expect(res.body.data.helperText).toBe("");
    });

    it("should get all pages in order", async () => {
      const res = await api
        .get(`/api/v1/forms/${formId}/pages`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("should reorder pages", async () => {
      const page2Res = await api
        .post(`/api/v1/forms/${formId}/pages`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ type: "email", label: "Page 2" });
      const page2Id = page2Res.body.data._id || page2Res.body.data.id;

      const res = await api
        .patch(`/api/v1/forms/${formId}/pages/reorder`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ pageIds: [page2Id, pageId] });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should fail when creating page with order in body", async () => {
      const res = await api
        .post(`/api/v1/forms/${formId}/pages`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ type: "shortText", label: "Page with order", order: 5 });
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Public Form Endpoints", () => {
    let authToken: string;
    let formId: string;
    let slug: string;

    beforeEach(async () => {
      const u = await createTestUser();
      authToken = u.authToken;
      const f = await createTestForm(authToken);
      formId = f.formId;
      slug = f.slug;

      await api
        .post(`/api/v1/forms/${formId}/pages`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ type: "shortText", label: "Name", required: true });

      await api
        .patch(`/api/v1/forms/${formId}/publish`)
        .set("Authorization", `Bearer ${authToken}`);
    });

    it("should get public form by slug", async () => {
      const res = await api.get(`/api/v1/public/forms/${slug}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe(slug);
    });

    it("should submit form", async () => {
      const schemaRes = await api.get(`/api/v1/public/forms/${slug}`);
      const pageKey = schemaRes.body.data.pages[0].pageKey;

      const res = await api.post(`/api/v1/public/forms/${slug}/submit`).send({
        answers: [{ pageKey, label: "Name", type: "shortText", value: "John Doe" }],
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.submissionId).toBeDefined();
    });
  });

  describe("Responses Endpoints", () => {
    let authToken: string;
    let formId: string;

    beforeEach(async () => {
      const u = await createTestUser();
      authToken = u.authToken;
      const f = await createTestForm(authToken);
      formId = f.formId;

      await api
        .patch(`/api/v1/forms/${formId}/publish`)
        .set("Authorization", `Bearer ${authToken}`);
    });

    it("should get form responses", async () => {
      const res = await api
        .get(`/api/v1/forms/${formId}/responses`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should get response stats", async () => {
      const res = await api
        .get(`/api/v1/forms/${formId}/responses/stats`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Users Endpoints", () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      const u = await createTestUser("admin");
      authToken = u.authToken;
      userId = u.userId;
    });

    it("should get all users (admin)", async () => {
      const res = await api
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should get user by id", async () => {
      const res = await api
        .get(`/api/v1/users/${userId}`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id || res.body.data.id).toBe(userId);
    });
  });

  describe("Dashboard Endpoints", () => {
    let authToken: string;

    beforeEach(async () => {
      const u = await createTestUser("admin");
      authToken = u.authToken;
    });

    it("should get dashboard overview", async () => {
      const res = await api
        .get("/api/v1/dashboard/overview")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Analytics Endpoints", () => {
    let authToken: string;
    let formId: string;

    beforeEach(async () => {
      const u = await createTestUser();
      authToken = u.authToken;
      const f = await createTestForm(authToken);
      formId = f.formId;
    });

    it("should get form analytics", async () => {
      const res = await api
        .get(`/api/v1/forms/${formId}/analytics`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Upload Endpoints", () => {
    let authToken: string;

    beforeEach(async () => {
      const u = await createTestUser();
      authToken = u.authToken;
    });

    it("should fail upload without file", async () => {
      const res = await api
        .post("/api/v1/uploads")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Notifications Endpoints", () => {
    let authToken: string;

    beforeEach(async () => {
      const u = await createTestUser();
      authToken = u.authToken;
    });

    it("should get notifications", async () => {
      const res = await api
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Workspaces Endpoints", () => {
    let authToken: string;

    beforeEach(async () => {
      const u = await createTestUser();
      authToken = u.authToken;
    });

    it("should create workspace", async () => {
      const res = await api
        .post("/api/v1/workspaces")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Test Workspace" });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("should get workspaces", async () => {
      const res = await api
        .get("/api/v1/workspaces")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should get active workspace", async () => {
      const res = await api
        .get("/api/v1/workspaces/active")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("workspaceId");
    });

    it("should set active workspace", async () => {
      const created = await api
        .post("/api/v1/workspaces")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Active WS" });
      const targetWorkspaceId = created.body.data._id;

      const res = await api
        .put("/api/v1/workspaces/active")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ workspaceId: targetWorkspaceId });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.workspaceId).toBe(targetWorkspaceId);
    });
  });
});