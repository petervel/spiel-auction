-- AlterTable
ALTER TABLE `Fair`
    ADD COLUMN `hidden` BOOLEAN NOT NULL DEFAULT false;

-- One-time data fix: the test list was previously identified in code by
-- its geeklist ID. From here on, runtime code checks the `hidden` flag
-- instead - this UPDATE is the only place the ID is used going forward.
UPDATE `Fair` SET `hidden` = true WHERE `geeklistId` = 305536;
