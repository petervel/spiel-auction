import { FairStatus } from "@prisma/client";
import prisma from "../prismaClient";
import { isDue, runUpdate } from "./updateData";
import { runNewItemsUpdate } from "./updateNewItemsData";
import { runRssUpdate } from "./updateRssData";
import { isLocked, notLockedFilter } from "./util/lock";

// Interleaves per fair - full update (if due), then RSS update, then
// new-items update, for fair A; then fair B; ... - rather than looping all
// fairs through one step before any fair moves to the next. That matters
// because one fair's full update can be slow (or fail) on a big/busy
// geeklist: looping job-by-job instead of fair-by-fair would delay every
// other fair's RSS/new-items pickup behind it, since node-cron can't fire
// the next tick until this whole callback returns.
//
// No re-fetch of the fair row between steps for a given fair: runUpdate
// only touches lastResult/startedAt/lastUpdated/latestFile, none of which
// runRssUpdate or runNewItemsUpdate need a fresh read of for correctness
// (their own cursor/known-items state is never touched by runUpdate, and
// each sets its own lastResult: RUNNING unconditionally rather than
// trusting the snapshot it was passed). All three already catch their own
// errors internally and never throw to this loop, so one fair's failure
// can't abort the cycle or skip later fairs.
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
		await runNewItemsUpdate(fair, now);
	}

	return true;
};
