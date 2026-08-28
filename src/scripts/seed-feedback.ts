/**
 * Seed the feedback board + changelog with the reference content.
 *
 *   npm run seed:feedback
 *
 * Idempotent: clears the Feedback / FeedbackComment / Update collections and
 * upserts the author users, then re-inserts the transcribed seed data.
 */
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { User } from "../models/User";
import { Feedback } from "../models/Feedback";
import { FeedbackComment } from "../models/Comment";
import { Update } from "../models/Update";
import { hashPassword } from "../modules/auth/auth.utils";
import type { IUpdateBlock } from "../models/Update";
import type { FeedbackStatus } from "../models/Feedback";

const BOARD = "feature-requests";

type AuthorKey =
  | "abhishek" | "mario" | "juststart" | "oleg" | "noelle" | "kit"
  | "sophie" | "ravi" | "amara" | "dan" | "lena" | "tom";

const AUTHORS: Record<AuthorKey, { name: string; role: "admin" | "editor" | "viewer" }> = {
  abhishek: { name: "Abhishek", role: "admin" },
  mario: { name: "Mario H", role: "viewer" },
  juststart: { name: "JUST START", role: "viewer" },
  oleg: { name: "Oleg Zvyagintsev", role: "viewer" },
  noelle: { name: "Noelle Lucien", role: "viewer" },
  kit: { name: "Kit", role: "viewer" },
  sophie: { name: "Sophie P", role: "viewer" },
  ravi: { name: "Ravi F", role: "viewer" },
  amara: { name: "Amara H", role: "viewer" },
  dan: { name: "Daniel K", role: "viewer" },
  lena: { name: "Lena R", role: "viewer" },
  tom: { name: "Tom V", role: "viewer" },
};

const emailFor = (key: string) => `${key}@youform.demo`;

interface SeedPost {
  ref: string;
  slug: string;
  title: string;
  description?: string;
  status: FeedbackStatus;
  author: AuthorKey;
  upvotes: number;
  commentCount: number;
  createdAt: string;
  commenters?: AuthorKey[];
}

const POSTS: SeedPost[] = [
  { ref: "p1", slug: "make-com-connection-for-automations", title: "Make.com connection for automations [Solution available check pinned comment]", status: "reviewing", author: "mario", upvotes: 29, commentCount: 6, createdAt: "2026-05-02T10:00:00Z", commenters: ["abhishek", "sophie", "ravi"] },
  { ref: "p2", slug: "builder-on-mobile", title: "Builder on mobile", description: "Currently the builder isn't available in small screens like mobile and tabs. Would be good idea for someone to create a form on the go without needing to go to desktop or laptop.", status: "planned", author: "abhishek", upvotes: 27, commentCount: 4, createdAt: "2026-04-18T09:30:00Z", commenters: ["mario", "lena"] },
  { ref: "p3", slug: "airtable-integration", title: "Airtable integration", status: "planned", author: "juststart", upvotes: 24, commentCount: 1, createdAt: "2026-04-10T14:12:00Z" },
  { ref: "p4", slug: "ability-to-search-and-filter-submissions", title: "Ability to search and filter submissions [Solution available, check pinned comment]", status: "planned", author: "abhishek", upvotes: 23, commentCount: 4, createdAt: "2026-03-28T11:45:00Z", commenters: ["kit", "dan"] },
  { ref: "p5", slug: "show-percentage-of-form-completed", title: "Show percentage of how much of form is completed so far.", status: "reviewing", author: "abhishek", upvotes: 20, commentCount: 1, createdAt: "2026-03-20T08:05:00Z" },
  { ref: "p6", slug: "password-protect-a-form", title: "Password protect a form [Solution available please check pinned comment]", description: "For admin can enable a password protect option. Form responder will then need to enter that password to start filling the form.", status: "reviewing", author: "abhishek", upvotes: 19, commentCount: 3, createdAt: "2025-09-17T12:00:00Z", commenters: ["noelle", "sophie", "ravi", "amara"] },
  { ref: "p7", slug: "n8n-integration", title: "n8n integration", status: "reviewing", author: "oleg", upvotes: 18, commentCount: 2, createdAt: "2026-02-14T16:20:00Z" },
  { ref: "p8", slug: "conditional-logic-jumps", title: "Conditional logic jumps between pages", description: "Let a page route to different follow-up pages based on the answer, not just show/hide fields.", status: "in_progress", author: "lena", upvotes: 16, commentCount: 5, createdAt: "2026-02-02T09:00:00Z" },
  { ref: "p9", slug: "stripe-payment-field", title: "Stripe payment field", description: "Collect a payment as part of the form submission.", status: "planned", author: "dan", upvotes: 15, commentCount: 2, createdAt: "2026-01-22T13:40:00Z" },
  { ref: "p10", slug: "dark-mode-for-forms", title: "Dark mode for published forms", status: "completed", author: "tom", upvotes: 14, commentCount: 3, createdAt: "2025-12-11T10:10:00Z" },
  { ref: "p11", slug: "custom-thank-you-redirect", title: "Custom thank-you page redirect delay", status: "completed", author: "kit", upvotes: 12, commentCount: 1, createdAt: "2025-11-30T08:30:00Z" },
  { ref: "p12", slug: "webhook-retries", title: "Automatic webhook retries on failure", status: "pending", author: "ravi", upvotes: 9, commentCount: 0, createdAt: "2026-05-14T07:15:00Z" },
  { ref: "p13", slug: "duplicate-a-page", title: "Duplicate a whole page in the builder", status: "pending", author: "sophie", upvotes: 7, commentCount: 0, createdAt: "2026-05-10T18:50:00Z" },
  { ref: "p14", slug: "spam-honeypot-toggle", title: "Spam honeypot toggle", description: "A lightweight anti-spam option that doesn't require a captcha.", status: "closed", author: "amara", upvotes: 5, commentCount: 2, createdAt: "2025-10-05T15:25:00Z" },
];

