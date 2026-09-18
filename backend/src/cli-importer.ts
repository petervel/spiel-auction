import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import { updateData } from "./importer/updateData";
import { updateRssData } from "./importer/updateRssData";
import { queryWithTimeout } from "./importer/util/helpers";

const runJob = async (
	label: string,
	job: () => Promise<boolean>,
	timeoutMs: number,
) => {
	console.log(`Starting ${label} update job... `, Date());
	const startTime = performance.now();
	try {
		const successful = await queryWithTimeout(job, timeoutMs);
		const endTime = performance.now();
		console.log(
			`${label} update job ${successful ? "completed" : "failed"}. Time taken: ${((endTime - startTime) / 1000).toFixed(2)}s`,
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : error;
		console.error(`${label} update failed or timed out: `, message);
	}
};

// Both run from the same tick, sequentially - updateRssData() only starts
// once updateData() has fully returned. That's what keeps the two
// pipelines from ever computing/firing the same bid/outbid/won
// notification concurrently for the same fair (see the schema comment on
// Fair.rssLastSeenTimestamp, and updateRssData.ts's use of the same
// lastResult/startedAt lock updateData.ts uses).
cron.schedule("* * * * *", async () => {
	await runJob("full", updateData, 5 * 60000);
	await runJob("rss", updateRssData, 60000);
});
