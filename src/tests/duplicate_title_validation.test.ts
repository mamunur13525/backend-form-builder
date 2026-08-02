/// <reference types="jest" />
import mongoose from "mongoose";
import request from "supertest";
import app from "../app";
import * as formRepo from "../modules/forms/form.repository";

const api = request(app);

describe("Duplicate Title Validation", () => {
  let authToken: string;
  let formId: string;

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

  describe("Form Title Uniqueness", () => {
    it("should register a user and create a form", async () => {
      // Register user
      const res = await api.post("/api/v1/auth/register").send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });
      expect(res.status).toBe(201);
      authToken = res.body.data.tokens.accessToken;

      // Create first form
      const formRes = await api.post("/api/v1/forms").set("Authorization", `Bearer ${authToken}`).send({
        title: "My Test Form",
      });
      expect(formRes.status).toBe(201);
      formId = formRes.body.data.id;
    });

    it("should prevent updating form title to a title that already exists", async () => {
      // Create a second form with a different title
      const secondForm = await api.post("/api/v1/forms").set("Authorization", `Bearer ${authToken}`).send({
        title: "Second Form",
      });
      expect(secondForm.status).toBe(201);

      // Try to update the first form's title to match the second form's title
      const res = await api.patch(`/api/v1/forms/${formId}`).set("Authorization", `Bearer ${authToken}`).send({
        title: "Second Form",
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Form with this title already exists");
    });

    it("should allow updating form title to a unique title", async () => {
      const res = await api.patch(`/api/v1/forms/${formId}`).set("Authorization", `Bearer ${authToken}`).send({
        title: "Unique New Title",
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Unique New Title");
    });

    it("should allow updating form title to the same title (no change)", async () => {
      const res = await api.patch(`/api/v1/forms/${formId}`).set("Authorization", `Bearer ${authToken}`).send({
        title: "Unique New Title",
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Unique New Title");
    });
  });
});