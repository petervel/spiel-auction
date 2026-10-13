-- AlterTable
ALTER TABLE `Meetup` ADD COLUMN `customDescription` TEXT NULL,
    ADD COLUMN `isCustom` BOOLEAN NOT NULL DEFAULT false;
