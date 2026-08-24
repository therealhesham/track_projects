/**
 * Email utility — Nodemailer.
 *
 * Configure SMTP via environment variables:
 *   SMTP_HOST   e.g. smtp.gmail.com
 *   SMTP_PORT   e.g. 465 (SSL) or 587 (STARTTLS)
 *   SMTP_SECURE true for SSL (port 465), false for STARTTLS
 *   SMTP_USER   your email address / login
 *   SMTP_PASS   app-password or account password
 *   SMTP_FROM   "Sender Name <sender@example.com>"
 *
 * If SMTP_HOST is not set, emails are logged to the console instead of sent
 * (dev / CI fallback).
 */

import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;

  if (!host) {
    // Console transport for local dev without SMTP credentials
    return nodemailer.createTransport({ jsonTransport: true });
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const from =
  process.env.SMTP_FROM ?? "إدارة المشاريع <no-reply@projects.local>";

/**
 * Send a project-invitation email to a newly added member.
 * Falls back to console.log when SMTP is not configured.
 */
export async function sendMemberInviteEmail({
  to,
  memberName,
  projectName,
  projectId,
  addedByName,
  role,
}: {
  to: string;
  memberName: string;
  projectName: string;
  projectId: string;
  addedByName: string;
  role: "MANAGER" | "MEMBER";
}) {
  const roleLabel = role === "MANAGER" ? "مدير مشروع" : "عضو فريق";
  // AUTH_URL is the canonical public origin (Auth.js reads it too), so one
  // variable drives both the session callbacks and the links we email out.
  const appUrl =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.APP_URL ??
    "http://localhost:3000";
  const link     = `${appUrl}/projects/${projectId}`;

  const subject = `تمت إضافتك إلى مشروع "${projectName}"`;

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f5f6;font-family:system-ui,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:12px;border:1px solid #e2e5e7;overflow:hidden;">

          <!-- Header bar -->
          <tr>
            <td style="background:#00485c;padding:24px 32px;">
              <p style="margin:0;font-size:18px;font-weight:600;color:#ffffff;">
                إدارة المشاريع
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#12262d;">
                مرحباً ${memberName}،
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#4a6068;line-height:1.7;">
                قام <strong>${addedByName}</strong> بإضافتك إلى مشروع
                <strong>"${projectName}"</strong> بصفة <strong>${roleLabel}</strong>.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:8px;background:#00485c;">
                    <a href="${link}"
                      style="display:inline-block;padding:12px 28px;font-size:14px;
                             font-weight:600;color:#ffffff;text-decoration:none;">
                      فتح المشروع
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#8a9aa0;">
                إذا لم تكن تتوقع هذه الرسالة، يمكنك تجاهلها.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #e2e5e7;padding:16px 32px;">
              <p style="margin:0;font-size:12px;color:#a0adb2;">
                منصة إدارة المشاريع الداخلية
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const transport = createTransport();

  const info = await transport.sendMail({ from, to, subject, html });

  // In dev without SMTP, log the rendered email JSON
  if (!process.env.SMTP_HOST) {
    console.log("[email:dev] Would send to", to, "—", subject);
    console.log("[email:dev]", JSON.stringify(info, null, 2));
  }
}
