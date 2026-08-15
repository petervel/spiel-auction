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
		include: { currentUserFair: true, fairs: true },
	});

	res.json({ message: "Login successful", user: fullUser });
};
