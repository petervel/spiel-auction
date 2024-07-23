// load .env file
import dotenv from "dotenv";
dotenv.config();

// initialize express server
import express from "express";
const app = express();

// host the API
import routes from "./api";
for (const route of routes) {
	app.use("/api" + route.path, route.object);
}

// Health check endpoint
app.get("/health", (req, res) => {
	res.status(200).json({ status: "ok" });
});

// host the update endpoint (TODO: temp, make this cronjob)
import { updateData } from "./importer/updateData";
app.use("/update", async (_, res) => {
	const successful = await updateData();
	return res.json({ status: successful ? 201 : 202 });
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
