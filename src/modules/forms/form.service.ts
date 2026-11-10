import mongoose from "mongoose";
import { nanoid } from "nanoid";
import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { generateUniqueSlug } from "../../utils/slug";
import { getPaginationMeta } from "../../utils/pagination";
import * as formRepo from "./form.repository";
import { FormVersion } from "../../models/FormVersion";
import { Form, normalizeFormSettings } from "../../models/Form";
import { createInitialVersion, ensureDraftVersion } from "./version.helper";
import { buildFormTheme } from "./form.theme";
import { buildPageSettings } from "../pages/page.settings";
import { buildDefaultEndPageContent } from "../../constants/endPage";
import { findLogicsByFormId } from "../logic/logic.repository";
import { User } from "../../models/User";
import { Workspace } from "../../models/Workspace";
import * as billingService from "../billing/billing.service";
import {
  ClosedFormStatus,
  formStatus,
  isClosedFormStatus,
} from "../../constants/status";
import {
  CreateFormBody,
  UpdateFormBody,
  UpdateFormSettingsBody,
  UpdateFormThemeBody,
  UpdateFormShareBody,
  UpdateFormAccessBody,
  FormResponse,
} from "./form.types";

const buildDefaultInitialPages = () => {
  const blockId = new mongoose.Types.ObjectId();
  const blockKey = `block_${nanoid(8)}`;
  return [
    {
      _id: new mongoose.Types.ObjectId(),
      pageKey: `page_${nanoid(8)}`,
      title: "Statement",
      description: "",
      label: "Statement",
      type: "statement" as const,
      order: 1,
      helperText: "",
      placeholder: "",
      required: false,
      coverImage: undefined,
      options: [],
      validation: {},
      settings: buildPageSettings("statement"),
      appearance: {
        width: "full" as const,
        icon: "",
        submitButtonText: "",
        submitButtonColor: "",
      },
      blocks: [
        {
          _id: blockId,
          blockKey,
          title: "Statement",
          description: "",
          label: "Statement",
          helperText: "",
          placeholder: "",
          type: "statement" as const,
          required: false,
          order: 1,
          coverImage: undefined,
          options: [],
          validation: {},
          settings: buildPageSettings("statement"),
          appearance: {
            width: "full" as const,
            icon: "",
            submitButtonText: "",
            submitButtonColor: "",
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      isActive: true,
      logic: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
};

const buildDefaultEndPages = () => {
  const defaultContent = buildDefaultEndPageContent();
  return [
    {
      _id: new mongoose.Types.ObjectId(),
      key: `end_page_${nanoid(8)}`,
      title: defaultContent.title,
      helperText: defaultContent.helperText,
      paragraph: defaultContent.paragraph,
      button: {
        text: defaultContent.button.text,
        link: defaultContent.button.link,
      },
      redirect: {
        isRedirect: false,
        link: "",
      },
      alignment: "left" as const,
      showConfetti: false,
      socialShareButtons: false,
      socialShareMessage: "",
      socialShareMedia: {
        facebook: false,
        twitter: false,
        linkedin: false,
        whatsapp: false,
      },
      embed: {
        url: "",
      },
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
};

export const assertCanEditForm = async (userId: string, formId: string): Promise<any> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  // If form has no workspace attached, creator has full rights
  if (!form.workspaceId) {
    const creatorId = (form.createdBy?._id || form.createdBy || "").toString();
    if (creatorId && creatorId !== userId.toString()) {
      throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to edit this form");
    }
    return form;
  }

  const workspace = await Workspace.findById(form.workspaceId);
  if (!workspace) {
    return form;
  }

  const member = (workspace.members || []).find(
    (m: any) => (m.userId?._id || m.userId || "").toString() === userId.toString()
  );
  const isOwner = (workspace.createdBy?._id || workspace.createdBy || "").toString() === userId.toString();

  if (!member && !isOwner) {
    throw new ApiError(httpStatus.FORBIDDEN, "You do not have access to this workspace");
  }

  const role = member?.role || (isOwner ? "admin" : "viewer");

  if (role === "admin") {
    return form;
  }

  if (role === "member") {
    const isAllowed =
      !!member?.canEditAllForms ||
      (form.allowedEditors || []).some((id: any) => id.toString() === userId.toString());
    if (isAllowed) {
      return form;
    }
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You do not have permission to edit this form. Contact a workspace admin."
    );
  }

  throw new ApiError(httpStatus.FORBIDDEN, "Viewers have read-only access and cannot edit forms");
};

export const assertCanDeleteForm = async (userId: string, formId: string): Promise<any> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  if (!form.workspaceId) {
    const creatorId = (form.createdBy?._id || form.createdBy || "").toString();
    if (creatorId && creatorId !== userId.toString()) {
      throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to delete this form");
    }
    return form;
  }

  const workspace = await Workspace.findById(form.workspaceId);
  if (!workspace) return form;

  const member = (workspace.members || []).find(
    (m: any) => (m.userId?._id || m.userId || "").toString() === userId.toString()
  );
  const isOwner = (workspace.createdBy?._id || workspace.createdBy || "").toString() === userId.toString();
  const role = member?.role || (isOwner ? "admin" : "viewer");

  if (role !== "admin") {
    throw new ApiError(httpStatus.FORBIDDEN, "Only workspace admins can delete forms");
  }
  return form;
};

export const toFormResponse = async (
  form: any,
  withLogic = false,
  userId?: string
): Promise<FormResponse> => {
  let draftVersion: any = null;
  if (form.draftVersionId) {
    draftVersion = await FormVersion.findById(form.draftVersionId).lean();
  }

  // Filled in against the defaults so forms created before a theme property
  // existed still return a complete appearance object.
  const theme = buildFormTheme(draftVersion?.formSchema?.theme || form.theme);
  const pages = draftVersion?.formSchema?.pages || form.pages || [];
  const endPages = draftVersion?.formSchema?.endPages || form.endPages || [];
  const settings = normalizeFormSettings(draftVersion?.formSchema?.settings || form.settings);

  // Logic rules live in their own collection; only single-form responses ask
  // for them (list endpoints stay light — the frontend refetches rules per
  // form anyway).
  const logic = withLogic ? await findLogicsByFormId(String(form._id)) : undefined;

  let canEdit = true;
  if (userId && form.workspaceId) {
    const ws = await Workspace.findById(form.workspaceId).lean();
    if (ws) {
      const member = (ws.members || []).find(
        (m: any) => (m.userId?._id || m.userId || "").toString() === userId.toString()
      );
      const isOwner = (ws.createdBy?._id || ws.createdBy || "").toString() === userId.toString();
      const role = member?.role || (isOwner ? "admin" : "viewer");
      if (role === "admin") {
        canEdit = true;
      } else if (role === "member") {
        canEdit = !!member?.canEditAllForms ||
          (form.allowedEditors || []).some((id: any) => id.toString() === userId.toString());
      } else {
        canEdit = false;
      }
    }
  }

  return {
    id: form._id.toString(),
    title: form.title,
    slug: form.slug,
    status: form.status,
    draftVersionId: form.draftVersionId?.toString(),
    publishedVersionId: form.publishedVersionId?.toString() || null,
    hasUnpublishedChanges: !!form.hasUnpublishedChanges,
    version: draftVersion?.version || 1,
    theme,
    pages,
    endPages,
    settings,
    workspaceId: form.workspaceId?.toString(),
    allowedEditors: (form.allowedEditors || []).map((id: any) => id.toString()),
    canEdit,
    ...(logic !== undefined ? { logic } : {}),
    createdBy: form.createdBy?._id?.toString() || form.createdBy?.toString(),
    updatedBy: form.updatedBy?.toString(),
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
};

export const createForm = async (
  userId: string,
  data: CreateFormBody,
): Promise<FormResponse> => {
  // Enforce the account's plan form limit before creating anything.
  await billingService.assertCanCreateForm(userId);

  // Resolve target workspace
  let workspaceId = data.workspaceId;
  if (!workspaceId) {
    const user = await User.findById(userId);
    if (user?.activeWorkspaceId) {
      workspaceId = user.activeWorkspaceId.toString();
    }
  }

  if (workspaceId) {
    const workspace = await Workspace.findById(workspaceId);
    if (workspace) {
      const member = (workspace.members || []).find(
        (m: any) => (m.userId?._id || m.userId || "").toString() === userId.toString()
      );
      const isOwner = (workspace.createdBy?._id || workspace.createdBy || "").toString() === userId.toString();
      const role = member?.role || (isOwner ? "admin" : "viewer");
      if (role === "viewer") {
        throw new ApiError(httpStatus.FORBIDDEN, "Viewers cannot create forms in this workspace");
      }
    }
  }

  const slug = await generateUniqueSlug(data.title, formRepo.checkSlugExists);
  const defaultPages = buildDefaultInitialPages();
  const defaultEndPages = buildDefaultEndPages();

  const form = await formRepo.createForm({
    title: data.title,
    slug,
    createdBy: userId,
    workspaceId: workspaceId || undefined,
    allowedEditors: [new mongoose.Types.ObjectId(userId)],
  });

  const v1 = await createInitialVersion(form._id, userId, {
    pages: defaultPages,
    endPages: defaultEndPages,
  });
  form.draftVersionId = v1._id as any;
  form.publishedVersionId = null;
  form.hasUnpublishedChanges = false;
  form.status = formStatus.DRAFT;
  form.pages = defaultPages as any;
  form.endPages = defaultEndPages as any;
  await form.save();

  return toFormResponse(form, false, userId);
};

export const getAllForms = async (
  userId: string,
  skip: number,
  limit: number,
  sort: Record<string, 1 | -1>,
  filter: Record<string, any> = {},
  workspaceId?: string
) => {
  let targetWorkspaceId = workspaceId;
  if (!targetWorkspaceId) {
    const user = await User.findById(userId);
    if (user?.activeWorkspaceId) {
      targetWorkspaceId = user.activeWorkspaceId.toString();
    }
  }

  let query: any;
  if (targetWorkspaceId) {
    query = {
      ...filter,
      $or: [
        { workspaceId: targetWorkspaceId },
        { createdBy: userId, workspaceId: null },
      ],
    };
  } else {
    query = { ...filter, createdBy: userId };
  }

  const [forms, total] = await Promise.all([
    formRepo.findAllForms(skip, limit, sort, query),
    formRepo.countForms(query),
  ]);
  const formResponses = await Promise.all(forms.map((form) => toFormResponse(form, false, userId)));
  return {
    forms: formResponses,
    meta: getPaginationMeta(total, Math.floor(skip / limit) + 1, limit),
  };
};

export const getFormById = async (formId: string, userId?: string): Promise<FormResponse> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  return toFormResponse(form, true, userId);
};

export const updateForm = async (
  formId: string,
  data: UpdateFormBody,
  userId?: string
): Promise<FormResponse> => {
  if (userId) {
    await assertCanEditForm(userId, formId);
  }

  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  await ensureDraftVersion(form);

  if (data.title !== undefined) {
    const existingForm = await formRepo.checkTitleExists(data.title, formId);
    if (existingForm) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Form with this title already exists");
    }
    form.title = data.title;
  }

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
  }
  await form.save();

  return toFormResponse(form, false, userId);
};

export const deleteForm = async (formId: string, userId?: string): Promise<void> => {
  if (userId) {
    await assertCanDeleteForm(userId, formId);
  }

  const form = await formRepo.deleteForm(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  await FormVersion.deleteMany({ formId });
};

export const duplicateForm = async (
  userId: string,
  formId: string,
  title: string,
): Promise<FormResponse> => {
  const original = await formRepo.findFormById(formId);
  if (!original) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  const origVersion = await ensureDraftVersion(original, userId);

  const formTitle = title || original.title + " (copy)";
  const slug = await generateUniqueSlug(
    formTitle,
    formRepo.checkSlugExists,
  );

  const newForm = await formRepo.createForm({
    title: formTitle,
    slug,
    createdBy: userId,
    // A copy belongs wherever the original lives; without this it would be an
    // orphan invisible to the rest of the workspace.
    workspaceId: original.workspaceId?.toString(),
  });

  const v1 = await createInitialVersion(newForm._id, userId, {
    pages: JSON.parse(JSON.stringify(origVersion.formSchema.pages || [])),
    endPages: JSON.parse(JSON.stringify(origVersion.formSchema.endPages || [])),
    settings: JSON.parse(JSON.stringify(origVersion.formSchema.settings || {})),
    theme: buildFormTheme(origVersion.formSchema.theme),
  });

  newForm.draftVersionId = v1._id as any;
  newForm.publishedVersionId = null;
  newForm.hasUnpublishedChanges = false;
  newForm.status = formStatus.DRAFT;
  newForm.pages = JSON.parse(JSON.stringify(origVersion.formSchema.pages || []));
  newForm.endPages = JSON.parse(JSON.stringify(origVersion.formSchema.endPages || []));
  await newForm.save();

  return toFormResponse(newForm);
};

export const archiveForm = async (formId: string, userId?: string): Promise<FormResponse> => {
  if (userId) await assertCanEditForm(userId, formId);
  const form = await formRepo.updateForm(formId, { status: formStatus.ARCHIVED });
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  return toFormResponse(form, false, userId);
};

export const restoreForm = async (formId: string, userId?: string): Promise<FormResponse> => {
  if (userId) await assertCanEditForm(userId, formId);
  const form = await formRepo.updateForm(formId, { status: formStatus.DRAFT });
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  return toFormResponse(form, false, userId);
};

export const publishForm = async (formId: string, userId?: string): Promise<FormResponse> => {
  if (userId) await assertCanEditForm(userId, formId);
  const form = await formRepo.findFormById(formId);

  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  // Re-publishing a form that was unpublished or cancelled without any edits
  // in between restores the exact version that was live before, rather than
  // promoting a freshly cloned draft.
  if (isClosedFormStatus(form.status) && form.publishedVersionId && !form.hasUnpublishedChanges) {
    const publishedVersion = await FormVersion.findById(form.publishedVersionId);
    if (publishedVersion) {
      form.status = formStatus.PUBLISHED;
      form.draftVersionId = publishedVersion._id as any;
      form.hasUnpublishedChanges = false;
      form.pages = publishedVersion.formSchema.pages as any;
      form.endPages = (publishedVersion.formSchema.endPages || []) as any;
      form.settings = publishedVersion.formSchema.settings as any;
      form.theme = publishedVersion.formSchema.theme as any;
      await form.save();
      return toFormResponse(form, false, userId);
    }
  }

  const draftVersion = await ensureDraftVersion(form);
  form.publishedVersionId = draftVersion._id as any;
  form.status = formStatus.PUBLISHED;
  form.hasUnpublishedChanges = false;

  // Sync schema to Form document for backwards compatibility
  form.pages = draftVersion.formSchema.pages as any;
  form.endPages = (draftVersion.formSchema.endPages || []) as any;
  form.settings = draftVersion.formSchema.settings as any;
  form.theme = draftVersion.formSchema.theme as any;

  await form.save();
  return toFormResponse(form, false, userId);
};

/**
 * Takes a live form down. The published version is retained so the form can be
 * published again unchanged, and so existing responses keep a resolvable
 * version reference.
 */
export const unpublishForm = async (formId: string, userId?: string): Promise<FormResponse> => {
  if (userId) await assertCanEditForm(userId, formId);
  return closePublishedForm(formId, formStatus.UNPUBLISHED, userId);
};

/** Permanently closes a live form. Retains the published version like unpublish. */
export const cancelForm = async (formId: string, userId?: string): Promise<FormResponse> => {
  if (userId) await assertCanEditForm(userId, formId);
  return closePublishedForm(formId, formStatus.CANCELLED, userId);
};

const closePublishedForm = async (
  formId: string,
  status: ClosedFormStatus,
  userId?: string
): Promise<FormResponse> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  if (form.status === status) {
    return toFormResponse(form, false, userId);
  }

  if (form.status !== formStatus.PUBLISHED && !isClosedFormStatus(form.status)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Only a published form can be ${status}`,
    );
  }

  form.status = status;
  await form.save();
  return toFormResponse(form, false, userId);
};

export const discardDraft = async (formId: string, userId?: string): Promise<FormResponse> => {
  if (userId) await assertCanEditForm(userId, formId);
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  if (
    form.hasUnpublishedChanges &&
    form.publishedVersionId &&
    form.draftVersionId &&
    form.draftVersionId.toString() !== form.publishedVersionId.toString()
  ) {
    await FormVersion.findByIdAndDelete(form.draftVersionId);
    form.draftVersionId = form.publishedVersionId;
    form.hasUnpublishedChanges = false;
    await form.save();
  }

  return toFormResponse(form, false, userId);
};

export const getFormVersions = async (formId: string): Promise<any[]> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  const versions = await FormVersion.find({ formId: form._id })
    .sort({ version: -1 })
    .lean();

  return versions.map((v) => ({
    id: v._id.toString(),
    formId: v.formId.toString(),
    version: v.version,
    isPublished: form.publishedVersionId?.toString() === v._id.toString(),
    isDraft: form.draftVersionId?.toString() === v._id.toString(),
    createdBy: v.createdBy.toString(),
    createdAt: v.createdAt,
    formSchema: v.formSchema,
  }));
};

export const getFormSlug = async (
  formId: string,
): Promise<{ slug: string; publicUrl: string }> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  return {
    slug: form.slug,
    publicUrl: `/public/forms/${form.slug}`,
  };
};

export const updateFormSettings = async (
  formId: string,
  data: UpdateFormSettingsBody,
  userId?: string
): Promise<FormResponse> => {
  if (userId) await assertCanEditForm(userId, formId);
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  const draftVersion = await ensureDraftVersion(form);
  draftVersion.formSchema.settings = {
    ...draftVersion.formSchema.settings,
    ...data,
  };

  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
    await form.save();
  }

  return toFormResponse(form, false, userId);
};

export const updateFormTheme = async (
  formId: string,
  data: UpdateFormThemeBody,
  userId?: string
): Promise<FormResponse> => {
  if (userId) await assertCanEditForm(userId, formId);
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  const draftVersion = await ensureDraftVersion(form);
  draftVersion.formSchema.theme = buildFormTheme(draftVersion.formSchema.theme, data);

  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
    await form.save();
  }

  return toFormResponse(form, false, userId);
};

export const updateFormShare = async (
  formId: string,
  data: UpdateFormShareBody,
  userId?: string
): Promise<any> => {
  if (userId) await assertCanEditForm(userId, formId);
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  const share = await formRepo.upsertFormShare(formId, data);
  return {
    formId: share.formId.toString(),
    publicUrl: share.publicUrl,
    isPublic: share.isPublic,
    password: share.password ? "****" : "",
    expiresAt: share.expiresAt,
  };
};

export const getFormAccess = async (formId: string, userId: string) => {
  const form = await formRepo.findFormById(formId);
  if (!form) throw new ApiError(httpStatus.NOT_FOUND, "Form not found");

  if (!form.workspaceId) {
    return {
      formId,
      allowedEditors: (form.allowedEditors || []).map((id: any) => id.toString()),
      members: [],
    };
  }

  const workspace = await Workspace.findById(form.workspaceId)
    .populate("members.userId", "name email avatarUrl")
    .lean();
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");

  const callerMember = (workspace.members || []).find(
    (m: any) => (m.userId?._id || m.userId || "").toString() === userId.toString()
  );
  const isOwner = (workspace.createdBy?._id || workspace.createdBy || "").toString() === userId.toString();
  const callerRole = callerMember?.role || (isOwner ? "admin" : "viewer");

  if (callerRole !== "admin") {
    throw new ApiError(httpStatus.FORBIDDEN, "Only workspace admins can view form access permissions");
  }

  const allowedEditorSet = new Set((form.allowedEditors || []).map((id: any) => id.toString()));

  const members = (workspace.members || []).map((m: any) => {
    const u = m.userId || {};
    const uid = (u._id || u.id || m.userId || "").toString();
    const canEdit = m.role === "admin" || !!m.canEditAllForms || allowedEditorSet.has(uid);

    return {
      userId: uid,
      name: u.name || "",
      email: u.email || "",
      avatarUrl: u.avatarUrl || "",
      role: m.role,
      canEditAllForms: !!m.canEditAllForms,
      canEdit,
    };
  });

  return {
    formId,
    allowedEditors: Array.from(allowedEditorSet),
    members,
  };
};

export const updateFormAccess = async (
  formId: string,
  userId: string,
  data: UpdateFormAccessBody
) => {
  const form = await formRepo.findFormById(formId);
  if (!form) throw new ApiError(httpStatus.NOT_FOUND, "Form not found");

  if (!form.workspaceId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Form is not associated with a workspace");
  }

  const workspace = await Workspace.findById(form.workspaceId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");

  const callerMember = (workspace.members || []).find(
    (m: any) => (m.userId?._id || m.userId || "").toString() === userId.toString()
  );
  const isOwner = (workspace.createdBy?._id || workspace.createdBy || "").toString() === userId.toString();
  const callerRole = callerMember?.role || (isOwner ? "admin" : "viewer");

  if (callerRole !== "admin") {
    throw new ApiError(httpStatus.FORBIDDEN, "Only workspace admins can manage form access");
  }

  if (Array.isArray(data.allowedEditors)) {
    form.allowedEditors = data.allowedEditors.map((id) => new mongoose.Types.ObjectId(id)) as any;
  } else if (data.userId && data.canEdit !== undefined) {
    const targetUid = data.userId;
    const current = (form.allowedEditors || []).map((id: any) => id.toString());
    if (data.canEdit) {
      if (!current.includes(targetUid)) {
        form.allowedEditors = [...(form.allowedEditors || []), new mongoose.Types.ObjectId(targetUid)] as any;
      }
    } else {
      form.allowedEditors = (form.allowedEditors || []).filter(
        (id: any) => id.toString() !== targetUid
      ) as any;
    }
  }

  await form.save();
  return getFormAccess(formId, userId);
};
