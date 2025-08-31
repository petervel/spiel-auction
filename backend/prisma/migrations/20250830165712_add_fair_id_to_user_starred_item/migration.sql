-- AlterTable
ALTER TABLE `UserStarredItem` ADD COLUMN `fairId` INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE `UserStarredItem` ADD CONSTRAINT `UserStarredItem_fairId_fkey` FOREIGN KEY (`fairId`) REFERENCES `Fair`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
