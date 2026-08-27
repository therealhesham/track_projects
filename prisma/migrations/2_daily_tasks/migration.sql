-- CreateTable
CREATE TABLE `daily_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `note` TEXT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `addedById` VARCHAR(191) NULL,
    `day` DATE NOT NULL,
    `approvalStatus` ENUM('PENDING_APPROVAL', 'ACTIVE', 'PENDING_COMPLETION', 'DONE', 'REJECTED') NOT NULL DEFAULT 'PENDING_APPROVAL',
    `completionNote` TEXT NULL,
    `completionRequestedAt` DATETIME(3) NULL,
    `managerApprovedAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `daily_tasks_ownerId_day_idx`(`ownerId`, `day`),
    INDEX `daily_tasks_approvalStatus_idx`(`approvalStatus`),
    INDEX `daily_tasks_day_idx`(`day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `daily_tasks` ADD CONSTRAINT `daily_tasks_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_tasks` ADD CONSTRAINT `daily_tasks_addedById_fkey` FOREIGN KEY (`addedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
