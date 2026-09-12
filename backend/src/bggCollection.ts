import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { decode } from "html-entities";

// objectId/objectType/objectSubtype/objectName mirror the fields BggObject
// stores - the subset of collection-item data that's also available from a
// geeklist item, so both import paths can upsert the same shape.
// wishlistPriority is collection-only (BGG's 1-5 "Must have".."Don't buy
// this" scale) and per-user, so it's not part of BggObject - it only exists
// to let the import page group/pre-select items, and isn't sent along when
// an item is actually imported.
export type WishlistItem = {
	objectId: number;
	objectType: string;
	objectSubtype: string;
	objectName: string;
	wishlistPriority: number | null;
};

// BGG queues the export and answers 202 (with a "please try again" body)
// while it generates the collection - retry a few times with a short delay
// rather than surfacing that as an error on the first click.
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractName = (name: unknown): string => {
	if (typeof name === "string") return name;
	if (Array.isArray(name)) return extractName(name[0]);
	if (name && typeof name === "object") {
		return String((name as Record<string, unknown>)["#text"] ?? "");
	}
	return "";
};

export const fetchWishlist = async (
	username: string,
): Promise<WishlistItem[]> => {
	const url = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&wishlist=1`;

	for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
		const response = await axios.get(url, {
			responseType: "text",
			validateStatus: () => true,
			headers: { Authorization: `Bearer ${process.env.BGG_API_TOKEN}` },
		});

		if (response.status === 202) {
			if (attempt < RETRY_COUNT) {
				await sleep(RETRY_DELAY_MS);
				continue;
			}
			throw new Error(
				"BGG collection is still being generated, try again in a moment",
			);
		}

		if (response.status !== 200) {
			throw new Error(
				`BGG collection request failed: HTTP ${response.status}`,
			);
		}

		const parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: "@_",
		});
		const parsed = parser.parse(response.data);

		const rawItems = parsed?.items?.item;
		if (!rawItems) return [];

		const items = Array.isArray(rawItems) ? rawItems : [rawItems];

		return items.map((item: Record<string, any>) => {
			const rawPriority = item.status?.["@_wishlistpriority"];
			const wishlistPriority = rawPriority ? Number(rawPriority) : null;

			return {
				objectId: Number(item["@_objectid"]),
				objectType: String(item["@_objecttype"] ?? ""),
				objectSubtype: String(item["@_subtype"] ?? ""),
				objectName: decode(extractName(item.name)),
				wishlistPriority:
					wishlistPriority && !Number.isNaN(wishlistPriority)
						? wishlistPriority
						: null,
			};
		});
	}

	return [];
};
