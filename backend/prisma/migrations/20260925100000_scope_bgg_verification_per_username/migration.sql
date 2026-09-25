-- DropForeignKey
ALTER TABLE `BggVerification` DROP FOREIGN KEY `BggVerification_userId_fkey`;

-- DropIndex
DROP INDEX `BggVerification_userId_key` ON `BggVerification`;

-- CreateIndex
CREATE UNIQUE INDEX `BggVerification_userId_bggUsername_key` ON `BggVerification`(`userId`, `bggUsername`);

-- AddForeignKey
ALTER TABLE `BggVerification` ADD CONSTRAINT `BggVerification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
