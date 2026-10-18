-- AlterTable
ALTER TABLE `Meetup`
    ADD COLUMN `buyerNotifyReminder` BOOLEAN NULL,
    ADD COLUMN `sellerNotifyReminder` BOOLEAN NULL,
    ADD COLUMN `buyerReminderSentAt` DATETIME(3) NULL,
    ADD COLUMN `sellerReminderSentAt` DATETIME(3) NULL;
