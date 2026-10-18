import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import { runImportCycle } from "./importer/runImportCycle";
import { sendMeetupReminders } from "./importer/notifications/meetupReminderNotifier";
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

// Every minute, same cadence as the import cycle above - each meetup is
// reminded 30 minutes before its own time (not just a single fixed daily
// slot), so this has to check often enough to catch every meetup's own
// window. Dedup (so a side is never reminded twice) and the fair's own
// timezone are both handled inside sendMeetupReminders itself.
cron.schedule("* * * * *", async () => {
	try {
		await sendMeetupReminders();
	} catch (error) {
		const message = error instanceof Error ? error.message : error;
		console.error("Meetup reminder send failed: ", message);
	}
});
