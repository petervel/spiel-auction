import { toArray } from "../util/helpers";

// One RSS activity entry, after enough parsing to route it: a "New
// comment..." entry carries `source` (an xmlapi-<comment>-shaped object fed
// unmodified into ItemCommentWrapper.fromXml, so all its bid-parsing stays
// untouched), while a "GeekList Item... added" entry carries `source: null`
// - it's still returned (never dropped) so its pubDate still counts toward
// cursor advancement, it just never becomes an import.
export type RssActivityEntry = {
	itemId: number | null;
	pubDateSeconds: number;
	source: Record<string, any> | null;
};

// fast-xml-parser already resolves the outer entity-escaping when it parses
// the page (verified against a live sample - a description's <p> tags come
// through as real tags, not &lt;p&gt;), so what's left here is real HTML to
// strip, not double-escaped text to decode first. Only ItemCommentWrapper's
// own decode() call (on the "#text" this hands it) needs to run, exactly
// once, on whatever's left after stripping - same as it already does for a
// real xmlapi <comment>'s raw text.
const AUTHOR_LINE = /^\s*<p>\s*by\s*<a[^>]*>[\s\S]*?<\/a>\s*<\/p>\s*/i;
const RELATED_ITEM_LINE =
	/^\s*<p>\s*Related Item:\s*<a[^>]*>[\s\S]*?<\/a>\s*<\/p>\s*/i;

const extractItemId = (item: Record<string, any>): number | null => {
	const link = String(item.guid ?? item.link ?? "");
	const match = link.match(/itemid=(\d+)/);
	return match ? Number(match[1]) : null;
};

const extractCommentText = (description: string): string =>
	String(description)
		.replace(AUTHOR_LINE, "")
		.replace(RELATED_ITEM_LINE, "")
		.trim();

const parseEntry = (item: Record<string, any>): RssActivityEntry | null => {
	const pubDateMs = Date.parse(item.pubDate);
	if (Number.isNaN(pubDateMs)) return null;
	const pubDateSeconds = Math.floor(pubDateMs / 1000);

	const title = String(item.title ?? "");
	if (!title.includes("New comment")) {
		// "GeekList Item: ... added" (or edited - BGG reuses the same title
		// for both, see the plan) and anything else unrecognized: no usable
		// content, but its pubDate still counts toward the cursor.
		return { itemId: null, pubDateSeconds, source: null };
	}

	const itemId = extractItemId(item);
	if (itemId === null) return { itemId: null, pubDateSeconds, source: null };

	const username = item["dc:creator"];
	if (!username) return { itemId, pubDateSeconds, source: null };

	const source = {
		"#text": extractCommentText(item.description ?? ""),
		"@_username": String(username),
		"@_date": item.pubDate,
		"@_postdate": item.pubDate,
		"@_editdate": item.pubDate,
		"@_thumbs": "0",
	};

	return { itemId, pubDateSeconds, source };
};

// `channel` is the already-fast-xml-parser'd `rss.channel` object (same
// XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" }) config
// updateData.ts already uses for the xmlapi document).
export const parseRssPage = (
	channel: Record<string, any>,
): RssActivityEntry[] =>
	toArray(channel?.item ?? [])
		.map(parseEntry)
		.filter((entry): entry is RssActivityEntry => entry !== null);
