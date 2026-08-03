/// <reference types="jest" />
import request from "supertest";
import mongoose from "mongoose";
import app from "../app";

const api = request(app);

/**
 * Requires a reachable MongoDB (MONGODB_URI), like the other integration
 * suites in this folder.
 */
describe("Closed form lifecycle (unpublished / cancelled)", () => {
  let authToken: string;
  let formId: string;
  let slug: string;
  let publishedVersionId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_URI || "mongodb://localhost:27017/typeform_test"
      );
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  const publishFreshForm = async () => {
    const regRes = await api.post("/api/v1/auth/register").send({
      name: "Owner",
      email: `owner${Date.now()}@example.com`,
      password: "password123",
    });
    authToken = regRes.body.data.tokens.accessToken;

    const createRes = await api
      .post("/api/v1/forms")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: `Feedback ${Date.now()}` });
    formId = createRes.body.data.id;
    slug = createRes.body.data.slug;

    await api
      .post(`/api/v1/forms/${formId}/fields`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ type: "shortText", label: "Your Name", required: true });

    const pubRes = await api
      .post(`/api/v1/forms/${formId}/publish`)
      .set("Authorization", `Bearer ${authToken}`);
    publishedVersionId = pubRes.body.data.publishedVersionId;
  };

  it("unpublishes to 'unpublished' while retaining the published version", async () => {
    await publishFreshForm();

    const unpubRes = await api
      .patch(`/api/v1/forms/${formId}/unpublish`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(unpubRes.status).toBe(200);
    expect(unpubRes.body.data.status).toBe("unpublished");
    // Retained so the form can be re-published unchanged.
    expect(unpubRes.body.data.publishedVersionId).toBe(publishedVersionId);
  });

  it("answers public reads for an unpublished form with 410 and a reason code", async () => {
    await publishFreshForm();
    await api
      .patch(`/api/v1/forms/${formId}/unpublish`)
      .set("Authorization", `Bearer ${authToken}`);

    for (const path of [
      `/f/${slug}`,
      `/api/v1/public/forms/${slug}`,
      `/api/v1/public/forms/${slug}/schema`,
      `/api/v1/public/forms/${slug}/theme`,
    ]) {
      const res = await api.get(path);
      expect(res.status).toBe(410);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].code).toBe("FORM_UNPUBLISHED");
      expect(res.body.errors[0].status).toBe("unpublished");
    }
  });

  it("rejects submissions to an unpublished form with 410", async () => {
    await publishFreshForm();
    await api
      .patch(`/api/v1/forms/${formId}/unpublish`)
      .set("Authorization", `Bearer ${authToken}`);

    const subRes = await api
      .post(`/api/v1/public/forms/${slug}/submit`)
      .send({ answers: [] });
    expect(subRes.status).toBe(410);
    expect(subRes.body.errors[0].code).toBe("FORM_UNPUBLISHED");

    const draftRes = await api
      .post(`/api/v1/public/forms/${slug}/save-draft`)
      .send({ answers: [] });
    expect(draftRes.status).toBe(410);
  });

  it("answers a cancelled form with its own reason code", async () => {
    await publishFreshForm();

    const cancelRes = await api
      .patch(`/api/v1/forms/${formId}/cancel`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe("cancelled");
    expect(cancelRes.body.data.publishedVersionId).toBe(publishedVersionId);

    const res = await api.get(`/f/${slug}`);
    expect(res.status).toBe(410);
    expect(res.body.errors[0].code).toBe("FORM_CANCELLED");
    expect(res.body.errors[0].status).toBe("cancelled");
  });

  it("still keeps a draft form at 404, not 410", async () => {
    const regRes = await api.post("/api/v1/auth/register").send({
      name: "Owner",
      email: `draftowner${Date.now()}@example.com`,
      password: "password123",
    });
    const token = regRes.body.data.tokens.accessToken;
    const createRes = await api
      .post("/api/v1/forms")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: `Never Published ${Date.now()}` });

    const res = await api.get(`/f/${createRes.body.data.slug}`);
    expect(res.status).toBe(404);
  });

  it("lets an already-submitted respondent still read submit-status after closing", async () => {
    await publishFreshForm();

    const schemaRes = await api.get(`/api/v1/public/forms/${slug}/schema`);
    const fieldKey = schemaRes.body.data.fields[0].fieldKey;

    const subRes = await api.post(`/api/v1/public/forms/${slug}/submit`).send({
      answers: [
        { fieldKey, label: "Your Name", type: "shortText", value: "Alice" },
      ],
    });
    expect(subRes.status).toBe(200);
    const submissionId = subRes.body.data.submissionId;

    await api
      .patch(`/api/v1/forms/${formId}/cancel`)
      .set("Authorization", `Bearer ${authToken}`);

    const statusRes = await api.get(
      `/api/v1/public/forms/${slug}/submit-status/${submissionId}`
    );
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.submissionId).toBe(submissionId);
  });

  it("re-publishes an unedited closed form back onto the same version", async () => {
    await publishFreshForm();
    await api
      .patch(`/api/v1/forms/${formId}/unpublish`)
      .set("Authorization", `Bearer ${authToken}`);

    const rePubRes = await api
      .post(`/api/v1/forms/${formId}/publish`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(rePubRes.status).toBe(200);
    expect(rePubRes.body.data.status).toBe("published");
    expect(rePubRes.body.data.publishedVersionId).toBe(publishedVersionId);
    expect(rePubRes.body.data.hasUnpublishedChanges).toBe(false);

    const pubRes = await api.get(`/f/${slug}`);
    expect(pubRes.status).toBe(200);
    expect(pubRes.body.data.fields).toHaveLength(1);
  });
});
