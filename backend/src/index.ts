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

app.post("/login", (req, res) => {
	const { password } = req.body;
	if (password == process.env.ADMIN_PASSWORD) {
		res.cookie("isAdmin", "true", {
			httpOnly: true,
			secure: process.env.ENVIRONMENT_MODE != "development",
			maxAge: 3600000,
		});
		res.status(200).json({ message: "Logged in as admin" });
	} else {
		res.status(401).json({
			message:
				"Unauthorized: Invalid credentials " +
				password +
				" : " +
				process.env.ADMIN_PASSWORD,
		});
	}
});

app.post("/logout", (_, res) => {
	console.log("Clearing admin cookie");
	res.clearCookie("isAdmin");
	res.status(200).json({ message: "Logged out" });
});

// Health check endpoint
app.get("/health", (req, res) => {
	res.status(200).json({ status: "ok" });
});

import { updateData } from "./importer/updateData";
cron.schedule("* * * * *", async () => {
	console.log("Starting update job... ", Date());
	const startTime = performance.now();
	const successful = await updateData();
	const endTime = performance.now();
	console.log(
		`Update job ${successful ? "completed" : "failed"}. Time taken: ${((endTime - startTime) / 1000).toFixed(2)}s`,
	);
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
