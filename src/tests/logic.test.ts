/// <reference types="jest" />
import request from "supertest";
import mongoose from "mongoose";
import app from "../app";

const api = request(app);

describe("Logic (Conditions) Endpoints", () => {
  let authToken: string;
  let formId: string;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI!);
  });

  // NOTE: the global setup.ts drops the database after EVERY test, so nothing
  // created in one `it` survives into the next. Every test is self-contained.
  afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
    }
  });

  // Register + login + create a two-page form. The service auto-generates
  // pageKeys (`page_<nanoid>`), so we read them back from the created pages.
  async function setupForm(): Promise<{ page1Key: string; page2Key: string }> {
    await api.post("/api/v1/auth/register").send({
      name: "Test User",
      email: "logic@example.com",
      password: "password123",
    });
    const loginRes = await api.post("/api/v1/auth/login").send({
      email: "logic@example.com",
      password: "password123",
    });
    authToken = loginRes.body.data.tokens.accessToken;

    const formRes = await api
      .post("/api/v1/forms")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "Logic Test Form" });
    formId = formRes.body.data.id;

    const p1 = await api
      .post(`/api/v1/forms/${formId}/pages`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ type: "shortText", label: "Name", required: true });
    const page1Key: string = p1.body.data.page.pageKey;

    const p2 = await api
      .post(`/api/v1/forms/${formId}/pages`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ type: "email", label: "Email", required: false });
    const page2Key: string = p2.body.data.page.pageKey;

    expect(page1Key).toBeTruthy();
    expect(page2Key).toBeTruthy();
    return { page1Key, page2Key };
  }

  /** Create a rule and return the raw supertest response. */
  async function createRule(
    page1Key: string,
    page2Key: string,
    name = "Sample rule",
  ) {
    return api
      .post(`/api/v1/forms/${formId}/logic`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        category: "display",
        name,
        enabled: true,
        combinator: "and",
        conditions: [
          {
            sourceType: "page",
            sourceKey: page1Key,
            operator: "isNotEmpty",
            value: "",
          },
        ],
        actions: [{ action: "showPage", targetPageKey: page2Key }],
      });
  }

  it("should create a logic rule with an `id` field (not `_id`)", async () => {
    const { page1Key, page2Key } = await setupForm();
    const res = await createRule(page1Key, page2Key);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(typeof res.body.data.id).toBe("string");
    expect(res.body.data._id).toBeUndefined();
  });

  it("should list rules with `id` (not `_id`)", async () => {
    const { page1Key, page2Key } = await setupForm();
    await createRule(page1Key, page2Key);

    const res = await api
      .get(`/api/v1/forms/${formId}/logic`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);

    const rule = res.body.data[0];
    expect(rule.id).toBeDefined();
    expect(typeof rule.id).toBe("string");
    expect(rule._id).toBeUndefined();
  });

  it("should delete a logic rule using its `id`", async () => {
    const { page1Key, page2Key } = await setupForm();
    const created = await createRule(page1Key, page2Key);
    const ruleId: string = created.body.data.id;

    // Regression: rule.id used to be undefined (backend returned `_id`),
    // sending DELETE /logic/undefined → 400/404.
    expect(ruleId).toBeTruthy();
    const res = await api
      .delete(`/api/v1/forms/${formId}/logic/${ruleId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // And the rule is really gone.
    const after = await api
      .get(`/api/v1/forms/${formId}/logic`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(after.body.data).toEqual([]);
  });

  it("should update a logic rule and return it with `id`", async () => {
    const { page1Key, page2Key } = await setupForm();
    const created = await createRule(page1Key, page2Key);
    const updateRuleId: string = created.body.data.id;

    const res = await api
      .patch(`/api/v1/forms/${formId}/logic/${updateRuleId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Updated name" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(updateRuleId);
    expect(res.body.data.name).toBe("Updated name");
    expect(res.body.data._id).toBeUndefined();
  });
});