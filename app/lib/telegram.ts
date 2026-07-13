export type TelegramSendResult = {
  ok: boolean;
  sent: number;
  failed: number;
  errors: string[];
};

function getConfiguredChatIds() {
  const raw = process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function sendTelegramMessage(params: { text: string }) : Promise<TelegramSendResult> {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const chatIds = getConfiguredChatIds();
  if (chatIds.length === 0) {
    throw new Error("TELEGRAM_CHAT_ID or TELEGRAM_CHAT_IDS is not configured");
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const chatId of chatIds) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: params.text,
          disable_web_page_preview: true,
        }),
      });

      const body = (await response.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
      if (!response.ok || !body?.ok) {
        failed += 1;
        errors.push(`chat_id=${chatId}: ${body?.description || response.statusText || "Telegram API error"}`);
        continue;
      }

      sent += 1;
    } catch (error) {
      failed += 1;
      errors.push(`chat_id=${chatId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    ok: failed === 0,
    sent,
    failed,
    errors,
  };
}
