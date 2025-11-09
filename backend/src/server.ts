import cookieParser from "cookie-parser";
import express from "express";
import apiRoutes from "./api";

const app = express();
app.use(cookieParser());
app.use(express.json());

for (const apiRoute of apiRoutes) {
	app.use("/api" + apiRoute.path, apiRoute.object);
}

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

export default app;
