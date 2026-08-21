-- AlterTable
ALTER TABLE `Fair` ADD COLUMN `eventDate` DATETIME(3) NULL;

-- Backfill real event dates for existing fairs
UPDATE `Fair` SET `eventDate` = '2026-10-25' WHERE `geeklistId` = 382717; -- Essen Spiel 2026
UPDATE `Fair` SET `eventDate` = '2025-10-26' WHERE `geeklistId` = 319165; -- Essen Spiel 2025
UPDATE `Fair` SET `eventDate` = '2026-10-09' WHERE `geeklistId` = 305536; -- Auction Test

-- Now that every existing row has a value, make it required
ALTER TABLE `Fair` MODIFY `eventDate` DATETIME(3) NOT NULL;
