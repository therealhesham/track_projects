// Add the two decision-reason columns to `tasks`, `subtasks` and `daily_tasks`:
// `reviewNote` (why the item was admitted or turned away) and
// `completionReviewNote` (why its completion was signed off or sent back).
// Idempotent: safe to re-run. Run: npx tsx prisma/add-decision-reasons.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`,
  );
  return rows.length > 0;
}

async function addColumn(table: string, column: string) {
  if (await columnExists(table, column)) {
    console.log(`– ${table}.${column} already exists`);
    return;
  }
  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` TEXT NULL`,
  );
  console.log(`✓ ${table}.${column} added`);
}

async function main() {
  for (const table of ["tasks", "subtasks", "daily_tasks"]) {
    await addColumn(table, "reviewNote");
    await addColumn(table, "completionReviewNote");
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
