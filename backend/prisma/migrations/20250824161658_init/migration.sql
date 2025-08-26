-- AlterTable
ALTER TABLE `User` ADD COLUMN `currentUserFairId` INTEGER NULL,
    MODIFY `accessLevel` ENUM('ADMIN', 'NORMAL', 'MODERATOR') NOT NULL DEFAULT 'NORMAL';

-- CreateTable
CREATE TABLE `UserFair` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `fairId` INTEGER NOT NULL,
    `bookmark` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `UserFair_userId_fairId_key`(`userId`, `fairId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_currentUserFairId_fkey` FOREIGN KEY (`currentUserFairId`) REFERENCES `UserFair`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserFair` ADD CONSTRAINT `UserFair_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserFair` ADD CONSTRAINT `UserFair_fairId_fkey` FOREIGN KEY (`fairId`) REFERENCES `Fair`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
