-- AlterTable
ALTER TABLE `Meetup` ADD COLUMN `completed` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `completedAt` DATETIME(3) NULL;
