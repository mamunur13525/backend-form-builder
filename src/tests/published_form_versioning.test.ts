/// <reference types="jest" />
import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import { Form } from "../models/Form";
import { FormVersion } from "../models/FormVersion";
import { FormResponse } from "../models/FormResponse";

const api = request(app);

describe("Published Form Draft & Versioning System", () => {
  let authToken: string;
  let formId: string;
  let slug: string;
  let v1Id: string;
  let v2Id: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/typeform_test");
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
    }
  });

  it("should execute complete draft & publish lifecycle according to PRD rules", async () => {
    // 1. Register & authenticate user
    const regRes = await api.post("/api/v1/auth/register").send({
      name: "Admin User",
      email: "admin@example.com",
      password: "password123",
    });
    expect(regRes.status).toBe(201);
    authToken = regRes.body.data.tokens.accessToken;

    // 2. Create form (Draft V1 created)
    const createRes = await api
      .post("/api/v1/forms")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "Customer Feedback" });
    expect(createRes.status).toBe(201);
    formId = createRes.body.data.id;
    slug = createRes.body.data.slug;
    v1Id = createRes.body.data.draftVersionId;

    expect(createRes.body.data.status).toBe("draft");
    expect(createRes.body.data.draftVersionId).toBeDefined();
    expect(createRes.body.data.publishedVersionId).toBeNull();
    expect(createRes.body.data.hasUnpublishedChanges).toBe(false);

    // Add field to draft V1
    const addFieldRes = await api
      .post(`/api/v1/forms/${formId}/fields`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ type: "shortText", label: "Your Name", required: true });
    expect(addFieldRes.status).toBe(201);

    // 3. Public endpoint /f/:slug for unpublished form should return 404
    const pubUnpubRes = await api.get(`/f/${slug}`);
    expect(pubUnpubRes.status).toBe(404);

    // 4. First Publish
    const publishRes = await api
      .post(`/api/v1/forms/${formId}/publish`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.status).toBe("published");
    expect(publishRes.body.data.publishedVersionId).toBe(v1Id);
    expect(publishRes.body.data.draftVersionId).toBe(v1Id);
    expect(publishRes.body.data.hasUnpublishedChanges).toBe(false);

    // 5. Public endpoint /f/:slug for published form returns V1 schema
    const pubRes = await api.get(`/f/${slug}`);
    expect(pubRes.status).toBe(200);
    expect(pubRes.body.data.fields).toHaveLength(1);
    expect(pubRes.body.data.fields[0].label).toBe("Your Name");

    // 6. Admin edits published form (adds a second question) -> Automatically clones V1 into V2 draft
    const addQ2Res = await api
      .post(`/api/v1/forms/${formId}/fields`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ type: "email", label: "Your Email", required: false });
    expect(addQ2Res.status).toBe(201);

    // Check form status via admin GET /api/v1/forms/:id
    const formAdminRes = await api
      .get(`/api/v1/forms/${formId}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(formAdminRes.status).toBe(200);
    expect(formAdminRes.body.data.hasUnpublishedChanges).toBe(true);
    expect(formAdminRes.body.data.publishedVersionId).toBe(v1Id);
    v2Id = formAdminRes.body.data.draftVersionId;
    expect(v2Id).not.toBe(v1Id); // Cloned into new version V2!
    expect(formAdminRes.body.data.fields).toHaveLength(2); // Admin sees draft V2

    // 7. Public endpoint /f/:slug still returns V1 (1 field)! Respondents never see draft changes.
    const pubResWhileDraft = await api.get(`/f/${slug}`);
    expect(pubResWhileDraft.status).toBe(200);
    expect(pubResWhileDraft.body.data.fields).toHaveLength(1);

    // 8. Respondent submits response against published V1
    const subRes = await api.post(`/api/v1/public/forms/${slug}/submit`).send({
      answers: [{ fieldKey: pubResWhileDraft.body.data.fields[0].fieldKey, label: "Your Name", type: "shortText", value: "Alice" }],
    });
    expect(subRes.status).toBe(200);
    expect(subRes.body.data.formVersionId).toBe(v1Id);

    // Verify stored response in DB has formVersionId == v1Id
    const responseDoc = await FormResponse.findById(subRes.body.data.submissionId);
    expect(responseDoc?.formVersionId?.toString()).toBe(v1Id);

    // 9. Discard draft -> Deletes V2, resets draftVersionId = V1, hasUnpublishedChanges = false
    const discardRes = await api
      .post(`/api/v1/forms/${formId}/discard`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(discardRes.status).toBe(200);
    expect(discardRes.body.data.draftVersionId).toBe(v1Id);
    expect(discardRes.body.data.hasUnpublishedChanges).toBe(false);
    expect(discardRes.body.data.fields).toHaveLength(1);

    // Verify V2 was deleted from DB
    const deletedV2 = await FormVersion.findById(v2Id);
    expect(deletedV2).toBeNull();

    // 10. Edit again (creates new draft V3), update title and publish
    const updateTitleRes = await api
      .patch(`/api/v1/forms/${formId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "Customer Feedback V2" });
    expect(updateTitleRes.status).toBe(200);
    expect(updateTitleRes.body.data.hasUnpublishedChanges).toBe(true);
    const v3Id = updateTitleRes.body.data.draftVersionId;

    // Publish V3
    const pubV3Res = await api
      .post(`/api/v1/forms/${formId}/publish`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(pubV3Res.status).toBe(200);
    expect(pubV3Res.body.data.publishedVersionId).toBe(v3Id);
    expect(pubV3Res.body.data.hasUnpublishedChanges).toBe(false);

    // 11. GET /api/v1/forms/:id/versions returns version history
    const versionsRes = await api
      .get(`/api/v1/forms/${formId}/versions`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(versionsRes.status).toBe(200);
    expect(Array.isArray(versionsRes.body.data)).toBe(true);
    expect(versionsRes.body.data.length).toBeGreaterThanOrEqual(2);
  });
});
