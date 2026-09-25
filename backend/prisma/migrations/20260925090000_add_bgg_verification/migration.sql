-- CreateTable
CREATE TABLE `BggVerification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `bggUsername` VARCHAR(191) NOT NULL,
    `hash` VARCHAR(191) NOT NULL,
    `confirmed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmedAt` DATETIME(3) NULL,

    UNIQUE INDEX `BggVerification_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BggVerification` ADD CONSTRAINT `BggVerification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
