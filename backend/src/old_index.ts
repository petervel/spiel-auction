// load .env file
import dotenv from "dotenv";
dotenv.config();

import cookieParser from "cookie-parser";
import cron from "node-cron";

// initialize express server
import express from "express";
const app = express();
app.use(cookieParser());
app.use(express.json());

// host the API
import apiRoutes from "./api";
for (const apiRoute of apiRoutes) {
	app.use("/api" + apiRoute.path, apiRoute.object);
}

// Health check endpoint
app.get("/health", (req, res) => {
	res.status(200).json({ status: "ok" });
});

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

// start the server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});

process.on("SIGTERM", () => {
	server.close(() => {
		console.log("Process terminated");
	});
});
