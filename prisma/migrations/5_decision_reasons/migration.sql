-- Reasons behind the two approval decisions, on all three task kinds.
-- `reviewNote` carries why the item itself was admitted or turned away;
-- `completionReviewNote` why its completion was signed off or sent back.
-- Both nullable: every row that exists predates the feature, and an approval
-- may be given without a word.

ALTER TABLE `tasks`
  ADD COLUMN `reviewNote` TEXT NULL,
  ADD COLUMN `completionReviewNote` TEXT NULL;

ALTER TABLE `subtasks`
  ADD COLUMN `reviewNote` TEXT NULL,
  ADD COLUMN `completionReviewNote` TEXT NULL;

ALTER TABLE `daily_tasks`
  ADD COLUMN `reviewNote` TEXT NULL,
  ADD COLUMN `completionReviewNote` TEXT NULL;
