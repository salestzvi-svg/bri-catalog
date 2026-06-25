export function getOrderReportEmail(): string {
  return (
    process.env.ORDER_REPORT_EMAIL ??
    process.env.NEXT_PUBLIC_ORDER_EMAIL ??
    "salestzvi@gmail.com"
  ).toLowerCase();
}

export async function sendOrdersReportEmail(options: {
  subject: string;
  body: string;
  attachment: Buffer;
  filename: string;
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      sent: false,
      error: "RESEND_API_KEY לא מוגדר — הדוח לא נשלח במייל",
    };
  }

  const from =
    process.env.ORDER_REPORT_FROM?.trim() ?? "bri-catalog <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [getOrderReportEmail()],
      subject: options.subject,
      text: options.body,
      attachments: [
        {
          filename: options.filename,
          content: options.attachment.toString("base64"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return { sent: false, error: `שליחת מייל נכשלה: ${detail}` };
  }

  return { sent: true };
}
