import { NextFunction, Request, Response } from "express";

export const checkAdmin = (req: Request, res: Response, next: NextFunction) => {
	if (req.cookies?.isAdmin == "true") {
		next();
	} else {
		return res.status(403).json({ error: "Forbidden: Admin only" });
	}
};
