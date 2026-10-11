-- AlterTable
ALTER TABLE `User` ADD COLUMN `buyerMessageTemplate` TEXT NULL,
    ADD COLUMN `preferredTradeDays` JSON NULL,
    ADD COLUMN `sellerMessageTemplate` TEXT NULL;
