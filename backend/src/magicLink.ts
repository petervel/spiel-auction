import * as crypto from "crypto";
import prisma from "./prismaClient";

const TOKEN_TTL_MS = 15 * 60 * 1000;

const hashToken = (rawToken: string) =>
	crypto.createHash("sha256").update(rawToken).digest("hex");

// Generates a one-time token for `email`, stores its hash, and returns the
// raw token to embed in the emailed link (the raw value is never persisted).
export const createMagicLinkToken = async (email: string) => {
	const rawToken = crypto.randomBytes(32).toString("hex");

	await prisma.magicLinkToken.create({
		data: {
			email,
			tokenHash: hashToken(rawToken),
			expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
		},
	});

	return rawToken;
};

// Atomically consumes a token: returns the associated email if it was valid,
// unexpired, and unused, or null otherwise. Safe against double-submission.
export const consumeMagicLinkToken = async (
	rawToken: string,
): Promise<string | null> => {
	const record = await prisma.magicLinkToken.findUnique({
		where: { tokenHash: hashToken(rawToken) },
	});

	if (!record || record.usedAt || record.expiresAt < new Date()) {
		return null;
	}

	const { count } = await prisma.magicLinkToken.updateMany({
		where: { id: record.id, usedAt: null },
		data: { usedAt: new Date() },
	});

	return count > 0 ? record.email : null;
};
