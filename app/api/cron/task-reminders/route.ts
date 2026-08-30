/**
 * HTTP trigger for the due-date reminder sweep (lib/task-reminders.ts).
 * Meant to be hit by an external scheduler — Vercel Cron, cron-job.org, or a
 * plain crontab entry with curl — since this app has no scheduler of its own.
 *
 * Protected by CRON_SECRET, passed either as `?secret=...` (the simplest
 * thing to paste into a scheduler's URL field) or as `Authorization: Bearer
 * ...` (what Vercel Cron sends automatically). Without CRON_SECRET set, the
 * route refuses every request — this fires emails to real people, so there
 * is no "open by default" fallback.
 *
 * Example crontab, run daily at 8am:
 *   0 8 * * * curl -fsS "https://your-app.example/api/cron/task-reminders?secret=$CRON_SECRET"
 */
import { NextRequest, NextResponse } from "next/server";
import { runTaskReminderSweep } from "@/lib/task-reminders";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest, secret: string): boolean {
  const fromQuery = request.nextUrl.searchParams.get("secret");
  if (fromQuery === secret) return true;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/task-reminders] CRON_SECRET is not set — refusing to run");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runTaskReminderSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/task-reminders] sweep failed:", err);
    return NextResponse.json({ ok: false, error: "sweep failed" }, { status: 500 });
  }
}
