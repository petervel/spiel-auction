import { describe, expect, it } from "vitest";
import { ItemWrapper } from "../processors/ItemWrapper";
import {
	NewItemPayload,
	toXmlApiSource,
} from "../processors/NewItemSourceMapper";

// Real shape captured live from https://api.geekdo.com/api/listitem/13054483
// during the session that designed this feature (geeklist 382717, "Caldera
// Park") - the body text is kept verbatim so the real BBCode price/condition
// parsing in ItemWrapper is genuinely exercised, not just fed pre-derived
// values.
const buildPayload = (
	overrides: Partial<NewItemPayload> = {},
): NewItemPayload => ({
	itemId: 13054483,
	objectType: "thing",
	objectSubtype: "boardgame",
	objectId: 367047,
	objectName: "Caldera Park",
	username: "Divcha",
	postDate: "2026-08-14T22:02:10+00:00",
	editDate: "2026-08-14T22:02:10+00:00",
	imageId: 6973654,
	body: "[size=14][b]Condition[/b]: [/size][size=14][url=https://boardgamegeek.com/wiki/page/Condition_of_a_game][u]Like New[/u][/url][/size] [size=8]:star::star::star::star::nostar:[/size][size=10] (punched and boxes put togethe to hold content, but still unplayed)[/size]\n\n[size=13][b]Title: Caldera Park[/b][/size] \n[b]Type[/b]: Base/Core game \n[b]Version[/b]: [url=https://boardgamegeek.com/boardgameversion/625079][u]German edition (2022)[/u][/url]\n[b]Language[/b]: German\n\n[size=13][b]Starting bid[/b]: [COLOR=#0033CC][b]€8,-[/b][/COLOR][/size]\n[b]BIN[/b]: [COLOR=#0033CC][b]€13,-[/b][/COLOR]\n\n[size=12][b]Auction ends[/b]: [COLOR=#6699FF][b]Sun 11 Oct, random time[/b][/COLOR][/size]",
	...overrides,
});

describe("toXmlApiSource + ItemWrapper.fromXml", () => {
	it("builds a real item from a newitem payload, reusing ItemWrapper's own body parsing unmodified", () => {
		const source = toXmlApiSource(buildPayload());
		const item = ItemWrapper.fromXml(382717, source, 1700000000, 2026);

		expect(item.id).toBe(13054483);
		expect(item.objectName).toBe("Caldera Park");
		expect(item.username).toBe("Divcha");
		// No bids yet - currentBid falls back to the parsed starting bid,
		// proving the real BBCode price-parsing ran on this payload's body.
		expect(item.currentBid).toBe(8);
		expect(item.highestBidder).toBeNull();
		expect(item.isEnded).toBe(false);
	});

	it("carries no comment field, so a freshly-created item starts with none (comments arrive later via RSS)", () => {
		const source = toXmlApiSource(buildPayload());
		expect(source.comment).toBeUndefined();

		const item = ItemWrapper.fromXml(382717, source, 1700000000, 2026);
		expect(item.getOutbidBidders(0)).toEqual([]);
	});

	it("defaults thumbs to 0 - not available without an extra fetch, self-heals on the next xmlapi cycle", () => {
		const source = toXmlApiSource(buildPayload());
		expect(source["@_thumbs"]).toBe("0");
	});
});
