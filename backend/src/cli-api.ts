import dotenv from "dotenv";
dotenv.config();

import app from "./server";

const port = Number.parseInt(process.env.PORT || "3000");
const server = app.listen(port, "0.0.0.0", () => {
	console.log(`API listening on 0.0.0.0:${port}`);
});

process.on("SIGTERM", () => {
	server.close(() => {
		console.log("Process terminated");
	});
});
