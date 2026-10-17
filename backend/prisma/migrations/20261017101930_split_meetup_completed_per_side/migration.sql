-- AlterTable: add the new per-side fields
ALTER TABLE `Meetup`
    ADD COLUMN `buyerCompleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `buyerCompletedAt` DATETIME(3) NULL,
    ADD COLUMN `sellerCompleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `sellerCompletedAt` DATETIME(3) NULL,
    ADD COLUMN `buyerMessageSent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `sellerMessageSent` BOOLEAN NOT NULL DEFAULT false;

-- Backfill: the old shared `completed` value applied to both parties, so
-- it's the correct starting point for each new per-side field.
UPDATE `Meetup`
SET `buyerCompleted` = `completed`,
    `buyerCompletedAt` = `completedAt`,
    `sellerCompleted` = `completed`,
    `sellerCompletedAt` = `completedAt`;

-- AlterTable: drop the old shared fields
ALTER TABLE `Meetup`
    DROP COLUMN `completed`,
    DROP COLUMN `completedAt`;
