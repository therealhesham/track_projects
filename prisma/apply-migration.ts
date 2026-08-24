// Apply task approval lifecycle columns to the existing `tasks` table.
// Run: npx tsx prisma/apply-migration.ts
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

interface FKRow {
  CONSTRAINT_NAME: string;
}

async function fkExists(constraint: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<FKRow[]>(
    `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_NAME = 'tasks'
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'
       AND CONSTRAINT_NAME = '${constraint}'
       AND TABLE_SCHEMA = DATABASE()`
  );
  return rows.length > 0;
}

async function exec(sql: string, label: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log("✓", label);
  } catch (e: unknown) {
    if (e instanceof Error) console.error("✗", label, "—", e.message.slice(0, 160));
    else console.error("✗", label);
  }
}

async function main() {
  // Add addedById
  if (!(await columnExists("tasks", "addedById"))) {
    await exec(
      "ALTER TABLE `tasks` ADD COLUMN `addedById` VARCHAR(191) NULL",
      "ADD addedById"
    );
  } else {
    console.log("– addedById already exists");
  }

  // Add approvalStatus
  if (!(await columnExists("tasks", "approvalStatus"))) {
    await exec(
      "ALTER TABLE `tasks` ADD COLUMN `approvalStatus` ENUM('PENDING_APPROVAL','ACTIVE','PENDING_COMPLETION','DONE','REJECTED') NOT NULL DEFAULT 'ACTIVE'",
      "ADD approvalStatus"
    );
  } else {
    console.log("– approvalStatus already exists");
  }

  // Add completionNote
  if (!(await columnExists("tasks", "completionNote"))) {
    await exec(
      "ALTER TABLE `tasks` ADD COLUMN `completionNote` TEXT NULL",
      "ADD completionNote"
    );
  } else {
    console.log("– completionNote already exists");
  }

  // Add completionRequestedAt
  if (!(await columnExists("tasks", "completionRequestedAt"))) {
    await exec(
      "ALTER TABLE `tasks` ADD COLUMN `completionRequestedAt` DATETIME(3) NULL",
      "ADD completionRequestedAt"
    );
  } else {
    console.log("– completionRequestedAt already exists");
  }

  // Add managerApprovedAt
  if (!(await columnExists("tasks", "managerApprovedAt"))) {
    await exec(
      "ALTER TABLE `tasks` ADD COLUMN `managerApprovedAt` DATETIME(3) NULL",
      "ADD managerApprovedAt"
    );
  } else {
    console.log("– managerApprovedAt already exists");
  }

  // Add index on addedById
  try {
    await prisma.$executeRawUnsafe(
      "CREATE INDEX `tasks_addedById_idx` ON `tasks`(`addedById`)"
    );
    console.log("✓ INDEX tasks_addedById_idx");
  } catch {
    console.log("– INDEX tasks_addedById_idx (already exists or skipped)");
  }

  // Add index on approvalStatus
  try {
    await prisma.$executeRawUnsafe(
      "CREATE INDEX `tasks_approvalStatus_idx` ON `tasks`(`approvalStatus`)"
    );
    console.log("✓ INDEX tasks_approvalStatus_idx");
  } catch {
    console.log("– INDEX tasks_approvalStatus_idx (already exists or skipped)");
  }

  // Add FK only after addedById column confirmed present
  if (!(await fkExists("tasks_addedById_fkey"))) {
    if (await columnExists("tasks", "addedById")) {
      await exec(
        "ALTER TABLE `tasks` ADD CONSTRAINT `tasks_addedById_fkey` FOREIGN KEY (`addedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
        "FK tasks_addedById_fkey"
      );
    }
  } else {
    console.log("– FK tasks_addedById_fkey already exists");
  }

  console.log("\nMigration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
