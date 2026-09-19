import { FairStatus } from "@prisma/client";
import prisma from "../prismaClient";
import { isDue, runUpdate } from "./updateData";
import { runRssUpdate } from "./updateRssData";
import { isLocked, notLockedFilter } from "./util/lock";

// Interleaves per fair - full update (if due), then RSS update, for fair A;
// then fair B; ... - rather than looping all fairs' full updates before any
// fair's RSS update. That matters because one fair's full update can be
// slow (or fail) on a big/busy geeklist: looping job-by-job instead of
// fair-by-fair would delay every other fair's RSS pickup behind it, since
// node-cron can't fire the next tick until this whole callback returns.
//
// No re-fetch of the fair row between the two steps for a given fair:
// runUpdate only touches lastResult/startedAt/lastUpdated/latestFile, none
// of which runRssUpdate needs a fresh read of for correctness (its own
// cursor, rssLastSeenTimestamp, is never touched by runUpdate; and it sets
// its own lastResult: RUNNING unconditionally rather than trusting the
// snapshot it was passed). Both runUpdate and runRssUpdate already catch
// their own errors internally and never throw to this loop, so one fair's
// failure can't abort the cycle or skip later fairs.
export const runImportCycle = async () => {
	const now = Math.floor(Date.now() / 1000);

	const fairs = await prisma.fair.findMany({
		where: {
			status: FairStatus.ACTIVE,
			...notLockedFilter(now),
		},
	});

	for (const fair of fairs) {
		if (isLocked(fair.lastResult, fair.startedAt, now)) continue;

		if (isDue(fair.lastUpdated, now)) {
			await runUpdate(fair, now);
		}

		await runRssUpdate(fair, now);
	}

	return true;
};
