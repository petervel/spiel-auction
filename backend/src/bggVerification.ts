import axios from "axios";
import * as crypto from "crypto";
import { XMLParser } from "fast-xml-parser";
import { decode } from "html-entities";
import { toArray } from "./importer/util/helpers";

// A fixed, permanent, app-owned BGG forum thread used only to prove a user
// controls the BGG account they've claimed - not one of the app's tracked
// auction fairs, so this isn't configured per-deployment like
// DEFAULT_GEEKLIST_ID. https://boardgamegeek.com/thread/3773437
const THREAD_ID = 3773437;

// Same BGG "still generating, try again" quirk handled in bggCollection.ts.
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateVerificationHash = (): string =>
	`spielauction-${crypto.randomBytes(6).toString("hex")}`;

export const checkThreadForHash = async (
	bggUsername: string,
	hash: string,
): Promise<boolean> => {
	const url = `https://boardgamegeek.com/xmlapi2/thread?id=${THREAD_ID}`;

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
				"BGG is still preparing that thread, try again in a moment",
			);
		}

		if (response.status !== 200) {
			throw new Error(
				`BGG thread request failed: HTTP ${response.status}`,
			);
		}

		const parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: "@_",
		});
		const parsed = parser.parse(response.data);

		const rawArticles = parsed?.thread?.articles?.article;
		if (!rawArticles) return false;

		const wantedUsername = bggUsername.toLowerCase();
		return toArray(rawArticles).some((article: Record<string, any>) => {
			const articleUsername = decode(
				`${article["@_username"]}`,
			).toLowerCase();
			const articleText = decode(`${article.body}`);
			return (
				articleUsername === wantedUsername && articleText.includes(hash)
			);
		});
	}

	return false;
};
