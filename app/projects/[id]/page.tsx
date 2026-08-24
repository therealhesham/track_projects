import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { projectScope } from "@/lib/permissions";
import { requireViewer } from "@/lib/session";
import { projectInclude, toProjectView } from "@/lib/view";
import SingleProjectView from "@/components/SingleProjectView";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await requireViewer();

  const row = await prisma.project.findFirst({
    where: {
      id,
      ...projectScope(viewer),
    },
    include: projectInclude,
  });

  if (!row) {
    notFound();
  }

  const now = new Date();
  const project = toProjectView(row, now);

  const allUsers =
    viewer.role === "SUPER_ADMIN"
      ? await prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            role: true,
          },
          orderBy: { name: "asc" },
        })
      : [];

  return (
    <SingleProjectView
      viewer={viewer}
      project={project}
      allUsers={allUsers}
    />
  );
}
