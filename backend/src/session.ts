import { User } from "@prisma/client";
import { Response } from "express";
import jwt from "jsonwebtoken";
import { ensureCurrentFair } from "./currentFair";
import prisma from "./prismaClient";

// Shared tail end of every login method: link the user to the currently
// active fair, issue a session cookie, and return the full user payload.
export const completeLogin = async (res: Response, user: User) => {
	user = await ensureCurrentFair(user);

	const sessionToken = jwt.sign(
		{ userId: user.id },
		process.env.JWT_SHARED_SECRET!,
		{ expiresIn: "365d" },
	);

	res.cookie("session", sessionToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		maxAge: 365 * 24 * 60 * 60 * 1000, // 365 days
	});

	const fullUser = await prisma.user.findUnique({
		where: { id: user.id },
		include: { currentUserFair: { include: { fair: true } }, fairs: true },
	});

	res.json({ message: "Login successful", user: fullUser });
};

const LAST_SEEN_THROTTLE_MS = 15 * 60 * 1000;

// Called from /me, which the frontend only hits while the tab is
// actually visible (see UserProvider's visibilitychange handling) -
// so this doubles as a "genuinely looked at recently" signal, not
// just "session cookie still valid". Throttled to avoid a write on
// every poll.
export const touchLastSeen = async (user: User) => {
	if (
		user.lastSeenAt &&
		Date.now() - user.lastSeenAt.getTime() < LAST_SEEN_THROTTLE_MS
	) {
		return;
	}

	await prisma.user.update({
		where: { id: user.id },
		data: { lastSeenAt: new Date() },
	});
};
