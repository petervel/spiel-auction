-- AlterTable
ALTER TABLE `Meetup`
    ADD COLUMN `buyerPrepaid` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `sellerPrepaid` BOOLEAN NOT NULL DEFAULT false;
