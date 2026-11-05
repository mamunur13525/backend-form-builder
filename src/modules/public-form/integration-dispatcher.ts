import { FormVersion } from "../../models/FormVersion";

interface DispatchParams {
  form: any;
  versionId: any;
  submission: any;
  answers: any[];
  computedVariables?: { name: string; value: any }[];
}

/**
 * Dispatches form submission data to connected third-party integrations
 * (Slack, Discord, Telegram, Zapier, Google Sheets, Notion, Generic Webhooks).
 *
 * Runs asynchronously after the response is saved so it never slows down
 * or blocks the respondent's submission flow.
 */
export async function dispatchServerIntegrations({
  form,
  versionId,
  submission,
  answers,
  computedVariables,
}: DispatchParams): Promise<void> {
  try {
    if (!versionId) return;

    const version = await FormVersion.findById(versionId).lean();
    if (!version) return;

    const integrations = version.formSchema?.settings?.integrations;
    if (!integrations || typeof integrations !== "object") return;

    const formTitle = form.title || "Form Submission";
    const submittedAt = submission.submittedAt
      ? new Date(submission.submittedAt).toISOString()
      : new Date().toISOString();

    // Map answers into an accessible summary dictionary and readable rows
    const answerFields = (answers || []).map((ans) => ({
      key: ans.pageKey || "field",
      label: ans.label || ans.pageKey || "Question",
      value: typeof ans.value === "object" ? JSON.stringify(ans.value) : String(ans.value ?? ""),
    }));

    const answerSummary = answerFields
      .map((f) => `• *${f.label}*: ${f.value}`)
      .join("\n");

    const answerRecord: Record<string, any> = {};
    for (const f of answerFields) {
      answerRecord[f.label || f.key] = f.value;
    }

    const payload = {
      event: "form_response.submitted",
      formId: String(form._id),
      formTitle,
      submissionId: String(submission._id),
      submittedAt,
      answers: answerFields,
      data: answerRecord,
      computedVariables: computedVariables || [],
    };

    const tasks: Promise<any>[] = [];

    // 1. Discord Webhook
    const discord = integrations["discord"];
    if (discord?.enabled && discord.webhookUrl) {
      tasks.push(
        fetch(discord.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: discord.botName || "Form Builder",
            avatar_url: discord.avatarUrl || undefined,
            embeds: [
              {
                title: `📝 New submission for "${formTitle}"`,
                description: answerSummary || "No answers provided.",
                color: 16734242, // Brand accent (#FF5722)
                footer: { text: "Form Builder • Discord Integration" },
                timestamp: submittedAt,
              },
            ],
          }),
        }).catch((err) => console.error("Discord integration error:", err))
      );
    }

    // 2. Slack Webhook
    const slack = integrations["slack"];
    if (slack?.enabled && slack.webhookUrl) {
      tasks.push(
        fetch(slack.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `New submission received for *${formTitle}*`,
            blocks: [
              {
                type: "header",
                text: {
                  type: "plain_text",
                  text: `📝 New submission: ${formTitle}`,
                  emoji: true,
                },
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: answerSummary || "_No answers recorded_",
                },
              },
              {
                type: "context",
                elements: [
                  {
                    type: "mrkdwn",
                    text: `Submitted at: <!date^${Math.floor(
                      new Date(submittedAt).getTime() / 1000
                    )}^{date_num} {time_secs}|${submittedAt}>`,
                  },
                ],
              },
            ],
          }),
        }).catch((err) => console.error("Slack integration error:", err))
      );
    }

    // 3. Telegram Bot
    const telegram = integrations["telegram"];
    if (telegram?.enabled && telegram.botToken && telegram.chatId) {
      const tgText =
        `<b>📝 New Form Submission</b>\n` +
        `<b>Form:</b> ${escapeHtml(formTitle)}\n\n` +
        answerFields
          .map((f) => `<b>${escapeHtml(f.label)}:</b> ${escapeHtml(f.value)}`)
          .join("\n") +
        `\n\n<i>Submitted: ${submittedAt}</i>`;

      tasks.push(
        fetch(`https://api.telegram.org/bot${telegram.botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegram.chatId,
            text: tgText,
            parse_mode: "HTML",
          }),
        }).catch((err) => console.error("Telegram integration error:", err))
      );
    }

    // 4. Zapier Webhook (Catch Hook)
    const zapier = integrations["zapier"];
    if (zapier?.enabled && zapier.webhookUrl) {
      tasks.push(
        fetch(zapier.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch((err) => console.error("Zapier integration error:", err))
      );
    }

    // 5. Google Sheets (Google Apps Script Webhook or Bridge)
    const googleSheets = integrations["google-sheets"];
    if (googleSheets?.enabled && googleSheets.webhookUrl) {
      tasks.push(
        fetch(googleSheets.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch((err) => console.error("Google Sheets integration error:", err))
      );
    }

    // 6. Generic Webhook
    const webhook = integrations["webhook"];
    if (webhook?.enabled && webhook.url) {
      tasks.push(
        fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(webhook.secret ? { "X-Webhook-Secret": webhook.secret } : {}),
          },
          body: JSON.stringify(payload),
        }).catch((err) => console.error("Generic Webhook error:", err))
      );
    }

    // 7. Notion Database Integration
    const notion = integrations["notion"];
    if (notion?.enabled && notion.apiKey && notion.databaseId) {
      tasks.push(
        createNotionPage(notion.apiKey, notion.databaseId, formTitle, answerFields).catch(
          (err) => console.error("Notion integration error:", err)
        )
      );
    }

    await Promise.allSettled(tasks);
  } catch (err) {
    console.error("Error in dispatchServerIntegrations:", err);
  }
}

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function createNotionPage(
  apiKey: string,
  databaseId: string,
  formTitle: string,
  fields: { label: string; value: string }[]
) {
  // Clean database ID (strip dashes if passed or normalize)
  const cleanDbId = databaseId.replace(/-/g, "");

  const children = fields.map((f) => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: { content: `${f.label}: ` },
          annotations: { bold: true },
        },
        {
          type: "text",
          text: { content: f.value || "—" },
        },
      ],
    },
  }));

  return fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: { database_id: cleanDbId },
      properties: {
        title: {
          title: [
            {
              text: {
                content: `Submission - ${new Date().toLocaleString()}`,
              },
            },
          ],
        },
      },
      children,
    }),
  });
}
