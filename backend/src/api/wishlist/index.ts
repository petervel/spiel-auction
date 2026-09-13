import express from "express";
import {
	AuthenticatedRequest,
	authenticateUser,
} from "../../../middleware/auth";
import prisma from "../../prismaClient";
import { redisClient } from "../redisClient";

const router = express.Router();

type ObjectMeta = {
	objectType: string;
	objectSubtype: string;
	objectName: string;
};

type ImportItem = ObjectMeta & { objectId: number };

const isValidMeta = (body: any): body is ObjectMeta =>
	typeof body?.objectType === "string" &&
	typeof body?.objectSubtype === "string" &&
	typeof body?.objectName === "string";

const isValidImportItem = (item: any): item is ImportItem =>
	typeof item?.objectId === "number" && isValidMeta(item);

const cacheKeyFor = (userId: number, listId: number | undefined) =>
	`api:wishlist:${userId}:${listId}`;

const currentListId = (req: AuthenticatedRequest): number | undefined =>
	req.user?.currentUserFair?.fair?.geeklistId;

// 🔹 Get the logged-in user's wishlist, each object annotated with its
// current-fair auction items (if any), so the wishlist page can split
// "has an active auction" from "nothing listed yet" without an extra
// round trip per object.
router.get("/", authenticateUser, async (req: AuthenticatedRequest, res) => {
	const userId = req.userId!;
	const listId = currentListId(req);
	const cacheKey = cacheKeyFor(userId, listId);

	const cache = await redisClient.get(cacheKey);
	if (cache) {
		res.status(200).json(JSON.parse(cache));
		return;
	}

	const wishlistItems = await prisma.userWishlistItem.findMany({
		where: { userId },
		include: { object: true },
		orderBy: { object: { objectName: "asc" } },
	});

	const objectIds = wishlistItems.map((w) => w.objectId);

	const items = listId
		? await prisma.item.findMany({
				where: { listId, objectId: { in: objectIds }, deleted: false },
				orderBy: { postDate: "desc" },
			})
		: [];

	const itemsByObjectId = new Map<number, typeof items>();
	for (const item of items) {
		const existing = itemsByObjectId.get(item.objectId);
		if (existing) existing.push(item);
		else itemsByObjectId.set(item.objectId, [item]);
	}

	const objects = wishlistItems.map((w) => ({
		...w.object,
		items: itemsByObjectId.get(w.objectId) ?? [],
	}));

	const result = { objects };

	await redisClient.set(cacheKey, JSON.stringify(result));
	await redisClient.expire(cacheKey, 30);

	res.status(200).json(result);
});

// 🔹 Bulk-add wishlist items imported from a user's BGG collection
router.post(
	"/import",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		const userId = req.userId!;
		const items = req.body?.items;

		if (!Array.isArray(items) || !items.every(isValidImportItem)) {
			res.status(400).json({ error: "items must be a list of BGG objects" });
			return;
		}

		try {
			for (const item of items) {
				await prisma.bggObject.upsert({
					where: { objectId: item.objectId },
					create: item,
					update: item,
				});

				await prisma.userWishlistItem.upsert({
					where: {
						userId_objectId: { userId, objectId: item.objectId },
					},
					update: {},
					create: { userId, objectId: item.objectId },
				});
			}

			await redisClient.del(cacheKeyFor(userId, currentListId(req)));

			res.status(200).json({ success: true, added: items.length });
		} catch (err) {
			console.error("Error importing wishlist:", err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

// 🔹 Add a single object to the wishlist (e.g. from the object page)
router.post(
	"/:objectId",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		const userId = req.userId!;
		const objectId = +req.params.objectId;
		if (Number.isNaN(objectId)) {
			res.status(400).json({ error: "Invalid objectId" });
			return;
		}

		try {
			const existing = await prisma.bggObject.findUnique({
				where: { objectId },
			});

			if (!existing) {
				if (!isValidMeta(req.body)) {
					res.status(400).json({
						error: "objectType, objectSubtype, and objectName are required for a new object",
					});
					return;
				}
				await prisma.bggObject.create({
					data: { objectId, ...req.body },
				});
			}

			await prisma.userWishlistItem.upsert({
				where: { userId_objectId: { userId, objectId } },
				update: {},
				create: { userId, objectId },
			});

			await redisClient.del(cacheKeyFor(userId, currentListId(req)));

			res.status(200).json({ success: true, wishlisted: true });
		} catch (err) {
			console.error("Error adding to wishlist:", err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

// 🔹 Remove an object from the wishlist
router.delete(
	"/:objectId",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		const userId = req.userId!;
		const objectId = +req.params.objectId;
		if (Number.isNaN(objectId)) {
			res.status(400).json({ error: "Invalid objectId" });
			return;
		}

		try {
			await prisma.userWishlistItem.deleteMany({
				where: { userId, objectId },
			});

			await redisClient.del(cacheKeyFor(userId, currentListId(req)));

			res.status(200).json({ success: true, wishlisted: false });
		} catch (err) {
			console.error("Error removing from wishlist:", err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

export default router;
