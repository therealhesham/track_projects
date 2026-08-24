/**
 * Sample data for a fresh `project_tracking` database.
 *
 * Throwaway scaffolding to make the UI show something real — delete the rows
 * once actual projects are entered. Safe to re-run: every write is an upsert
 * keyed on a stable id, so running it twice does not duplicate anything, and it
 * never deletes.
 *
 * Passwords come from SEED_PASSWORD in .env; the script refuses to run without
 * one rather than baking a default credential into the repository.
 */
import { PrismaClient, ProjectStatus, TaskStage } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const OWNER_ID = "seed-hesham";
const OWNER_EMAIL = "heshammoha241992@gmail.com";

/** Days offset from today, so the calendar always has movement to show. */
const day = (offset: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
};

type SeedTask = {
  title: string;
  stage: TaskStage;
  startedAt: Date | null;
  completedAt: Date | null;
};

const projects: {
  id: string;
  name: string;
  kicker: string;
  department: string;
  status: ProjectStatus;
  note: string;
  dueDate: Date;
  tasks: SeedTask[];
}[] = [
  {
    id: "seed-p1",
    name: "منصة تتبع المشاريع",
    kicker: "تطوير داخلي",
    department: "التقنية",
    status: ProjectStatus.ACTIVE,
    note: "الواجهة جاهزة والداتابيز اتربطت. باقي الصلاحيات وتسجيل الدخول.",
    dueDate: day(21),
    tasks: [
      { title: "تصميم الواجهة", stage: TaskStage.DONE, startedAt: day(-18), completedAt: day(-9) },
      { title: "تصميم قاعدة البيانات", stage: TaskStage.DONE, startedAt: day(-8), completedAt: day(-2) },
      { title: "ربط الواجهة بالداتابيز", stage: TaskStage.IN_PROGRESS, startedAt: day(-1), completedAt: null },
      { title: "تسجيل الدخول والصلاحيات", stage: TaskStage.NEW, startedAt: null, completedAt: null },
      { title: "النشر على السيرفر", stage: TaskStage.NEW, startedAt: null, completedAt: null },
    ],
  },
  {
    id: "seed-p2",
    name: "تطبيق الجوّال",
    kicker: "الإصدار الأول",
    department: "التقنية",
    status: ProjectStatus.PLANNING,
    note: "في مرحلة تحديد النطاق. لسه ما اتحددش هل هيكون native ولا cross-platform.",
    dueDate: day(60),
    tasks: [
      { title: "تحديد نطاق العمل", stage: TaskStage.IN_PROGRESS, startedAt: day(-3), completedAt: null },
      { title: "اختيار التقنية", stage: TaskStage.NEW, startedAt: null, completedAt: null },
      { title: "تصميم الشاشات", stage: TaskStage.NEW, startedAt: null, completedAt: null },
    ],
  },
  {
    id: "seed-p3",
    name: "ترحيل السيرفرات",
    kicker: "بنية تحتية",
    department: "التقنية",
    status: ProjectStatus.BLOCKED,
    note: "متوقف لحين اعتماد الميزانية. النسخ الاحتياطي جاهز والباقي مرهون بالموافقة.",
    dueDate: day(10),
    tasks: [
      { title: "حصر الخوادم الحالية", stage: TaskStage.DONE, startedAt: day(-25), completedAt: day(-15) },
      { title: "إعداد النسخ الاحتياطي", stage: TaskStage.DONE, startedAt: day(-14), completedAt: day(-6) },
      { title: "اعتماد الميزانية", stage: TaskStage.REVIEW, startedAt: day(-5), completedAt: null },
      { title: "تنفيذ الترحيل", stage: TaskStage.NEW, startedAt: null, completedAt: null },
    ],
  },
];

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error(
      "Set SEED_PASSWORD in .env (at least 8 characters) before seeding.",
    );
  }
  const passwordHash = await bcrypt.hash(password, 10);

  const owner = await prisma.user.upsert({
    where: { id: OWNER_ID },
    // Re-running refreshes the password so a forgotten one can be reset here.
    update: { passwordHash },
    create: {
      id: OWNER_ID,
      name: "hesham ahmed",
      email: OWNER_EMAIL,
      passwordHash,
      role: "SUPER_ADMIN",
      department: "التقنية",
    },
  });
  console.log(`user: ${owner.name} <${owner.email}> (${owner.role})`);

  for (const p of projects) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        kicker: p.kicker,
        department: p.department,
        status: p.status,
        note: p.note,
        dueDate: p.dueDate,
        ownerId: owner.id,
        members: { create: [{ userId: owner.id, role: "MANAGER" }] },
        tasks: {
          create: p.tasks.map((t, position) => ({
            title: t.title,
            stage: t.stage,
            position,
            startedAt: t.startedAt,
            completedAt: t.completedAt,
            assigneeId: owner.id,
          })),
        },
        activity: {
          create: [{ message: "تم إنشاء المشروع", userId: owner.id }],
        },
      },
    });
    console.log(`project: ${p.name} (${p.tasks.length} tasks)`);
  }

  // Existing seed projects predate memberships; make sure the owner is enrolled.
  for (const p of projects) {
    await prisma.projectMember.upsert({
      where: { userId_projectId: { userId: owner.id, projectId: p.id } },
      update: { role: "MANAGER" },
      create: { userId: owner.id, projectId: p.id, role: "MANAGER" },
    });
  }
  console.log("memberships ensured");
}

main()
  .then(() => console.log("\nseed complete"))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
