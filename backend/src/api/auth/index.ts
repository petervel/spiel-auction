import express from "express";
import prisma from "../../prismaClient";
// import { checkAdmin } from "../../util";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { authenticateUser } from "../../../middleware/auth";

const router = express.Router();

const client = new OAuth2Client({
	clientId: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	redirectUri: "postmessage",
});

router.post("/google", async (req, res) => {
	const { code } = req.body;
	if (!code) return res.status(400).json({ error: "Auth code required" });

	try {
		// Exchange code for tokens
		const { tokens } = await client.getToken(code);

		console.log("Tokens from Google:", tokens);

		if (!tokens.id_token) {
			return res.status(401).json({ error: "No ID token received" });
		}
		const ticket = await client.verifyIdToken({
			idToken: tokens.id_token,
			audience: process.env.GOOGLE_CLIENT_ID,
		});

		const payload = ticket.getPayload();
		if (!payload) return res.status(401).json({ error: "Invalid token" });

		const { sub, email, name } = payload;

		let user = await prisma.user.findUnique({ where: { googleId: sub } });
		if (!user) {
			user = await prisma.user.create({
				data: { googleId: sub, email, name },
			});
		}

		// Create session JWT
		const sessionToken = jwt.sign(
			{ userId: user.id },
			process.env.JWT_SHARED_SECRET!,
			{ expiresIn: "365d" },
		);

		res.cookie("session", sessionToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
		});

		res.json({ message: "Login successful", user });
	} catch (err) {
		console.error("Google Auth Error:", err);
		res.status(401).json({ error: "Authentication failed" });
	}
});

router.post("/logout", authenticateUser, (_, res) => {
	res.clearCookie("session", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
	}); // Clear the session cookie

	res.status(200).json({ message: "Logged out successfully" });
});

router.post("/refresh-token", async (req, res) => {
	const refreshToken = req.cookies.refreshToken;

	if (!refreshToken) {
		res.status(401).json({ error: "No refresh token provided" });
		return;
	}

	try {
		// Verify refresh token
		const decoded = jwt.verify(
			refreshToken,
			process.env.JWT_REFRESH_SECRET!,
		);
		const userId = (decoded as { userId: number }).userId;
		const user = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			res.status(404).json({ error: "User not found" });
			return;
		}

		// Issue new access token
		const accessToken = jwt.sign(
			{ userId: user.id },
			process.env.JWT_SHARED_SECRET!,
			{ expiresIn: "1h" }, // New access token valid for 1 hour
		);

		res.json({ accessToken });
	} catch (error) {
		res.status(403).json({ error: "Invalid or expired refresh token" });
	}
});

export default router;
