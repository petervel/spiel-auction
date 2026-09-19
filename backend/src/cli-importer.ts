import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import { runImportCycle } from "./importer/runImportCycle";
import { queryWithTimeout } from "./importer/util/helpers";

cron.schedule("* * * * *", async () => {
	console.log("Starting import cycle... ", Date());
	const startTime = performance.now();
	try {
		const successful = await queryWithTimeout(runImportCycle, 5 * 60000);
		const endTime = performance.now();
		console.log(
			`Import cycle ${successful ? "completed" : "failed"}. Time taken: ${((endTime - startTime) / 1000).toFixed(2)}s`,
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : error;
		console.error("Import cycle failed or timed out: ", message);
	}
});
