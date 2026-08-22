-- AlterTable
-- Drops the items-only import pass tracking columns, added when the
-- comments/items fetch was split, now reverted back to a single source.
ALTER TABLE `Fair`
    DROP COLUMN `itemsLastUpdated`,
    DROP COLUMN `itemsLastResult`,
    DROP COLUMN `itemsStartedAt`,
    DROP COLUMN `latestItemsFile`;
