-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `bggUsername` VARCHAR(191) NOT NULL,
    `accessLevel` ENUM('ADMIN', 'MODERATOR', 'NORMAL') NOT NULL DEFAULT 'NORMAL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Fair` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `geeklistId` INTEGER NOT NULL,
    `lastUpdated` INTEGER NOT NULL DEFAULT 0,
    `lastResult` ENUM('NONE', 'FAILURE', 'SUCCESS', 'RUNNING') NOT NULL DEFAULT 'NONE',
    `startedAt` INTEGER NOT NULL DEFAULT 0,
    `listId` INTEGER NULL,
    `latestFile` VARCHAR(191) NULL,

    UNIQUE INDEX `Fair_name_key`(`name`),
    UNIQUE INDEX `Fair_listId_key`(`listId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `List` (
    `id` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `postDate` DATETIME(3) NOT NULL,
    `postTimestamp` INTEGER NOT NULL,
    `editDate` DATETIME(3) NOT NULL,
    `editTimestamp` INTEGER NOT NULL,
    `thumbs` INTEGER NOT NULL,
    `itemCount` INTEGER NOT NULL,
    `description` TEXT NOT NULL,
    `tosUrl` VARCHAR(191) NOT NULL,
    `lastSeen` INTEGER NOT NULL DEFAULT 0,
    `deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `List_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Item` (
    `id` INTEGER NOT NULL,
    `listId` INTEGER NOT NULL,
    `objectType` VARCHAR(191) NOT NULL,
    `objectSubtype` VARCHAR(191) NOT NULL,
    `objectId` INTEGER NOT NULL,
    `objectName` TEXT NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `postDate` DATETIME(3) NOT NULL,
    `postTimestamp` INTEGER NOT NULL,
    `editDate` DATETIME(3) NOT NULL,
    `editTimestamp` INTEGER NOT NULL,
    `thumbs` INTEGER NOT NULL,
    `imageId` INTEGER NOT NULL,
    `body` TEXT NOT NULL,
    `language` TEXT NULL,
    `condition` TEXT NULL,
    `startingBid` INTEGER NULL,
    `softReserve` INTEGER NULL,
    `hardReserve` INTEGER NULL,
    `binPrice` INTEGER NULL,
    `auctionEnd` TEXT NULL,
    `auctionEndDate` TEXT NULL,
    `hasBids` BOOLEAN NOT NULL DEFAULT false,
    `isSold` BOOLEAN NOT NULL DEFAULT false,
    `isEnded` BOOLEAN NOT NULL DEFAULT false,
    `itemType` ENUM('GAME', 'PROMO', 'OTHER') NOT NULL DEFAULT 'GAME',
    `currentBid` INTEGER NULL,
    `highestBidder` VARCHAR(191) NULL,
    `lastSeen` INTEGER NOT NULL DEFAULT 0,
    `deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Item_id_key`(`id`),
    INDEX `Item_listId_deleted_id_idx`(`listId`, `deleted`, `id`),
    INDEX `Item_listId_deleted_username_idx`(`listId`, `deleted`, `username`),
    INDEX `Item_listId_deleted_highestBidder_idx`(`listId`, `deleted`, `highestBidder`),
    INDEX `Item_deleted_idx`(`deleted`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ListComment` (
    `listId` INTEGER NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `postDate` DATETIME(3) NOT NULL,
    `postTimestamp` INTEGER NOT NULL,
    `editDate` DATETIME(3) NOT NULL,
    `editTimestamp` INTEGER NOT NULL,
    `thumbs` INTEGER NOT NULL DEFAULT 0,
    `text` TEXT NOT NULL,
    `lastSeen` INTEGER NOT NULL DEFAULT 0,
    `deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `ListComment_listId_username_postTimestamp_key`(`listId`, `username`, `postTimestamp`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemComment` (
    `listId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `postDate` DATETIME(3) NOT NULL,
    `postTimestamp` INTEGER NOT NULL,
    `editDate` DATETIME(3) NOT NULL,
    `editTimestamp` INTEGER NOT NULL,
    `thumbs` INTEGER NOT NULL DEFAULT 0,
    `text` TEXT NOT NULL,
    `isBin` BOOLEAN NOT NULL DEFAULT false,
    `bid` INTEGER NULL,
    `oldBid` INTEGER NULL,
    `lastSeen` INTEGER NOT NULL DEFAULT 0,
    `deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `ItemComment_listId_idx`(`listId`),
    INDEX `ItemComment_deleted_idx`(`deleted`),
    INDEX `ItemComment_username_deleted_idx`(`username`, `deleted`),
    UNIQUE INDEX `ItemComment_itemId_username_postTimestamp_key`(`itemId`, `username`, `postTimestamp`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Fair` ADD CONSTRAINT `Fair_listId_fkey` FOREIGN KEY (`listId`) REFERENCES `List`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_listId_fkey` FOREIGN KEY (`listId`) REFERENCES `List`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListComment` ADD CONSTRAINT `ListComment_listId_fkey` FOREIGN KEY (`listId`) REFERENCES `List`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemComment` ADD CONSTRAINT `ItemComment_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