interface SeedComment {
  post: string;
  author: AuthorKey;
  body: string;
  link?: { url: string; label: string };
  createdAt: string;
  likeCount: number;
  dislikeCount?: number;
  pinned?: boolean;
}

const COMMENTS: SeedComment[] = [
  { post: "p6", author: "abhishek", body: "Please check this guide for solution: ", link: { url: "https://help.youform.com/p/C8W49VmnaCLmPO/How-to-create-a-password-protected-form", label: "https://help.youform.com/p/C8W49VmnaCLmPO/How-to-create-a-pa..." }, createdAt: "2026-03-31T09:00:00Z", likeCount: 8, dislikeCount: 0, pinned: true },
  { post: "p6", author: "noelle", body: "How do I achieve this!", createdAt: "2026-03-26T14:20:00Z", likeCount: 2, dislikeCount: 1 },
  { post: "p6", author: "kit", body: "This would be nice!", createdAt: "2025-06-27T11:10:00Z", likeCount: 3, dislikeCount: 0 },
  { post: "p2", author: "mario", body: "This would be a game changer for me — I'm often away from my desk.", createdAt: "2026-04-19T08:00:00Z", likeCount: 6, dislikeCount: 0 },
  { post: "p1", author: "abhishek", body: "You can already do this today with our Zapier connector — full guide here: ", link: { url: "https://help.youform.com/make", label: "https://help.youform.com/make..." }, createdAt: "2026-05-03T10:00:00Z", likeCount: 11, dislikeCount: 1, pinned: true },
];

interface SeedUpdate {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  cover?: "mcp" | "sheets" | "integrations";
  author?: AuthorKey;
  excerpt: string;
  content: IUpdateBlock[];
}

