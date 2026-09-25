import axios from "axios";
import * as crypto from "crypto";
import { XMLParser } from "fast-xml-parser";
import { decode } from "html-entities";
import { toArray } from "./importer/util/helpers";

// A fixed, permanent, app-owned geeklist used only to prove a user controls
// the BGG account they've claimed - not one of the app's tracked auction
// fairs, so this isn't configured per-deployment like DEFAULT_GEEKLIST_ID.
// https://boardgamegeek.com/geeklist/385009/spiel-auction-tool-confirm-your-identity?itemid=13176910
const GEEKLIST_ID = 385009;
const GEEKLIST_ITEM_ID = 13176910;

// Same BGG "still generating, try again" quirk handled in bggCollection.ts.
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateVerificationHash = (): string =>
	`spielauction-${crypto.randomBytes(6).toString("hex")}`;

export const checkGeeklistForHash = async (
	bggUsername: string,
	hash: string,
): Promise<boolean> => {
	const url = `https://boardgamegeek.com/xmlapi/geeklist/${GEEKLIST_ID}?comments=1`;

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
				"BGG is still preparing that geeklist, try again in a moment",
			);
		}

		if (response.status !== 200) {
			throw new Error(
				`BGG geeklist request failed: HTTP ${response.status}`,
			);
		}

		const parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: "@_",
		});
		const parsed = parser.parse(response.data);

		const rawItems = parsed?.geeklist?.item;
		if (!rawItems) return false;

		const item = toArray(rawItems).find(
			(candidate: Record<string, any>) =>
				candidate["@_id"] === String(GEEKLIST_ITEM_ID),
		);
		if (!item?.comment) return false;

		const wantedUsername = bggUsername.toLowerCase();
		return toArray(item.comment).some((comment: Record<string, any>) => {
			const commentUsername = decode(
				`${comment["@_username"]}`,
			).toLowerCase();
			const commentText = decode(`${comment["#text"]}`);
			return (
				commentUsername === wantedUsername && commentText.includes(hash)
			);
		});
	}

	return false;
};
