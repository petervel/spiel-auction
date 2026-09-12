-- CreateTable
CREATE TABLE `BggObject` (
    `objectId` INTEGER NOT NULL,
    `objectType` VARCHAR(191) NOT NULL,
    `objectSubtype` VARCHAR(191) NOT NULL,
    `objectName` TEXT NOT NULL,

    PRIMARY KEY (`objectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserWishlistItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `objectId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserWishlistItem_objectId_fkey`(`objectId`),
    UNIQUE INDEX `UserWishlistItem_userId_objectId_key`(`userId`, `objectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserWishlistItem` ADD CONSTRAINT `UserWishlistItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserWishlistItem` ADD CONSTRAINT `UserWishlistItem_objectId_fkey` FOREIGN KEY (`objectId`) REFERENCES `BggObject`(`objectId`) ON DELETE RESTRICT ON UPDATE CASCADE;
