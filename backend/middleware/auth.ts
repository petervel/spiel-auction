import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../src/prismaClient";

export interface AuthenticatedRequest extends Request {
	userId?: number;
	user?: (User & { currentUserFair?: any; fairs?: any[] }) | null;
}

export const authenticateUser = async (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
) => {
	const token = req.cookies.session;
	if (!token) {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}

	try {
		req.user = await tokenToUser(token);

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

export const tokenToUser = async (token: string) => {
	const decoded = jwt.verify(token, process.env.JWT_SHARED_SECRET!) as {
		userId: number;
	};

	// 🔹 also fetch full user with fairs if you want it globally available
	return await prisma.user.findUnique({
		where: { id: decoded.userId },
		include: { currentUserFair: true, fairs: false },
	});
};
