import { Request } from "express";

declare global {
	namespace Express {
		interface Request {
			userId?: number; // Add userId to the Request interface
		}
	}
}
