// Add `projects.progressPct` — the manually stated completion percentage.
// Idempotent: safe to re-run. Run: npx tsx prisma/add-progress-pct.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ColumnRow {
  Field: string;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<ColumnRow[]>(
    `SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`
  );
  return rows.length > 0;
}

async function main() {
  if (await columnExists("projects", "progressPct")) {
    console.log("– progressPct already exists");
    return;
  }
  await prisma.$executeRawUnsafe(
    "ALTER TABLE `projects` ADD COLUMN `progressPct` INT NULL"
  );
  console.log("✓ ADD projects.progressPct");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
