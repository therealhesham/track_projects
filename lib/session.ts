import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Viewer } from "./permissions";

/** The signed-in user, or null. */
export async function currentViewer(): Promise<
  (Viewer & { name: string; email: string }) | null
> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
  };
}

/**
 * Same, but sends anonymous callers to the login page. Use this in every server
 * component and server action that touches project data — middleware is a
 * convenience, not the security boundary.
 */
export async function requireViewer() {
  const viewer = await currentViewer();
  if (!viewer) redirect("/login");
  return viewer;
}
