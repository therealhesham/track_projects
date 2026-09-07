import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import UsersScreen from "@/components/UsersScreen";
import { prisma } from "@/lib/db";
import { canCreateProject, canManageUsers } from "@/lib/permissions";
import { requireViewer } from "@/lib/session";
import { toUserCardView, userCardSelect } from "@/lib/view";
import type { UserRole } from "@prisma/client";

// Reads every account and every membership; nothing here may be cached across
// requests.
export const dynamic = "force-dynamic";

/** Most senior first, then alphabetically — the order the page reads in. */
const ROLE_RANK: Record<UserRole, number> = {
  SUPER_ADMIN: 0,
  MANAGER: 1,
  MEMBER: 2,
};

export default async function UsersPage() {
  const viewer = await requireViewer();

  // The whole page is the staff list — a manager or member has no business on
  // it, and middleware is not the boundary. See lib/permissions.
  if (!canManageUsers(viewer)) redirect("/");

  const rows = await prisma.user.findMany({
    select: userCardSelect,
    orderBy: { name: "asc" },
  });

  const users = rows
    .map(toUserCardView)
    .sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role]);

  return (
    <main className="min-h-screen">
      <NavBar viewer={viewer} canCreate={canCreateProject(viewer)} />
      <UsersScreen users={users} />
    </main>
  );
}