const UPDATES: SeedUpdate[] = [
  {
    slug: "youform-mcp-is-here",
    title: "Youform MCP is here!",
    date: "2026-08-22T00:00:00Z",
    tags: ["new feature", "announcement"],
    cover: "mcp",
    excerpt: "Talk to your forms 🤖 You can now connect Youform directly to Claude, ChatGPT, Cursor, and any AI assistant that supports MCP (Model Context Protocol). Describe the form you want in plain language...",
    content: [
      { type: "paragraph", runs: [{ text: "Talk to your forms 🤖" }] },
      { type: "paragraph", runs: [{ text: "You can now connect Youform directly to " }, { text: "Claude", bold: true }, { text: ", " }, { text: "ChatGPT", bold: true }, { text: ", " }, { text: "Cursor", bold: true }, { text: ", and any AI assistant that supports MCP (Model Context Protocol). Describe the form you want in plain language and your assistant builds it right in your Youform workspace — then analyzes the responses for you once they roll in." }] },
      { type: "paragraph", runs: [{ text: "Here's what you can do:" }] },
      { type: "paragraph", runs: [{ text: "Create forms by chatting", bold: true }, { text: ': "Make a job application form with a resume upload, a LinkedIn URL, and three short questions."' }] },
      { type: "paragraph", runs: [{ text: "Edit existing forms", bold: true }, { text: ': "Add a phone field to my contact form and reorder it so email comes first — then publish it."' }] },
      { type: "paragraph", runs: [{ text: "Analyze responses without exporting", bold: true }, { text: ': "Summarize this week\'s feedback in two paragraphs" or "Which bug reports mention crashes?"' }] },
      { type: "paragraph", runs: [{ text: "Check your numbers", bold: true }, { text: ": views, starts, and completion rates, straight in the chat." }] },
      { type: "paragraph", runs: [{ text: "How to connect:" }] },
      { type: "paragraph", runs: [{ text: "Claude", bold: true }, { text: ": Settings → Connectors → Add custom connector → paste " }, { text: "https://app.youform.com/mcp", code: true }] },
      { type: "paragraph", runs: [{ text: "ChatGPT", bold: true }, { text: ": Turn on Developer mode in Settings, then add " }, { text: "https://app.youform.com/mcp", code: true }, { text: " as an MCP connector." }] },
      { type: "paragraph", runs: [{ text: "Claude Code / Cursor / other MCP clients", bold: true }, { text: ": add " }, { text: "https://app.youform.com/mcp", code: true }, { text: " as an HTTP MCP server." }] },
      { type: "paragraph", runs: [{ text: "You'll log in with your regular Youform account and approve access on a consent screen. Your assistant can only see what your account can see — and it can never delete your forms or responses." }] },
      { type: "readmore", url: "https://help.youform.com/mcp", label: "Read more here" },
      { type: "paragraph", runs: [{ text: "Free on all plans. Happy building! ✨" }] },
    ],
  },
  {
    slug: "multiple-account-for-google-sheets",
    title: "Multiple account for Google sheets",
    date: "2026-08-21T00:00:00Z",
    tags: ["new feature"],
    author: "abhishek",
    excerpt: "More accounts, less jumping around 📗 You asked, we listened! We know many of you juggle different Google accounts for work, side projects, and personal use. Managing your form data just got a whol...",
    content: [
      { type: "paragraph", runs: [{ text: "More accounts, less jumping around 📗" }] },
      { type: "paragraph", runs: [{ text: "You asked, we listened! We know many of you juggle different Google accounts for work, side projects, and personal use. Managing your form data just got a whole lot easier — you can now connect multiple Google accounts and pick exactly which one each form syncs to." }] },
      { type: "paragraph", runs: [{ text: "Head to " }, { text: "Integrations → Google Sheets", bold: true }, { text: " to add as many accounts as you need. Switching between them is a single click." }] },
      { type: "readmore", url: "https://help.youform.com/google-sheets", label: "Read more here" },
    ],
  },
  {
    slug: "new-integrations-page",
    title: "New integrations page",
    date: "2026-08-21T00:00:00Z",
    tags: ["improvement"],
    author: "abhishek",
    excerpt: "We have revamped the integrations page and working on lots of new integrations. A cleaner layout, clearer categories, and quicker setup for every connection.",
    content: [
      { type: "paragraph", runs: [{ text: "We have revamped the integrations page and are working on lots of new integrations. A cleaner layout, clearer categories, and quicker setup for every connection." }] },
      { type: "paragraph", runs: [{ text: "Expect a wave of new connectors over the coming weeks — tell us which one you want most on the " }, { text: "Feature Requests", bold: true }, { text: " board." }] },
    ],
  },
];

async function upsertUsers(): Promise<Record<string, mongoose.Types.ObjectId>> {
  const passwordHash = await hashPassword("password123");
  const ids: Record<string, mongoose.Types.ObjectId> = {};
  for (const [key, info] of Object.entries(AUTHORS)) {
    const user = await User.findOneAndUpdate(
      { email: emailFor(key) },
      { $setOnInsert: { name: info.name, email: emailFor(key), passwordHash, provider: "email", role: info.role } },
      { new: true, upsert: true }
    );
    ids[key] = user!._id as mongoose.Types.ObjectId;
  }
  return ids;
}

async function seed() {
  await connectDB();
  console.log("Seeding feedback board…");

  const userIds = await upsertUsers();

  await Promise.all([
    Feedback.deleteMany({}),
    FeedbackComment.deleteMany({}),
    Update.deleteMany({}),
  ]);

  const postIdByRef: Record<string, mongoose.Types.ObjectId> = {};
  for (const p of POSTS) {
    const doc = await Feedback.create({
      slug: p.slug,
      title: p.title,
      description: p.description ?? "",
      status: p.status,
      boardId: BOARD,
      author: userIds[p.author],
      upvotedBy: [],
      upvoteCount: p.upvotes,
      commentCount: p.commentCount,
      commenterIds: (p.commenters ?? []).map((k) => userIds[k]),
      createdAt: new Date(p.createdAt),
    });
    postIdByRef[p.ref] = doc._id as mongoose.Types.ObjectId;
  }

  for (const c of COMMENTS) {
    await FeedbackComment.create({
      postId: postIdByRef[c.post],
      author: userIds[c.author],
      body: c.body,
      link: c.link,
      pinned: c.pinned ?? false,
      likeCount: c.likeCount,
      dislikeCount: c.dislikeCount ?? 0,
      createdAt: new Date(c.createdAt),
    });
  }

  for (const u of UPDATES) {
    await Update.create({
      slug: u.slug,
      title: u.title,
      date: new Date(u.date),
      tags: u.tags,
      cover: u.cover,
      excerpt: u.excerpt,
      author: u.author ? userIds[u.author] : undefined,
      content: u.content,
    });
  }

  console.log(`Seeded ${POSTS.length} posts, ${COMMENTS.length} comments, ${UPDATES.length} updates.`);
  console.log("Author logins: <key>@youform.demo / password123 (abhishek is admin).");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
