-- CreateTable
CREATE TABLE `Meetup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fairId` INTEGER NOT NULL,
    `buyerUsername` VARCHAR(191) NOT NULL,
    `sellerUsername` VARCHAR(191) NOT NULL,
    `day` ENUM('WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NULL,
    `location` VARCHAR(191) NOT NULL DEFAULT 'Hall 1A',
    `time` VARCHAR(191) NOT NULL DEFAULT '15:00',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Meetup_fairId_buyerUsername_sellerUsername_key`(`fairId`, `buyerUsername`, `sellerUsername`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Meetup` ADD CONSTRAINT `Meetup_fairId_fkey` FOREIGN KEY (`fairId`) REFERENCES `Fair`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
