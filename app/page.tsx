import Dashboard from "@/components/Dashboard";
import { prisma } from "@/lib/db";
import { buildMonthGrid, ymd } from "@/lib/calendar";
import {
  canAssignDailyTaskToOthers,
  canCreateProject,
  dailyTaskScope,
  projectScope,
} from "@/lib/permissions";
import { requireViewer } from "@/lib/session";
import {
  dailyTaskInclude,
  movementsOf,
  projectInclude,
  toDailyTaskView,
  toProjectView,
} from "@/lib/view";

// Every mutation calls revalidatePath("/"), and the result is per-user, so this
// must not be cached across requests.
export const dynamic = "force-dynamic";

export default async function Home() {
  const viewer = await requireViewer();

  const [rows, dailyRows] = await Promise.all([
    prisma.project.findMany({
      // Scoped in the query, not filtered afterwards: a project this user may not
      // see never leaves the database.
      where: projectScope(viewer),
      include: projectInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.dailyTask.findMany({
      // Same rule, the ownership axis: your own tasks, or everyone's if you are
      // the super admin who has to approve them.
      where: dailyTaskScope(viewer),
      include: dailyTaskInclude,
      orderBy: [{ day: "desc" }, { createdAt: "asc" }],
    }),
  ]);

  // The owner picker in the add-task dialog. Only a super admin can file a task
  // under someone else, so nobody else is served the staff list.
  const assignableUsers = canAssignDailyTaskToOthers(viewer)
    ? await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const now = new Date();
  const projects = rows.map((row) => toProjectView(row, now));
  const dailyTasks = dailyRows.map(toDailyTaskView);

  return (
    <main className="min-h-screen">
      <Dashboard
        viewer={viewer}
        canCreate={canCreateProject(viewer)}
        projects={projects}
        dailyTasks={dailyTasks}
        assignableUsers={assignableUsers}
        movements={movementsOf(projects, viewer)}
        grid={buildMonthGrid(now.getFullYear(), now.getMonth())}
        today={ymd(now)}
      />
    </main>
  );
}
