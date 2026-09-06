-- Rename table (preserves all existing rows)
RENAME TABLE `UserStarredItem` TO `UserLikedItem`;

-- Rename indexes to match the new table name
ALTER TABLE `UserLikedItem` RENAME INDEX `UserStarredItem_itemId_fkey` TO `UserLikedItem_itemId_fkey`;
ALTER TABLE `UserLikedItem` RENAME INDEX `UserStarredItem_userId_itemId_key` TO `UserLikedItem_userId_itemId_key`;

-- Rename foreign key constraints to match (metadata only, no rows affected)
ALTER TABLE `UserLikedItem` DROP FOREIGN KEY `UserStarredItem_itemId_fkey`;
ALTER TABLE `UserLikedItem` ADD CONSTRAINT `UserLikedItem_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `UserLikedItem` DROP FOREIGN KEY `UserStarredItem_userId_fkey`;
ALTER TABLE `UserLikedItem` ADD CONSTRAINT `UserLikedItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `UserLikedItem` DROP FOREIGN KEY `UserStarredItem_fairId_fkey`;
ALTER TABLE `UserLikedItem` ADD CONSTRAINT `UserLikedItem_fairId_fkey` FOREIGN KEY (`fairId`) REFERENCES `Fair`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
