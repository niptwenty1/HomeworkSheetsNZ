import MailerLite from "@mailerlite/mailerlite-nodejs";

type MailerLiteSignupInput = {
  parentEmail: string;
  childName: string;
  parentName: string;
};

type MailerLiteSyncResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
};

function parseGroupIds(value: string | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export async function syncSignupToMailerLite(
  input: MailerLiteSignupInput,
): Promise<MailerLiteSyncResult> {
  const apiKey = process.env.MAILERLITE_API_KEY?.trim();
  if (!apiKey) {
    return { ok: true, skipped: true, reason: "MAILERLITE_API_KEY not configured" };
  }

  const groupIds = parseGroupIds(
    process.env.MAILERLITE_GROUP_IDS || process.env.MAILERLITE_GROUP_ID,
  );
  const displayName = `${input.parentName}`;

  try {
    const mailerlite = new MailerLite({ api_key: apiKey });
    await mailerlite.subscribers.createOrUpdate({
      email: input.parentEmail,
      status: "active",
      groups: groupIds.length > 0 ? groupIds : undefined,
      fields: {
        name: displayName,
      },
    });

    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown MailerLite error";
    return { ok: false, reason };
  }
}
