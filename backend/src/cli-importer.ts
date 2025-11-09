import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import { updateData } from "./importer/updateData";
import { queryWithTimeout } from "./importer/util/helpers";

cron.schedule("* * * * *", async () => {
	const runUpdate = async () => {
		console.log("Starting update job... ", Date());
		const startTime = performance.now();
		const successful = await updateData();
		const endTime = performance.now();
		console.log(
			`Update job ${successful ? "completed" : "failed"}. Time taken: ${((endTime - startTime) / 1000).toFixed(2)}s`,
		);
	};

	try {
		await queryWithTimeout(runUpdate, 5 * 60000);
	} catch (error) {
		const message = error instanceof Error ? error.message : error;
		console.error("Update failed or timed out: ", message);
	}
});
