/**
 * Import the software-projects table from jobs.rawaes.com into this database.
 *
 * Run: npx tsx prisma/import-rawaes.ts
 *
 * Keyed on stable ids, so re-running converges rather than duplicates. It does
 * converge, though — a re-run restores every field below to the value written
 * here, so anything edited in the app afterwards is overwritten. Import once,
 * then edit in the app.
 *
 * Nothing is deleted, and no task is created: the source table has no task
 * breakdown, only a percentage per project. That percentage goes to
 * `progressPct`, which stands in only while a project has no tasks of its own —
 * adding the first one hands the figure back to the count automatically.
 *
 * Two owners already had accounts (عمر, هشام) and are matched by email. The
 * other two are created without a password — they cannot sign in until one is
 * set, which is deliberate: no credential is invented here.
 */
import { PrismaClient, ProjectStatus } from "@prisma/client";

const prisma = new PrismaClient();

/** Midday, so a timezone shift either way cannot move the calendar day. */
const date = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

/**
 * The source table shows a delivery date on some rows and a "متأخر N يوم"
 * countdown on others, both read on 2026-09-07. Where a row showed only the
 * countdown the date below is derived from it; where it showed both they agree,
 * except on project 4, whose note records that the date was revised after the
 * displayed one. The countdown is the more current of the two, so it wins.
 */
const owners = {
  omar: { email: "mark1@rawaes.com", name: "عمر" },
  hesham: { email: "heshammoha241992@gmail.com", name: "هشام" },
  nour: { email: "nour@rawaes.com", name: "نور الدين" },
  saleh: { email: "saleh@rawaes.com", name: "صالح" },
} as const;

type OwnerKey = keyof typeof owners;

type Row = {
  id: string;
  name: string;
  owner: OwnerKey;
  dueDate: string | null;
  progressPct: number;
  status: ProjectStatus;
  note: string | null;
};

const rows: Row[] = [
  {
    id: "rawaes-p1",
    name: "برنامج العهد والاصول",
    owner: "omar",
    dueDate: "2026-07-21",
    progressPct: 100,
    status: ProjectStatus.DONE,
    note: null,
  },
  {
    id: "rawaes-p2",
    name: "برنامج السياحة الاداري",
    owner: "hesham",
    dueDate: "2026-07-26",
    progressPct: 100,
    status: ProjectStatus.DONE,
    note: "تم الانتهاء من الجزء الأكبر من المشروع ولكن الاولوية لمشاريع أخري مفتوحة حاليا",
  },
  {
    id: "rawaes-p3",
    name: "موقع الادارة القانونية (المرحلة 2)",
    owner: "omar",
    dueDate: "2026-08-15",
    progressPct: 0,
    status: ProjectStatus.ACTIVE,
    note: "قطاعات ولكل قطاع امكانية رؤية معاملات التنفيذ الي من طرفه. التواريخ لبدء المرحلة ونهايتها ليست دقيقة",
  },
  {
    id: "rawaes-p4",
    name: "برنامج التوصيل (اللوجستية)",
    owner: "nour",
    dueDate: "2026-08-25",
    progressPct: 70,
    status: ProjectStatus.ACTIVE,
    note: "تم تعديل وقت التسليم بناء علي التعديلات الاخيرة بعد الفحص",
  },
  {
    id: "rawaes-p5",
    name: "تطبيق جوال للاستقدام",
    owner: "omar",
    dueDate: "2026-08-31",
    progressPct: 0,
    status: ProjectStatus.ACTIVE,
    note: null,
  },
  {
    // Already in the database as "ابلكيشن تأجير سيارات"; kept and renamed rather
    // than duplicated. Its three tasks are test rows, so the source percentage
    // is the truer figure here too.
    id: "cmtiidrq00001mo014akfxttg",
    name: "تطبيق جوال لتأجير السيارات",
    owner: "hesham",
    dueDate: "2026-09-10",
    progressPct: 50,
    status: ProjectStatus.ACTIVE,
    note: null,
  },
  {
    id: "rawaes-p7",
    name: "برنامج الاستقدام",
    owner: "omar",
    dueDate: null,
    progressPct: 0,
    status: ProjectStatus.PLANNING,
    note: null,
  },
  {
    id: "rawaes-p8",
    name: "برنامج الصيانة",
    owner: "saleh",
    dueDate: null,
    progressPct: 100,
    status: ProjectStatus.DONE,
    note: "تم الانتهاء من البرنامج بالكامل وجاري تطبيق التعديلات بعد الفحص",
  },
  {
    id: "rawaes-p9",
    name: "برنامج التشييك",
    owner: "omar",
    dueDate: null,
    progressPct: 0,
    status: ProjectStatus.PLANNING,
    note: null,
  },
  {
    id: "rawaes-p10",
    name: "المنصة الداخلية",
    owner: "nour",
    dueDate: null,
    progressPct: 0,
    status: ProjectStatus.BLOCKED,
    note: "متوقف",
  },
  {
    id: "rawaes-p11",
    name: "موقع السيارات",
    owner: "hesham",
    dueDate: null,
    progressPct: 100,
    status: ProjectStatus.DONE,
    note: null,
  },
  {
    id: "rawaes-p12",
    name: "برنامج الحوادث",
    owner: "saleh",
    dueDate: null,
    progressPct: 0,
    status: ProjectStatus.PLANNING,
    note: "يتم البدء بعد الانتهاء من الصيانة",
  },
  {
    id: "rawaes-p13",
    name: "برنامج الاستقدام الخارجي",
    owner: "omar",
    dueDate: null,
    progressPct: 0,
    status: ProjectStatus.PLANNING,
    note: null,
  },
  {
    id: "rawaes-p14",
    name: "برنامج ادارة الموارد البشرية",
    owner: "omar",
    dueDate: null,
    progressPct: 0,
    status: ProjectStatus.PLANNING,
    note: null,
  },
  {
    id: "rawaes-p15",
    name: "موقع روائع لبيع البرامج",
    owner: "hesham",
    dueDate: null,
    progressPct: 75,
    status: ProjectStatus.ACTIVE,
    note: "موقع لبيع البرامج المصممة من روائع",
  },
];

