import express from "express";
import {
	AuthenticatedRequest,
	authenticateUser,
} from "../../../middleware/auth";
import prisma from "../../prismaClient";
import { sendPushToUser } from "../../push/webPushClient";

const router = express.Router();

router.get("/vapidPublicKey", (req, res) => {
	res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post(
	"/subscribe",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { endpoint, keys } = req.body;

			if (
				typeof endpoint !== "string" ||
				typeof keys?.p256dh !== "string" ||
				typeof keys?.auth !== "string"
			) {
				res.status(400).json({
					error: "endpoint and keys.p256dh/keys.auth must be strings",
				});
				return;
			}

			if (!req.user?.id) {
				res.status(401).json({ error: "Not authenticated" });
				return;
			}

			await prisma.pushSubscription.upsert({
				where: { endpoint },
				create: {
					userId: req.user.id,
					endpoint,
					p256dh: keys.p256dh,
					auth: keys.auth,
				},
				update: {
					userId: req.user.id,
					p256dh: keys.p256dh,
					auth: keys.auth,
				},
			});

			res.status(200).json({ success: true });
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

router.post(
	"/unsubscribe",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { endpoint } = req.body;

			if (typeof endpoint !== "string") {
				res.status(400).json({ error: "endpoint must be a string" });
				return;
			}

			if (!req.user?.id) {
				res.status(401).json({ error: "Not authenticated" });
				return;
			}

			await prisma.pushSubscription.deleteMany({
				where: { endpoint, userId: req.user.id },
			});

			res.status(200).json({ success: true });
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

router.post(
	"/test",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			if (!req.user?.id) {
				res.status(401).json({ error: "Not authenticated" });
				return;
			}

			await sendPushToUser(req.user.id, {
				title: "Test notification",
				body: "If you can see this, push notifications are working.",
			});

			res.status(200).json({ success: true });
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Failed to send test notification" });
		}
	},
);

export default router;
