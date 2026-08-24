import Dashboard from "@/components/Dashboard";
import { prisma } from "@/lib/db";
import { buildMonthGrid, ymd } from "@/lib/calendar";
import { canCreateProject, projectScope } from "@/lib/permissions";
import { requireViewer } from "@/lib/session";
import { movementsOf, projectInclude, toProjectView } from "@/lib/view";

// Every mutation calls revalidatePath("/"), and the result is per-user, so this
// must not be cached across requests.
export const dynamic = "force-dynamic";

export default async function Home() {
  const viewer = await requireViewer();

  const rows = await prisma.project.findMany({
    // Scoped in the query, not filtered afterwards: a project this user may not
    // see never leaves the database.
    where: projectScope(viewer),
    include: projectInclude,
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const projects = rows.map((row) => toProjectView(row, now));

  return (
    <main className="min-h-screen">
      <Dashboard
        viewer={viewer}
        canCreate={canCreateProject(viewer)}
        projects={projects}
        movements={movementsOf(projects, viewer)}
        grid={buildMonthGrid(now.getFullYear(), now.getMonth())}
        today={ymd(now)}
      />
    </main>
  );
}
