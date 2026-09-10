// Create the `subtasks` table — one step of a task, carrying the same approval
// lifecycle as its parent.
// Idempotent: safe to re-run. Run: npx tsx prisma/add-subtasks.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}'`
  );
  return rows.length > 0;
}

async function main() {
  if (await tableExists("subtasks")) {
    console.log("– subtasks already exists");
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE \`subtasks\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`taskId\` VARCHAR(191) NOT NULL,
      \`title\` VARCHAR(191) NOT NULL,
      \`position\` INTEGER NOT NULL DEFAULT 0,
      \`assigneeId\` VARCHAR(191) NULL,
      \`addedById\` VARCHAR(191) NULL,
      \`approvalStatus\` ENUM('PENDING_APPROVAL','ACTIVE','PENDING_COMPLETION','DONE','REJECTED') NOT NULL DEFAULT 'PENDING_APPROVAL',
      \`completionNote\` TEXT NULL,
      \`completionRequestedAt\` DATETIME(3) NULL,
      \`managerApprovedAt\` DATETIME(3) NULL,
      \`startedAt\` DATETIME(3) NULL,
      \`completedAt\` DATETIME(3) NULL,
      \`dueDate\` DATE NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,

      INDEX \`subtasks_taskId_position_idx\`(\`taskId\`, \`position\`),
      INDEX \`subtasks_assigneeId_idx\`(\`assigneeId\`),
      INDEX \`subtasks_addedById_idx\`(\`addedById\`),
      INDEX \`subtasks_approvalStatus_idx\`(\`approvalStatus\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log("✓ CREATE TABLE subtasks");

  const fks: [string, string][] = [
    [
      "subtasks_taskId_fkey",
      "ALTER TABLE `subtasks` ADD CONSTRAINT `subtasks_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
    ],
    [
      "subtasks_assigneeId_fkey",
      "ALTER TABLE `subtasks` ADD CONSTRAINT `subtasks_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
    ],
    [
      "subtasks_addedById_fkey",
      "ALTER TABLE `subtasks` ADD CONSTRAINT `subtasks_addedById_fkey` FOREIGN KEY (`addedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
    ],
  ];

  for (const [label, sql] of fks) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log("✓ FK", label);
    } catch (e: unknown) {
      if (e instanceof Error) console.error("✗ FK", label, "—", e.message.slice(0, 160));
      else console.error("✗ FK", label);
    }
  }

  console.log("\nMigration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
