import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

interface AuthenticatedRequest extends Request {
	userId?: number;
}

export const authenticateUser = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
) => {
	const token = req.cookies.session; // The token is sent as an HTTP-only cookie
	if (!token) {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SHARED_SECRET!); // Verify the JWT
		req.userId = (decoded as { userId: number }).userId; // Attach user ID to request object
		next(); // Allow the next middleware or route handler to run
	} catch (error) {
		res.status(401).json({ error: "Invalid session" });
	}
};
