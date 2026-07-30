/// <reference types="jest" />
import supertest from "supertest";
import mongoose from "mongoose";
import app from "../app";

const api = supertest(app);

describe("Typeform API Endpoints", () => {
  let authToken: string;
  let userId: string;
  let formId: string;
  let fieldId: string;
  let responseId: string;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI!);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
    }
  });

  describe("Auth Endpoints", () => {
    it("should register a new user", async () => {
      const res = await api.post("/api/v1/auth/register").send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("test@example.com");
      authToken = res.body.data.tokens.accessToken;
      userId = res.body.data.user.id;
    });

    it("should login with registered user", async () => {
      const res = await api.post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "password123",
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      authToken = res.body.data.tokens.accessToken;
    });

    it("should get current user profile", async () => {
      const res = await api.get("/api/v1/auth/me").set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe("test@example.com");
    });

    it("should fail with invalid credentials", async () => {
      const res = await api.post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "wrongpassword",
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Forms Endpoints", () => {
    it("should create a new form", async () => {
      const res = await api.post("/api/v1/forms").set("Authorization", `Bearer ${authToken}`).send({
        title: "Test Form",
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Test Form");
      formId = res.body.data.id;
    });

    it("should get all forms", async () => {
      const res = await api.get("/api/v1/forms").set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should get form by id", async () => {
      const res = await api.get(`/api/v1/forms/${formId}`).set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(formId);
    });

    it("should update form", async () => {
      const res = await api.patch(`/api/v1/forms/${formId}`).set("Authorization", `Bearer ${authToken}`).send({
        title: "Updated Form",
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Updated Form");
    });

    it("should publish form", async () => {
      const res = await api.patch(`/api/v1/forms/${formId}/publish`).set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("published");
    });

    it("should duplicate form", async () => {
      const res = await api.patch(`/api/v1/forms/${formId}/duplicate`).set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Fields Endpoints", () => {
    let firstFieldId: string;
    let secondFieldId: string;

    it("should create first field", async () => {
      const res = await api.post(`/api/v1/forms/${formId}/fields`).set("Authorization", `Bearer ${authToken}`).send({
        type: "shortText",
        label: "First Field",
        required: true,
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order).toBe(1);
      firstFieldId = res.body.data.id;
    });

    it("should create second field", async () => {
      const res = await api.post(`/api/v1/forms/${formId}/fields`).set("Authorization", `Bearer ${authToken}`).send({
        type: "email",
        label: "Second Field",
        required: false,
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order).toBe(2);
      secondFieldId = res.body.data.id;
    });

    it("should update field without changing order", async () => {
      const res = await api.patch(`/api/v1/forms/${formId}/fields/${firstFieldId}`).set("Authorization", `Bearer ${authToken}`).send({
        label: "Updated First Field",
        required: false,
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.label).toBe("Updated First Field");
      expect(res.body.data.order).toBe(1); // Order should remain the same
    });

    it("should allow empty label and helperText on field update", async () => {
      const res = await api.patch(`/api/v1/forms/${formId}/fields/${firstFieldId}`).set("Authorization", `Bearer ${authToken}`).send({
        label: "",
        helperText: "",
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.label).toBe("");
      expect(res.body.data.helperText).toBe("");
    });

    it("should get all fields in correct order", async () => {
      const res = await api.get(`/api/v1/forms/${formId}/fields`).set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].id).toBe(firstFieldId);
      expect(res.body.data[0].order).toBe(1);
      expect(res.body.data[1].id).toBe(secondFieldId);
      expect(res.body.data[1].order).toBe(2);
    });

    it("should reorder fields", async () => {
      const res = await api.patch(`/api/v1/forms/${formId}/fields/reorder`).set("Authorization", `Bearer ${authToken}`).send({
        fieldIds: [secondFieldId, firstFieldId],
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should maintain order after reorder", async () => {
      const res = await api.get(`/api/v1/forms/${formId}/fields`).set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data[0].id).toBe(secondFieldId);
      expect(res.body.data[0].order).toBe(1);
      expect(res.body.data[1].id).toBe(firstFieldId);
      expect(res.body.data[1].order).toBe(2);
    });

    it("should fail when creating field with order field in body", async () => {
      const res = await api.post(`/api/v1/forms/${formId}/fields`).set("Authorization", `Bearer ${authToken}`).send({
        type: "shortText",
        label: "Field with order",
        order: 5, // This should be rejected
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Public Form Endpoints", () => {
    it("should get public form by slug", async () => {
      const res = await api.get(`/api/v1/public/forms/${formId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should submit form", async () => {
      const res = await api.post(`/api/v1/public/forms/${formId}/submit`).send({
        answers: [{ fieldKey: "name", label: "Name", type: "shortText", value: "John Doe" }],
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      responseId = res.body.data.submissionId;
    });
  });

  describe("Responses Endpoints", () => {
    it("should get form responses", async () => {
      const res = await api.get(`/api/v1/forms/${formId}/responses`).set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should get response stats", async () => {
      const res = await api.get(`/api/v1/forms/${formId}/responses/stats`).set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Users Endpoints", () => {
    it("should get all users (admin)", async () => {
      const res = await api.get("/api/v1/users").set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should get user by id", async () => {
      const res = await api.get(`/api/v1/users/${userId}`).set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Dashboard Endpoints", () => {
    it("should get dashboard overview", async () => {
      const res = await api.get("/api/v1/dashboard/overview").set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Analytics Endpoints", () => {
    it("should get form analytics", async () => {
      const res = await api.get(`/api/v1/forms/${formId}/analytics`).set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Upload Endpoints", () => {
    it("should fail upload without file", async () => {
      const res = await api.post("/api/v1/uploads").set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Notifications Endpoints", () => {
    it("should get notifications", async () => {
      const res = await api.get("/api/v1/notifications").set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Workspaces Endpoints", () => {
    it("should create workspace", async () => {
      const res = await api.post("/api/v1/workspaces").set("Authorization", `Bearer ${authToken}`).send({
        name: "Test Workspace",
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("should get workspaces", async () => {
      const res = await api.get("/api/v1/workspaces").set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});