import { JobResult } from "@prisma/client";

// Shared between updateData.ts (xmlapi) and updateRssData.ts (RSS fast path) -
// both run against the same Fair.lastResult/startedAt fields so that only one
// of them is ever RUNNING for a given fair at a time. That's what keeps the
// two pipelines from independently computing/firing the same bid/outbid/won
// notification: whichever runs second always reads the other's already-
// committed state as "previous", so its diff against that is zero for
// anything already notified.
export const LOCK_TIMEOUT_SECONDS = 10 * 60;

export const isLocked = (
	lastResult: JobResult,
	startedAt: number,
	now: number,
) =>
	lastResult === JobResult.RUNNING && startedAt >= now - LOCK_TIMEOUT_SECONDS;

export const notLockedFilter = (now: number) => ({
	OR: [
		{ lastResult: { not: JobResult.RUNNING } },
		{ startedAt: { lt: now - LOCK_TIMEOUT_SECONDS } },
	],
});
