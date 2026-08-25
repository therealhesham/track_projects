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
  const link = `${appUrl}/projects/${projectId}`;

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

/**
 * Send a welcome email to a newly created system user, including their account details.
 */
export async function sendNewUserWelcomeEmail({
  to,
  userName,
  userEmail,
  password,
  role,
  department,
  addedByName,
  projectName,
  projectId,
}: {
  to: string;
  userName: string;
  userEmail: string;
  password?: string;
  role: "SUPER_ADMIN" | "MANAGER" | "MEMBER";
  department?: string;
  addedByName: string;
  projectName?: string;
  projectId?: string;
}) {
  const roleLabel =
    role === "SUPER_ADMIN"
      ? "مدير عام النظام"
      : role === "MANAGER"
        ? "مدير مشروع"
        : "عضو فريق";

  const appUrl =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.APP_URL ??
    "https://projects.rawaes.com";

  const loginLink = `${appUrl}/login`;
  const projectLink = projectId ? `${appUrl}/projects/${projectId}` : null;
  const targetLink = projectLink || loginLink;

  const subject = `مرحباً بك في منصة إدارة المشاريع - بيانات حسابك الجديد`;

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
                منصة إدارة المشاريع
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#12262d;">
                مرحباً ${userName}،
              </p>
              <p style="margin:0 0 20px;font-size:15px;color:#4a6068;line-height:1.7;">
                تم إنشاء حساب جديد لك في منصة إدارة المشاريع بواسطة <strong>${addedByName}</strong>.
              </p>

              <!-- User details card -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#00485c;">
                  تفاصيل الحساب:
                </p>
                <table width="100%" cellpadding="4" cellspacing="0" style="font-size:14px;color:#334155;">
                  <tr>
                    <td width="120" style="color:#64748b;">البريد الإلكتروني:</td>
                    <td><strong>${userEmail}</strong></td>
                  </tr>
                  ${password
      ? `<tr>
                    <td style="color:#64748b;">كلمة المرور:</td>
                    <td><code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-family:monospace;font-weight:bold;color:#0f172a;">${password}</code></td>
                  </tr>`
      : ""
    }
                  <tr>
                    <td style="color:#64748b;">الدور:</td>
                    <td><strong>${roleLabel}</strong></td>
                  </tr>
                  ${department
      ? `<tr>
                    <td style="color:#64748b;">القسم:</td>
                    <td><strong>${department}</strong></td>
                  </tr>`
      : ""
    }
                  ${projectName
      ? `<tr>
                    <td style="color:#64748b;">المشروع:</td>
                    <td><strong>${projectName}</strong></td>
                  </tr>`
      : ""
    }
                </table>
              </div>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:8px;background:#00485c;">
                    <a href="${targetLink}"
                      style="display:inline-block;padding:12px 28px;font-size:14px;
                             font-weight:600;color:#ffffff;text-decoration:none;">
                      ${projectName ? "فتح المشروع" : "تسجيل الدخول إلى النظام"}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#8a9aa0;">
                يمكنك تغيير كلمة المرور بعد تسجيل الدخول لأول مرة.
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

  if (!process.env.SMTP_HOST) {
    console.log("[email:dev] Would send welcome to", to, "—", subject);
    console.log("[email:dev]", JSON.stringify(info, null, 2));
  }
}

