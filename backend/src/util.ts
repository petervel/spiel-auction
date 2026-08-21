import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";

export const requireAdmin = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
) => {
	if (req.user?.accessLevel === "ADMIN") {
		next();
	} else {
		res.status(403).json({ error: "Forbidden: Admin only" });
	}
};
