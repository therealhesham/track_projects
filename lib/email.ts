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
 * The public origin used in every emailed link. AUTH_URL is the canonical one
 * (Auth.js reads it too), so a single variable drives both the session
 * callbacks and the links we send out.
 */
function appOrigin() {
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"
  );
}

/**
 * The shared chrome around every email we send: header bar, white card,
 * footer. Only the middle changes, so callers pass their own body markup and
 * an optional call-to-action button.
 */
function emailShell({
  headerTitle = "منصة إدارة المشاريع",
  body,
  ctaLabel,
  ctaLink,
  footnote,
}: {
  headerTitle?: string;
  body: string;
  ctaLabel?: string;
  ctaLink?: string;
  footnote?: string;
}) {
  const cta =
    ctaLabel && ctaLink
      ? `
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:8px;background:#00485c;">
                    <a href="${ctaLink}"
                      style="display:inline-block;padding:12px 28px;font-size:14px;
                             font-weight:600;color:#ffffff;text-decoration:none;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>`
      : "";

  return `
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
                ${headerTitle}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
${body}
${cta}
              ${footnote
                  ? `<p style="margin:0;font-size:13px;color:#8a9aa0;">${footnote}</p>`
                  : ""
                }
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
}

/** Send, and in dev without SMTP echo what would have gone out. */
async function deliver(to: string, subject: string, html: string) {
  const info = await createTransport().sendMail({ from, to, subject, html });

  if (!process.env.SMTP_HOST) {
    console.log("[email:dev] Would send to", to, "—", subject);
    console.log("[email:dev]", JSON.stringify(info, null, 2));
  }
}

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

  const html = emailShell({
    headerTitle: "إدارة المشاريع",
    body: `
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#12262d;">
                مرحباً ${memberName}،
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#4a6068;line-height:1.7;">
                قام <strong>${addedByName}</strong> بإضافتك إلى مشروع
                <strong>"${projectName}"</strong> بصفة <strong>${roleLabel}</strong>.
              </p>`,
    ctaLabel: "فتح المشروع",
    ctaLink: `${appOrigin()}/projects/${projectId}`,
    footnote: "إذا لم تكن تتوقع هذه الرسالة، يمكنك تجاهلها.",
  });

  await deliver(to, `تمت إضافتك إلى مشروع "${projectName}"`, html);
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

  const appUrl = appOrigin();
  const projectLink = projectId ? `${appUrl}/projects/${projectId}` : null;
  const targetLink = projectLink ?? `${appUrl}/login`;

  const html = emailShell({
    body: `
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
              </div>`,
    ctaLabel: projectName ? "فتح المشروع" : "تسجيل الدخول إلى النظام",
    ctaLink: targetLink,
    footnote: "يمكنك تغيير كلمة المرور بعد تسجيل الدخول لأول مرة.",
  });

  await deliver(
    to,
    "مرحباً بك في منصة إدارة المشاريع - بيانات حسابك الجديد",
    html,
  );
}

/**
 * Tell a project's managers that an assignee has asked for their task to be
 * signed off. Sent once per manager; the caller decides who those are.
 */
export async function sendCompletionReviewEmail({
  to,
  managerName,
  taskTitle,
  projectName,
  projectId,
  requestedByName,
  note,
}: {
  to: string;
  managerName: string;
  taskTitle: string;
  projectName: string;
  projectId: string;
  requestedByName: string;
  note?: string | null;
}) {
  const html = emailShell({
    body: `
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#12262d;">
                مرحباً ${managerName}،
              </p>
              <p style="margin:0 0 20px;font-size:15px;color:#4a6068;line-height:1.7;">
                قام <strong>${requestedByName}</strong> بتسجيل إتمام مهمة في مشروع
                <strong>"${projectName}"</strong>، وهي الآن بانتظار اعتمادك.
              </p>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:12px;color:#64748b;">المهمة</p>
                <p style="margin:0;font-size:16px;font-weight:600;color:#0f172a;">
                  ${taskTitle}
                </p>
                ${note
                  ? `<p style="margin:14px 0 6px;font-size:12px;color:#64748b;">ملاحظة العضو</p>
                <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">${note}</p>`
                  : ""
                }
              </div>`,
    ctaLabel: "مراجعة المهمة واعتمادها",
    ctaLink: `${appOrigin()}/projects/${projectId}`,
    footnote: "لن تتحول المهمة إلى «مكتملة» قبل اعتمادك لها.",
  });

  await deliver(to, `بانتظار اعتمادك: "${taskTitle}" — ${projectName}`, html);
}

/**
 * The same nudge for a daily task. It has no project behind it, so there is no
 * project page to link to and no manager to address — the review falls to the
 * super admins, and the link goes to the daily-tasks tab on the home screen.
 */
export async function sendDailyCompletionReviewEmail({
  to,
  reviewerName,
  taskTitle,
  dayLabel,
  requestedByName,
  note,
}: {
  to: string;
  reviewerName: string;
  taskTitle: string;
  dayLabel: string;
  requestedByName: string;
  note?: string | null;
}) {
  const html = emailShell({
    body: `
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#12262d;">
                مرحباً ${reviewerName}،
              </p>
              <p style="margin:0 0 20px;font-size:15px;color:#4a6068;line-height:1.7;">
                قام <strong>${requestedByName}</strong> بتسجيل إتمام مهمة يومية،
                وهي الآن بانتظار اعتمادك.
              </p>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:12px;color:#64748b;">المهمة</p>
                <p style="margin:0;font-size:16px;font-weight:600;color:#0f172a;">
                  ${taskTitle}
                </p>
                <p style="margin:14px 0 6px;font-size:12px;color:#64748b;">اليوم</p>
                <p style="margin:0;font-size:14px;color:#334155;">${dayLabel}</p>
                ${note
                  ? `<p style="margin:14px 0 6px;font-size:12px;color:#64748b;">ملاحظة العضو</p>
                <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">${note}</p>`
                  : ""
                }
              </div>`,
    ctaLabel: "مراجعة المهمة واعتمادها",
    ctaLink: `${appOrigin()}/`,
    footnote: "لن تتحول المهمة إلى «مكتملة» قبل اعتمادك لها.",
  });

  await deliver(to, `بانتظار اعتمادك: مهمة يومية "${taskTitle}"`, html);
}

/** One row in a due-date reminder list — shared shape for both audiences below. */
type DueTaskRow = {
  title: string;
  dueDateLabel: string;
  statusLabel: string;
  isOverdue: boolean;
};

function dueTaskRows(tasks: DueTaskRow[], assigneeNames?: string[]) {
  return tasks
    .map((t, i) => {
      const assigneeCell = assigneeNames
        ? `<p style="margin:4px 0 0;font-size:12px;color:#64748b;">مسندة إلى: ${assigneeNames[i]}</p>`
        : "";
      return `
              <tr>
                <td style="padding:12px 0;border-top:1px solid #eef1f2;">
                  <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">${t.title}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#64748b;">الموعد: ${t.dueDateLabel}</p>
                  ${assigneeCell}
                </td>
                <td style="padding:12px 0;border-top:1px solid #eef1f2;text-align:left;white-space:nowrap;vertical-align:top;">
                  <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;
                    background:${t.isOverdue ? "#fef2f2" : "#fffbeb"};color:${t.isOverdue ? "#dc2626" : "#b45309"};">
                    ${t.statusLabel}
                  </span>
                </td>
              </tr>`;
    })
    .join("");
}

/**
 * Nudge a task's assignee that their deadline has passed or is close. Sent by
 * the daily reminder sweep (scripts/task-reminders.ts), one email per member
 * per project — never one per task, so a person with three late tasks in the
 * same project gets a single list rather than a flood.
 */
export async function sendAssigneeTaskDueReminderEmail({
  to,
  memberName,
  projectName,
  projectId,
  managerName,
  tasks,
}: {
  to: string;
  memberName: string;
  projectName: string;
  projectId: string;
  managerName: string;
  tasks: DueTaskRow[];
}) {
  const overdueCount = tasks.filter((t) => t.isOverdue).length;
  const noun = tasks.length === 1 ? "مهمة" : "مهام";
  const intro =
    overdueCount > 0
      ? `عندك ${noun} في مشروع <strong>"${projectName}"</strong> فات موعدها.`
      : `عندك ${noun} في مشروع <strong>"${projectName}"</strong> قربت على موعدها.`;

  const html = emailShell({
    body: `
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#12262d;">
                مرحباً ${memberName}،
              </p>
              <p style="margin:0 0 20px;font-size:15px;color:#4a6068;line-height:1.7;">
                ${intro}
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                ${dueTaskRows(tasks)}
              </table>

              <p style="margin:0;font-size:13px;color:#8a9aa0;">
                مدير المشروع: <strong style="color:#4a6068;">${managerName}</strong>
              </p>`,
    ctaLabel: "فتح المشروع",
    ctaLink: `${appOrigin()}/projects/${projectId}`,
    footnote: "رسالة تلقائية من فحص دوري للمواعيد المستحقة.",
  });

  const subject =
    overdueCount > 0
      ? `مهام متأخرة في مشروع "${projectName}"`
      : `مهام قربت على موعدها في مشروع "${projectName}"`;

  await deliver(to, subject, html);
}

/**
 * The project-manager counterpart: one email per manager per project listing
 * every task that is overdue or close to due, across all assignees, so they
 * can see where a project is at risk without opening the board.
 */
export async function sendManagerTaskDueSummaryEmail({
  to,
  managerName,
  projectName,
  projectId,
  tasks,
}: {
  to: string;
  managerName: string;
  projectName: string;
  projectId: string;
  tasks: (DueTaskRow & { assigneeName: string })[];
}) {
  const overdueCount = tasks.filter((t) => t.isOverdue).length;
  const noun = tasks.length === 1 ? "مهمة" : "مهام";
  const intro =
    overdueCount > 0
      ? `فيه ${noun} في مشروع <strong>"${projectName}"</strong> فات موعدها ولسه ملحقتش تخلص.`
      : `فيه ${noun} في مشروع <strong>"${projectName}"</strong> قربت على موعدها.`;

  const html = emailShell({
    body: `
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#12262d;">
                مرحباً ${managerName}،
              </p>
              <p style="margin:0 0 20px;font-size:15px;color:#4a6068;line-height:1.7;">
                ${intro}
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                ${dueTaskRows(
                  tasks,
                  tasks.map((t) => t.assigneeName),
                )}
              </table>`,
    ctaLabel: "فتح المشروع",
    ctaLink: `${appOrigin()}/projects/${projectId}`,
    footnote: "رسالة تلقائية من فحص دوري للمواعيد المستحقة.",
  });

  const subject =
    overdueCount > 0
      ? `مهام متأخرة في مشروع "${projectName}"`
      : `مهام قربت على موعدها في مشروع "${projectName}"`;

  await deliver(to, subject, html);
}

