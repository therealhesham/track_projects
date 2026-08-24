"use client";

import { useState, useTransition } from "react";
import {
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
  createUserSystem,
} from "@/app/actions";
import type { MemberView, ProjectView } from "@/lib/view";
import { useRole } from "./RoleContext";
import {
  Users,
  UserPlus,
  UserCheck,
  Trash2,
  Mail,
  Building2,
  Shield,
  User,
  Plus,
  X,
  Sparkles,
  Lock,
} from "lucide-react";

export type UserOption = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  role: string;
};

export default function TeamPanel({
  project,
  allUsers = [],
}: {
  project: ProjectView;
  allUsers?: UserOption[];
}) {
  const { currentUser } = useRole();
  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"existing" | "new">("existing");

  // Existing user selection state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [memberRole, setMemberRole] = useState<"MANAGER" | "MEMBER">("MEMBER");

  // New user creation state
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"SUPER_ADMIN" | "MANAGER" | "MEMBER">("MEMBER");
  const [newUserDept, setNewUserDept] = useState("");
  const [newUserPass, setNewUserPass] = useState("");

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Available users not yet in this project
  const existingMemberUserIds = new Set(project.members.map((m) => m.userId));
  const availableUsers = allUsers.filter(
    (u) => !existingMemberUserIds.has(u.id)
  );

  const handleAddMember = () => {
    if (!selectedUserId) return;
    setError(null);

    startTransition(async () => {
      const res = await addProjectMember({
        projectId: project.id,
        userId: selectedUserId,
        role: memberRole,
        addedByName: currentUser.name,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      setAddModalOpen(false);
      setSelectedUserId("");
    });
  };

  const handleCreateNewUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    setError(null);

    startTransition(async () => {
      const res = await createUserSystem({
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        department: newUserDept || undefined,
        password: newUserPass || undefined,
        projectId: project.id,
        addedByName: currentUser.name,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      setAddModalOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserDept("");
      setNewUserPass("");
    });
  };

  const handleRoleChange = (userId: string, newRole: "MANAGER" | "MEMBER") => {
    startTransition(async () => {
      await updateProjectMemberRole({
        projectId: project.id,
        userId,
        role: newRole,
      });
    });
  };

  const handleRemoveMember = (userId: string, memberName: string) => {
    if (!confirm(`هل أنت تأكد من إزالة ${memberName} من المشروع؟`)) return;

    startTransition(async () => {
      await removeProjectMember({
        projectId: project.id,
        userId,
      });
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            <h3 className="text-[18px] font-semibold text-ink">
              أعضاء فريق المشروع
            </h3>
          </div>
          <p className="mt-0.5 text-[13px] text-ink/45">
            الأعضاء المسجلون والمسؤولون في هذا المشروع ({project.members.length} عضو)
          </p>
        </div>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-accent-600"
          >
            <UserPlus className="h-4 w-4" />
            إضافة عضو للمشروع
          </button>
        )}
      </div>

      {/* Members List */}
      {project.members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/15 py-14 text-center text-[14px] text-ink/35">
          لا يوجد أعضاء في هذا المشروع بعد.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink/10 bg-paper shadow-sm">
          <div className="divide-y divide-ink/6">
            {project.members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-ink/[0.015]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-[14px] font-bold text-accent">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-ink">
                        {m.name}
                      </span>
                      {m.projectRole === "MANAGER" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                          <Shield className="h-3 w-3" />
                          مدير المشروع
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-ink/6 px-2 py-0.5 text-[11px] font-medium text-ink/60">
                          <User className="h-3 w-3" />
                          عضو
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[12px] text-ink/40">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {m.email}
                      </span>
                      {m.department && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {m.department}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isSuperAdmin && (
                    <select
                      value={m.projectRole}
                      onChange={(e) =>
                        handleRoleChange(
                          m.userId,
                          e.target.value as "MANAGER" | "MEMBER"
                        )
                      }
                      disabled={pending}
                      className="rounded-lg border border-ink/15 bg-paper px-2.5 py-1 text-[12px] text-ink outline-none transition focus:border-accent"
                    >
                      <option value="MEMBER">عضو (MEMBER)</option>
                      <option value="MANAGER">مدير (MANAGER)</option>
                    </select>
                  )}

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.userId, m.name)}
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-lg p-2 text-[12px] font-medium text-red-500 opacity-80 transition hover:bg-red-50 hover:opacity-100 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      إزالة
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Member / Create User Modal */}
      {addModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddModalOpen(false);
          }}
        >
          <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-lg">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-ink/8 px-6 py-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-accent" />
                <h3 className="text-[17px] font-semibold text-ink">
                  إضافة عضو للمشروع
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-lg p-1.5 text-ink/35 transition hover:bg-ink/5 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="flex border-b border-ink/8 bg-surface px-6 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalTab("existing");
                  setError(null);
                }}
                className={`relative px-4 py-2.5 text-[13px] font-medium transition ${modalTab === "existing"
                    ? "text-accent"
                    : "text-ink/50 hover:text-ink"
                  }`}
              >
                اختيار مستخدم موجود
                {modalTab === "existing" && (
                  <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-accent" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalTab("new");
                  setError(null);
                }}
                className={`relative px-4 py-2.5 text-[13px] font-medium transition ${modalTab === "new"
                    ? "text-accent"
                    : "text-ink/50 hover:text-ink"
                  }`}
              >
                إنشاء مستخدم جديد للنظام
                {modalTab === "new" && (
                  <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-accent" />
                )}
              </button>
            </div>

            {/* Modal Body */}
            {modalTab === "existing" ? (
              <div className="flex flex-col gap-4 px-6 py-5">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-ink/50">
                    اختر العضو <span className="text-red-400">*</span>
                  </span>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full rounded-xl border border-ink/15 bg-paper px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/12"
                  >
                    <option value="">— اختر مستخدماً من النظام —</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-ink/50">
                    الدور في هذا المشروع
                  </span>
                  <select
                    value={memberRole}
                    onChange={(e) =>
                      setMemberRole(e.target.value as "MANAGER" | "MEMBER")
                    }
                    className="w-full rounded-xl border border-ink/15 bg-paper px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/12"
                  >
                    <option value="MEMBER">عضو فريق (MEMBER)</option>
                    <option value="MANAGER">مدير مشروع (MANAGER)</option>
                  </select>
                </label>

                <div className="flex items-start gap-2.5 rounded-xl border border-accent/15 bg-accent/6 px-4 py-3 text-[12px] leading-relaxed text-accent">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>إشعار بريدي:</strong> سيتم إرسال دعوة بريدية تلقائياً لبريد العضو فور إضافته للمشروع.
                  </span>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12px] text-red-600">
                    {error}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 px-6 py-5">
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium text-ink/50">
                    الاسم الكامل <span className="text-red-400">*</span>
                  </span>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="مثال: أحمد محمد"
                    className="w-full rounded-xl border border-ink/15 bg-paper px-3.5 py-2 text-[14px] text-ink outline-none transition focus:border-accent"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium text-ink/50">
                    البريد الإلكتروني <span className="text-red-400">*</span>
                  </span>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="ahmed@example.com"
                    className="w-full rounded-xl border border-ink/15 bg-paper px-3.5 py-2 text-[14px] text-ink outline-none transition focus:border-accent"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] font-medium text-ink/50">
                      دور النظام
                    </span>
                    <select
                      value={newUserRole}
                      onChange={(e) =>
                        setNewUserRole(e.target.value as "SUPER_ADMIN" | "MANAGER" | "MEMBER")
                      }
                      className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent"
                    >
                      <option value="MEMBER">عضو (MEMBER)</option>
                      <option value="MANAGER">مدير (MANAGER)</option>
                      <option value="SUPER_ADMIN">مدير عام (SUPER_ADMIN)</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] font-medium text-ink/50">
                      القسم (اختياري)
                    </span>
                    <input
                      type="text"
                      value={newUserDept}
                      onChange={(e) => setNewUserDept(e.target.value)}
                      placeholder="تقنية المعلومات"
                      className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium text-ink/50">
                    كلمة المرور الأولية (افتراضي: 123456789)
                  </span>
                  <div className="relative">
                    <input
                      type="text"
                      value={newUserPass}
                      onChange={(e) => setNewUserPass(e.target.value)}
                      placeholder="123456789"
                      className="w-full rounded-xl border border-ink/15 bg-paper px-3.5 py-2 text-[13px] text-ink outline-none transition focus:border-accent"
                    />
                  </div>
                </label>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12px] text-red-600">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-ink/8 px-6 py-4">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-xl border border-ink/12 px-4 py-2 text-[14px] text-ink/60 transition hover:bg-ink/5"
              >
                إلغاء
              </button>

              {modalTab === "existing" ? (
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={pending || !selectedUserId}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2 text-[14px] font-semibold text-white transition disabled:opacity-40 hover:bg-accent-600"
                >
                  <UserCheck className="h-4 w-4" />
                  {pending ? "جارٍ الإضافة…" : "إضافة وتأكيد"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateNewUser}
                  disabled={pending || !newUserName.trim() || !newUserEmail.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2 text-[14px] font-semibold text-white transition disabled:opacity-40 hover:bg-accent-600"
                >
                  {/* <Sparkles className="h-4 w-4" /> */}
                  {pending ? "جارٍ الإنشـاء…" : "إنشاء وإضافة للمشروع"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
