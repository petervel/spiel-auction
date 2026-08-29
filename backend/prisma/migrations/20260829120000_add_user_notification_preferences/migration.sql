-- AlterTable
ALTER TABLE `User`
    ADD COLUMN `notifyOnOutbid` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `notifyOnNewBid` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `notifyOnAuctionWon` BOOLEAN NOT NULL DEFAULT true;
