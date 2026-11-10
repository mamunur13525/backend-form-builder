/**
 * Attach forms created before workspaces existed to a workspace their creator
 * owns, so workspace members (including viewers) can see them.
 *
 *   npm run backfill:form-workspaces
 *
 * Idempotent: only forms with no `workspaceId` are touched.
 *
 * shortcut: only workspaces the creator owns are considered; a form whose
 * creator is merely an admin member elsewhere is left orphaned, upgrade when
 * that case appears in real data.
 */
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { Form } from "../models/Form";
import { Workspace } from "../models/Workspace";
import { User } from "../models/User";

async function backfill() {
  await connectDB();

  const forms = await Form.find({ workspaceId: null }).select("title createdBy");
  let attached = 0;
  let orphaned = 0;

  for (const form of forms) {
    const [user, owned] = await Promise.all([
      User.findById(form.createdBy).select("activeWorkspaceId"),
      Workspace.find({ createdBy: form.createdBy })
        .select("_id createdAt")
        .sort({ createdAt: 1 }),
    ]);

    // Prefer the workspace the creator is currently in, else their first one.
    const active = owned.find((ws) => ws._id.equals(user?.activeWorkspaceId));
    const target = active ?? owned[0];

    if (!target) {
      orphaned++;
      continue;
    }

    form.workspaceId = target._id as mongoose.Types.ObjectId;
    await form.save();
    attached++;
  }

  console.log(
    `Attached ${attached} form(s) to a workspace; left ${orphaned} without one.`
  );
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
