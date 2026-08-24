import type { ProjectRole, UserRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";

/**
 * Who can see and change what.
 *
 * Two independent axes, as agreed:
 *  - the account-wide `UserRole` — SUPER_ADMIN oversees everything;
 *  - the per-project `ProjectRole` on a membership — MANAGER runs that one
 *    project, MEMBER works inside it.
 *
 * Every rule lives here rather than being spelled out at each call site, so
 * there is one place to audit and one place to change.
 */

export type Viewer = {
  id: string;
  role: UserRole;
};

/** SUPER_ADMIN sees every project; everyone else sees only what they joined. */
export function projectScope(viewer: Viewer): Prisma.ProjectWhereInput {
  if (viewer.role === "SUPER_ADMIN") return {};
  return { members: { some: { userId: viewer.id } } };
}

export function canViewProject(
  viewer: Viewer,
  membership: ProjectRole | null,
): boolean {
  return viewer.role === "SUPER_ADMIN" || membership !== null;
}

/**
 * Editing a project's own record — renaming it, changing status or due date.
 * Reserved for whoever runs it.
 */
export function canEditProject(
  viewer: Viewer,
  membership: ProjectRole | null,
): boolean {
  return viewer.role === "SUPER_ADMIN" || membership === "MANAGER";
}

/**
 * Moving tasks. Any member of the project may do this — that is the daily work
 * of the board, and restricting it to managers would make the tool useless to
 * the people actually doing the tasks.
 */
export function canMoveTask(
  viewer: Viewer,
  membership: ProjectRole | null,
): boolean {
  return viewer.role === "SUPER_ADMIN" || membership !== null;
}

/** Adding or removing people on a project. */
export function canManageMembers(
  viewer: Viewer,
  membership: ProjectRole | null,
): boolean {
  return viewer.role === "SUPER_ADMIN" || membership === "MANAGER";
}

/**
 * Proposing a task. Any member of the project may add one; it lands in
 * PENDING_APPROVAL, so the gate that matters is the approval below.
 */
export function canAddTask(
  viewer: Viewer,
  membership: ProjectRole | null,
): boolean {
  return viewer.role === "SUPER_ADMIN" || membership !== null;
}

/**
 * Letting a proposed task into the board, or turning it away. Account-wide
 * oversight, so a super admin and nobody else.
 */
export function canApproveTask(viewer: Viewer): boolean {
  return viewer.role === "SUPER_ADMIN";
}

/**
 * Asking for a task to be marked done. Only the person carrying it — the
 * request is a claim about their own work.
 */
export function canRequestCompletion(
  viewer: Viewer,
  assigneeId: string | null,
): boolean {
  return viewer.role === "SUPER_ADMIN" || viewer.id === assigneeId;
}

/** Signing off on a completion request, or sending it back. */
export function canReviewCompletion(
  viewer: Viewer,
  membership: ProjectRole | null,
): boolean {
  return viewer.role === "SUPER_ADMIN" || membership === "MANAGER";
}

/** Removing a task outright, history and all. */
export function canDeleteTask(viewer: Viewer): boolean {
  return viewer.role === "SUPER_ADMIN";
}

/**
 * Creating a project. MEMBER cannot — otherwise the board fills with work
 * nobody is accountable for.
 */
export function canCreateProject(viewer: Viewer): boolean {
  return viewer.role === "SUPER_ADMIN" || viewer.role === "MANAGER";
}

/** Only a super admin administers accounts. */
export function canManageUsers(viewer: Viewer): boolean {
  return viewer.role === "SUPER_ADMIN";
}

export const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: "مدير عام",
  MANAGER: "مدير",
  MEMBER: "عضو",
};
