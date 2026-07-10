const ACTION_LABELS: Record<string, string> = {
  strum: "🎸 The guitar was strummed. She's summoning you.",
  nana: "🔴 Black Stones vibe. She needs to vent.",
  newjeans: "💙 Super Shy vibe. Send memes/hype.",
  deftones: "🤍 White Pony vibe. Chill late-night chat.",
  pager: "📟 Secret code entered. She dialed 707.",
  "pager-message": "💌 Direct line message from her:",
  setlist: "📝 New track dropped on the setlist.",
};

function buildMessage(payload: {
  action: string;
  message?: string;
  code?: string;
  url?: string;
}) {
  const label =
    payload.message ??
    ACTION_LABELS[payload.action] ??
    `Action: ${payload.action}`;

  let content = label;
  if (payload.url) content += `\n🔗 ${payload.url}`;
  if (payload.code) content += `\nCode: ${payload.code}`;
  return content;
}

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[notify] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured");
    return { ok: false, skipped: true };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram failed: ${res.status} ${err}`);
  }

  return { ok: true };
}

async function sendDiscordWebhook(webhookUrl: string, text: string) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text }),
  });

  if (!res.ok) {
    throw new Error(`Webhook failed: ${res.status}`);
  }

  return { ok: true };
}

export async function sendWebhook(payload: {
  action: string;
  message?: string;
  code?: string;
  url?: string;
}) {
  const content = buildMessage(payload);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (token && chatId) {
    return sendTelegram(content);
  }

  const webhookUrl = process.env.WEBHOOK_URL;
  if (webhookUrl) {
    if (webhookUrl.includes("api.telegram.org")) {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
      if (!res.ok) throw new Error(`Webhook failed: ${res.status}`);
      return { ok: true };
    }
    return sendDiscordWebhook(webhookUrl, content);
  }

  console.warn("[notify] No Telegram or webhook credentials configured");
  return { ok: false, skipped: true };
}

export function isPagerCodeValid(code: string) {
  const secret = process.env.PAGER_SECRET_CODE ?? "707";
  return code === secret;
}
