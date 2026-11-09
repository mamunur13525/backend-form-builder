/// <reference types="jest" />
import request from "supertest";
import app from "../app";

const api = request(app);

describe("Page and Multi-Block Architecture", () => {
  let authToken: string;
  let formId: string;
  let pageId: string;

  beforeEach(async () => {
    // Register and login a fresh user for this test
    const userEmail = `tester_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@example.com`;
    const regRes = await api.post("/api/v1/auth/register").send({
      name: "Tester",
      email: userEmail,
      password: "password123",
    });
    authToken = regRes.body.data.tokens.accessToken;

    // Create a form
    const formRes = await api
      .post("/api/v1/forms")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "Multi Block Form" });
    formId = formRes.body.data.id;
  });

  it("should create a page with custom title and description, and allow empty title/description", async () => {
    // 1. Page with title and description
    const pageRes1 = await api
      .post(`/api/v1/forms/${formId}/pages`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: "Page 1 Title",
        description: "Page 1 Description",
      });

    expect(pageRes1.status).toBe(201);
    expect(pageRes1.body.success).toBe(true);
    expect(pageRes1.body.data.title).toBe("Page 1 Title");
    expect(pageRes1.body.data.description).toBe("Page 1 Description");

    // 2. Page with empty title and empty description
    const pageRes2 = await api
      .post(`/api/v1/forms/${formId}/pages`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: "",
        description: "",
      });

    expect(pageRes2.status).toBe(201);
    expect(pageRes2.body.success).toBe(true);
    expect(pageRes2.body.data.title).toBe("");
    expect(pageRes2.body.data.description).toBe("");
  });

  it("should add multiple blocks to the same page", async () => {
    // Create container page
    const pageRes = await api
      .post(`/api/v1/forms/${formId}/pages`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: "Survey Step",
        description: "Please answer all sections below",
      });
    pageId = pageRes.body.data._id;

    // Block 1: statement
    const block1Res = await api
      .post(`/api/v1/forms/${formId}/pages/${pageId}/blocks`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "statement",
        title: "Welcome Notice",
        description: "Read this before answering",
      });

    expect(block1Res.status).toBe(201);
    expect(block1Res.body.success).toBe(true);
    expect(block1Res.body.data.type).toBe("statement");
    expect(block1Res.body.data.title).toBe("Welcome Notice");
    expect(block1Res.body.data.description).toBe(""); // description removed from question
    expect(block1Res.body.data.order).toBe(1);
    expect(block1Res.body.data.blockKey).toBeDefined();

    // Block 2: shortText input with empty title and description
    const block2Res = await api
      .post(`/api/v1/forms/${formId}/pages/${pageId}/blocks`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "shortText",
        title: "",
        description: "",
        placeholder: "Type something here...",
        required: true,
      });

    expect(block2Res.status).toBe(201);
    expect(block2Res.body.success).toBe(true);
    expect(block2Res.body.data.type).toBe("shortText");
    expect(block2Res.body.data.title).toBe("");
    expect(block2Res.body.data.description).toBe("");
    expect(block2Res.body.data.order).toBe(2);

    // Block 3: rating
    const block3Res = await api
      .post(`/api/v1/forms/${formId}/pages/${pageId}/blocks`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "rating",
        title: "Rate your satisfaction",
        description: "From 1 to 5 stars",
        settings: {
          rating: {
            style: "star",
            max: 5,
          },
        },
      });

    expect(block3Res.status).toBe(201);
    expect(block3Res.body.success).toBe(true);
    expect(block3Res.body.data.type).toBe("rating");
    expect(block3Res.body.data.order).toBe(3);

    // Get all blocks on this page
    const getBlocksRes = await api
      .get(`/api/v1/forms/${formId}/pages/${pageId}/blocks`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(getBlocksRes.status).toBe(200);
    expect(getBlocksRes.body.data).toHaveLength(3);
    expect(getBlocksRes.body.data[0].type).toBe("statement");
    expect(getBlocksRes.body.data[1].type).toBe("shortText");
    expect(getBlocksRes.body.data[2].type).toBe("rating");
  });

  it("should update, reorder and delete blocks on a page", async () => {
    // Create page
    const pageRes = await api
      .post(`/api/v1/forms/${formId}/pages`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "Page For Edits" });
    pageId = pageRes.body.data._id;

    // Create block A and block B
    const blockARes = await api
      .post(`/api/v1/forms/${formId}/pages/${pageId}/blocks`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ type: "shortText", title: "Block A" });
    const blockAId = blockARes.body.data._id;

    const blockBRes = await api
      .post(`/api/v1/forms/${formId}/pages/${pageId}/blocks`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ type: "longText", title: "Block B" });
    const blockBId = blockBRes.body.data._id;

    // Update Block A title and description
    const updateRes = await api
      .patch(`/api/v1/forms/${formId}/pages/${pageId}/blocks/${blockAId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: "",
        description: "Updated description only",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe("");
    expect(updateRes.body.data.description).toBe(""); // description removed from question

    // Reorder blocks (B first, then A)
    const reorderRes = await api
      .patch(`/api/v1/forms/${formId}/pages/${pageId}/blocks/reorder`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        blockIds: [blockBId, blockAId],
      });
    expect(reorderRes.status).toBe(200);

    const reorderedBlocks = await api
      .get(`/api/v1/forms/${formId}/pages/${pageId}/blocks`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(reorderedBlocks.body.data[0]._id).toBe(blockBId);
    expect(reorderedBlocks.body.data[0].order).toBe(1);
    expect(reorderedBlocks.body.data[1]._id).toBe(blockAId);
    expect(reorderedBlocks.body.data[1].order).toBe(2);

    // Delete Block B
    const deleteRes = await api
      .delete(`/api/v1/forms/${formId}/pages/${pageId}/blocks/${blockBId}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(deleteRes.status).toBe(200);

    const afterDelete = await api
      .get(`/api/v1/forms/${formId}/pages/${pageId}/blocks`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(afterDelete.body.data).toHaveLength(1);
    expect(afterDelete.body.data[0]._id).toBe(blockAId);
  });

  it("should publish form with multiple blocks and accept submissions by blockKey", async () => {
    // Create page
    const pageRes = await api
      .post(`/api/v1/forms/${formId}/pages`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "Feedback Page", description: "All in one page" });
    pageId = pageRes.body.data._id;

    // Add block: shortText
    const block1 = await api
      .post(`/api/v1/forms/${formId}/pages/${pageId}/blocks`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ type: "shortText", title: "Name", required: true });

    // Add block: rating
    const block2 = await api
      .post(`/api/v1/forms/${formId}/pages/${pageId}/blocks`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ type: "rating", title: "Score", required: true });

    const block1Key = block1.body.data.blockKey;
    const block2Key = block2.body.data.blockKey;

    // Publish form
    const pubRes = await api
      .patch(`/api/v1/forms/${formId}/publish`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(pubRes.status).toBe(200);
    const slug = pubRes.body.data.slug;

    // Fetch public schema
    const schemaRes = await api.get(`/api/v1/public/forms/${slug}`);
    expect(schemaRes.status).toBe(200);
    expect(schemaRes.body.data.pages).toBeDefined();

    const publishedPage = schemaRes.body.data.pages.find((p: any) => p._id === pageId);
    expect(publishedPage).toBeDefined();
    expect(publishedPage.blocks).toHaveLength(2);

    // Submit response using blockKey
    const submitRes = await api
      .post(`/api/v1/public/forms/${slug}/submit`)
      .send({
        answers: [
          { blockKey: block1Key, type: "shortText", value: "Alice" },
          { blockKey: block2Key, type: "rating", value: 5 },
        ],
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.data.submissionId).toBeDefined();

    // Verify submission answers
    const responsesRes = await api
      .get(`/api/v1/forms/${formId}/responses`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(responsesRes.status).toBe(200);
    expect(responsesRes.body.data).toHaveLength(1);
    expect(responsesRes.body.data[0].answers).toHaveLength(2);
  });

  it("should support /questions endpoints alongside /blocks", async () => {
    // Create page
    const pageRes = await api
      .post(`/api/v1/forms/${formId}/pages`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "Questions Page" });
    const pId = pageRes.body.data._id;

    // Create question via /questions
    const q1 = await api
      .post(`/api/v1/forms/${formId}/pages/${pId}/questions`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ type: "shortText", title: "What is your name?", required: true });
    expect(q1.status).toBe(201);
    expect(q1.body.data.questionKey).toBeDefined();
    expect(q1.body.data.title).toBe("What is your name?");
    const q1Id = q1.body.data._id;

    // Get questions via /questions
    const getRes = await api
      .get(`/api/v1/forms/${formId}/pages/${pId}/questions`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data).toHaveLength(1);

    // Update question via /questions
    const patchRes = await api
      .patch(`/api/v1/forms/${formId}/pages/${pId}/questions/${q1Id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "Full Name" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.title).toBe("Full Name");

    // Delete question via /questions
    const delRes = await api
      .delete(`/api/v1/forms/${formId}/pages/${pId}/questions/${q1Id}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(delRes.status).toBe(200);
  });
});