const DEPARTMENT = "التقنية";

async function main() {
  // ── Owners ────────────────────────────────────────────────────────────────
  // Keyed on email, the column the database already makes unique: an owner who
  // is here under an id this script never chose is still matched, not doubled.
  const userIds = new Map<OwnerKey, string>();

  for (const [key, o] of Object.entries(owners) as [OwnerKey, { email: string; name: string }][]) {
    const user = await prisma.user.upsert({
      where: { email: o.email },
      // Existing accounts keep their name, role and password; they are people
      // already using the app, and the source table knows less about them than
      // the database does.
      update: {},
      create: {
        email: o.email,
        name: o.name,
        role: "MANAGER",
        department: DEPARTMENT,
      },
    });
    userIds.set(key, user.id);
    console.log(`user: ${user.name} <${user.email}> (${user.role})`);
  }

  // ── Projects ──────────────────────────────────────────────────────────────
  for (const r of rows) {
    const ownerId = userIds.get(r.owner)!;
    const fields = {
      name: r.name,
      department: DEPARTMENT,
      status: r.status,
      note: r.note,
      dueDate: r.dueDate ? date(r.dueDate) : null,
      progressPct: r.progressPct,
      ownerId,
    };

    await prisma.project.upsert({
      where: { id: r.id },
      update: fields,
      create: { id: r.id, ...fields },
    });

    // The schema asks application code to keep the owner on a MANAGER
    // membership; the database cannot state it itself.
    await prisma.projectMember.upsert({
      where: { userId_projectId: { userId: ownerId, projectId: r.id } },
      update: { role: "MANAGER" },
      create: { userId: ownerId, projectId: r.id, role: "MANAGER" },
    });

    console.log(
      `project: ${r.name} — ${owners[r.owner].name}, ${r.progressPct}%, ${r.status}` +
        (r.dueDate ? `, تسليم ${r.dueDate}` : ""),
    );
  }
}

main()
  .then(() => console.log(`\nimported ${rows.length} projects`))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
