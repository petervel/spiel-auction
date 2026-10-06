import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ensureCurrentFair } from "../src/currentFair";
import prisma from "../src/prismaClient";

export const EMULATED_USER_COOKIE = "emulatedUserId";

export interface AuthenticatedRequest extends Request {
	userId?: number;
	user?: (User & { currentUserFair?: any; fairs?: any[] }) | null;
	realUser?: User | null;
}

export const authenticateUser = async (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
) => {
	const token = req.cookies["session"];
	if (!token) {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}

	try {
		const session = await tokenToUser(
			token,
			req.cookies[EMULATED_USER_COOKIE],
		);
		req.user = session?.user ?? null;
		req.realUser = session?.realUser ?? null;

		if (!req.user) {
			res.status(401).json({ error: "User not found" });
			return;
		}

		req.userId = req.user.id;

		next();
	} catch (error) {
		res.status(401).json({ error: "Invalid session" });
	}
};

export const requireAdmin = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
) => {
	// Checked against the real login, never the emulated user - otherwise
	// emulating someone would silently change who's allowed to emulate.
	if (req.realUser?.accessLevel !== "ADMIN") {
		res.status(403).json({ error: "Admins only" });
		return;
	}
	next();
};

const loadFullUser = (id: number) =>
	prisma.user.findUnique({
		where: { id },
		include: { currentUserFair: { include: { fair: true } }, fairs: false },
	});

// Resolves the real login from the session JWT, and - only for real admins -
// swaps in the emulated user from the emulation cookie. Non-admins never
// get the swap, whatever cookie they send.
export const tokenToUser = async (
	token: string,
	emulatedUserIdCookie?: string,
) => {
	try {
		const decoded = jwt.verify(token, process.env.JWT_SHARED_SECRET!) as {
			userId: number;
		};

		const realBase = await prisma.user.findUnique({
			where: { id: decoded.userId },
		});
		if (!realBase) return null;

		await ensureCurrentFair(realBase);
		const realUser = await loadFullUser(realBase.id);
		if (!realUser) return null;

		const emulatedId = Number(emulatedUserIdCookie);
		if (
			realBase.accessLevel === "ADMIN" &&
			Number.isInteger(emulatedId) &&
			emulatedId !== realBase.id
		) {
			const targetBase = await prisma.user.findUnique({
				where: { id: emulatedId },
			});
			if (targetBase) {
				await ensureCurrentFair(targetBase);
				const target = await loadFullUser(targetBase.id);
				if (target) return { user: target, realUser, emulating: true };
			}
		}

		return { user: realUser, realUser, emulating: false };
	} catch (error) {
		console.error("Error verifying token.");
		return null;
	}
};
