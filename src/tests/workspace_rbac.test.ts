/// <reference types="jest" />
import mongoose from "mongoose";
import request from "supertest";
import app from "../app";
import { Workspace, WorkspaceInvitation } from "../models";

const api = request(app);

describe("Workspace Invitation and RBAC Integration", () => {
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

  const registerUser = async (email: string, name: string) => {
    const res = await api.post("/api/v1/auth/register").send({
      name,
      email,
      password: "Password123!",
    });
    return {
      token: res.body.data.tokens.accessToken,
      userId: res.body.data.user.id || res.body.data.user._id,
      email,
    };
  };

  it("should create workspace and automatically make creator an admin", async () => {
    const admin = await registerUser("admin@example.com", "Admin User");

    const wsRes = await api
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Acme Corp" });

    expect(wsRes.status).toBe(201);
    expect(wsRes.body.data.name).toBe("Acme Corp");
    expect(wsRes.body.data.currentUserRole).toBe("admin");
  });

  it("should handle public invitation preview and accept flow with role and form permissions", async () => {
    const admin = await registerUser("admin@example.com", "Admin User");
    const inviteeEmail = "member@example.com";

    // 1. Create workspace
    const wsRes = await api
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Acme Corp" });
    const workspaceId = wsRes.body.data.id;

    // 2. Create two forms in the workspace
    const form1Res = await api
      .post("/api/v1/forms")
      .set("Authorization", `Bearer ${admin.token}`)
      .set("x-workspace-id", workspaceId)
      .send({ title: "Form 1" });
    const form1Id = form1Res.body.data.id;

    const form2Res = await api
      .post("/api/v1/forms")
      .set("Authorization", `Bearer ${admin.token}`)
      .set("x-workspace-id", workspaceId)
      .send({ title: "Form 2" });
    const form2Id = form2Res.body.data.id;

    // 3. Admin invites member with pre-assigned Form 1 only
    const inviteRes = await api
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        email: inviteeEmail,
        role: "member",
        canEditAllForms: false,
        preAssignedFormIds: [form1Id],
      });

    expect(inviteRes.status).toBe(201);
    const invitationToken = inviteRes.body.data.token;
    expect(invitationToken).toBeDefined();

    // 4. Public preview without auth
    const previewRes = await api.get(`/api/v1/workspaces/invitations/${invitationToken}`);
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.data.workspace.name).toBe("Acme Corp");
    expect(previewRes.body.data.email).toBe(inviteeEmail);
    expect(previewRes.body.data.role).toBe("member");

    // 5. Register invitee with the invited email
    const member = await registerUser(inviteeEmail, "Invited Member");

    // 6. Invitee accepts invitation
    const acceptRes = await api
      .post("/api/v1/workspaces/invitations/accept")
      .set("Authorization", `Bearer ${member.token}`)
      .send({ token: invitationToken });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.id).toBe(workspaceId);

    // 7. Test RBAC permissions:
    // Member should be able to edit Form 1
    const editForm1 = await api
      .patch(`/api/v1/forms/${form1Id}`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ title: "Form 1 Updated" });
    expect(editForm1.status).toBe(200);

    // Member should NOT be able to edit Form 2 (not assigned)
    const editForm2 = await api
      .patch(`/api/v1/forms/${form2Id}`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ title: "Form 2 Updated" });
    expect(editForm2.status).toBe(403);

    // Member should NOT be able to delete Form 1 (only admins can delete forms)
    const deleteForm1 = await api
      .delete(`/api/v1/forms/${form1Id}`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(deleteForm1.status).toBe(403);

    // 8. Admin grants access to Form 2
    const grantAccessRes = await api
      .patch(`/api/v1/forms/${form2Id}/access`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        userId: member.userId,
        canEdit: true,
      });
    expect(grantAccessRes.status).toBe(200);

    // Now member CAN edit Form 2
    const editForm2AfterGrant = await api
      .patch(`/api/v1/forms/${form2Id}`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ title: "Form 2 Updated by Member" });
    expect(editForm2AfterGrant.status).toBe(200);
  });

  it("should prevent email mismatch when accepting invitation", async () => {
    const admin = await registerUser("admin@example.com", "Admin User");

    const wsRes = await api
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Acme Corp" });
    const workspaceId = wsRes.body.data.id;

    const inviteRes = await api
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        email: "target@example.com",
        role: "viewer",
      });
    const invitationToken = inviteRes.body.data.token;

    // Different user registers and tries to accept
    const wrongUser = await registerUser("wrong@example.com", "Wrong User");

    const acceptRes = await api
      .post("/api/v1/workspaces/invitations/accept")
      .set("Authorization", `Bearer ${wrongUser.token}`)
      .send({ token: invitationToken });

    expect(acceptRes.status).toBe(403);
    expect(acceptRes.body.message).toContain("This invitation was sent to");
  });

  it("should attach a form to the workspace in the body and list it for a viewer", async () => {
    const admin = await registerUser("admin@example.com", "Admin User");

    const wsRes = await api
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Acme Corp" });
    const workspaceId = wsRes.body.data.id;

    // No x-workspace-id header: the body is the only workspace hint, so this
    // fails if validation strips `workspaceId`.
    const formRes = await api
      .post("/api/v1/forms")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ title: "Shared Form", workspaceId });
    expect(formRes.status).toBe(201);
    expect(formRes.body.data.workspaceId).toBe(workspaceId);
    const formId = formRes.body.data.id;

    const inviteRes = await api
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ email: "viewer@example.com", role: "viewer" });
    const viewer = await registerUser("viewer@example.com", "Viewer");
    await api
      .post("/api/v1/workspaces/invitations/accept")
      .set("Authorization", `Bearer ${viewer.token}`)
      .send({ token: inviteRes.body.data.token });

    const listRes = await api
      .get(`/api/v1/forms?workspaceId=${workspaceId}`)
      .set("Authorization", `Bearer ${viewer.token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.map((form: any) => form.id)).toContain(formId);
  });

  it("should enforce Last Admin Protection", async () => {
    const admin = await registerUser("admin@example.com", "Admin User");

    const wsRes = await api
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Acme Corp" });
    const workspaceId = wsRes.body.data.id;

    // Admin tries to demote self
    const demoteRes = await api
      .patch(`/api/v1/workspaces/${workspaceId}/members/${admin.userId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ role: "member" });

    expect(demoteRes.status).toBe(400);
    expect(demoteRes.body.message).toContain("sole admin");

    // Admin tries to remove self
    const removeRes = await api
      .delete(`/api/v1/workspaces/${workspaceId}/members/${admin.userId}`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(removeRes.status).toBe(400);
    expect(removeRes.body.message).toContain("sole admin");
  });
});
