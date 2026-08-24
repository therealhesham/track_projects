import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { canCreateProject } from "@/lib/permissions";
import { requireViewer } from "@/lib/session";
import CreateProjectForm from "@/components/CreateProjectForm";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const viewer = await requireViewer();

  if (!canCreateProject(viewer)) {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
    },
    orderBy: { name: "asc" },
  });

  return <CreateProjectForm users={users} creatorId={viewer.id} />;
}
