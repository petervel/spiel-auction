export function extractString(
	source: string,
	regex: RegExp,
	first: boolean = false,
): string | undefined {
	const matches = source.match(regex);
	if (matches != null && matches.length > 0) {
		if (first) {
			return matches[1] as string;
		}
		// Last *matched* group, not the last array slot - with alternated
		// groups (a|b), the branch that didn't fire is undefined but still
		// occupies a slot, so a plain .pop() can silently return that
		// instead of the real match.
		for (let i = matches.length - 1; i >= 1; i--) {
			if (matches[i] !== undefined) return matches[i];
		}
		return undefined;
	}
	return undefined; // not found
}

export function extractNumber(
	source: string,
	regex: RegExp,
): number | undefined {
	const value = extractString(source, regex);
	return value != undefined ? Number(value) : undefined;
}

export function isNumber(text: string): boolean {
	return !isNaN(Number(text));
}

function removeBetweenTags(text: string, tag: string): string {
	const originalText = text;
	const startTag = `[${tag}]`;
	let startIndex = text.indexOf(startTag);
	if (startIndex == -1) {
		return text;
	}

	const endTag = `[/${tag}]`;
	const beforeText = text.slice(0, startIndex);
	const lastIndex = text.lastIndexOf(endTag);
	const afterText = text.slice(lastIndex + endTag.length);

	text = text.slice(startIndex, lastIndex + endTag.length);

	let middleText: string | undefined = undefined;
	text = text.slice(startTag.length);
	let counter = 0;
	while (middleText == undefined) {
		counter++;
		if (counter > 50) {
			console.log(
				'Forcing break from remove tag loop: "' + originalText + '"',
			);
			middleText = "";
			break;
		}
		startIndex = text.indexOf(startTag);
		const endIndex = text.indexOf(endTag);

		if (startIndex != -1 && startIndex < endIndex) {
			text =
				text.slice(0, startIndex) +
				text.slice(endIndex + endTag.length);
		} else {
			// no further nested tags, just strip until end tag and carry on.
			text = text.slice(endIndex + endTag.length);
			middleText = removeBetweenTags(text, tag);
		}
	}

	return beforeText + middleText + afterText;
}

export function removeStrikethrough(text: string): string {
	return removeBetweenTags(text, "-");
}
export function removeQuoted(text: string): string {
	// Not removeBetweenTags: BGG's real quote syntax always attributes the
	// quote ([q="username"]), which that literal-"[q]" matcher never finds.
	// Strip innermost blocks repeatedly so nested quotes-of-quotes unwrap.
	const quoteBlock =
		/\[q(?:=[^\]]*)?\]((?:(?!\[q(?:=[^\]]*)?\]|\[\/q\])[\s\S])*)\[\/q\]/gi;
	let result = text;
	for (let i = 0; i < 50; i++) {
		const next = result.replace(quoteBlock, "");
		if (next === result) break;
		result = next;
	}
	return result;
}
export function removeAllBggTags(text: string): string {
	return text.replace(/\[[^\]]*]/gi, "");
}

export function removeKnownContexts(text: string): string {
	text = text.replace(/\b(\d+)\s*sec(onds|s)?/gi, ""); // 12 seconds
	text = text.replace(/\b(\d+)\s*days?/gi, ""); // 12 days
	text = text.replace(/\b(\d+)\s*games?/gi, ""); // 12 games
	text = text.replace(/\b(\d+)\s*%/gi, ""); // 12%
	text = text.replace(/\b(\d+)\.?\s*(aug|sept|oct|okt)/gi, ""); // 12 sept, 12. Okt
	text = text.replace(/\b(\d+)-(\d+)/gi, ""); // 12-9
	text = text.replace(/\b(\d+)(th|st|nd)/gi, ""); // 12th
	return text;
}
export function parseEndDateString(
	end: string | undefined | null,
	referenceYear: number,
) {
	if (!end) return undefined;

	end = end.replace(
		/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b,?\s+/gi,
		"",
	);

	end = end.replace(/(,?\s*random time\.?)?/gi, "");

	// "26 Sep or 27 Sep" - take the earlier (first-listed) date.
	end = end.split(/\bor\b/i)[0];

	// Drop a trailing time/timezone ("20:00 CEST") - Date.parse doesn't
	// reliably recognize timezone abbreviations, and the result only ever
	// keeps the date part anyway (see formatTimeToDate).
	end = end.replace(/,?\s*\d{1,2}:\d{2}\s*[A-Za-z]*\s*$/, "");

	end = end.trim();

	if (!/\b\d{4}\b/.test(end)) {
		end += ` ${referenceYear}`;
	}

	const normalized = end.replace(/\bokt/gi, "oct");

	const ms = Date.parse(normalized);
	if (isNaN(ms)) return undefined;

	return formatTimeToDate(ms);
}

export function formatTimeToDate(time?: number) {
	if (time == undefined) {
		time = new Date().getTime();
	}
	const d = new Date(time);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}${month}${day}`;
}

export function getFirstLetterFromName(name: string): string {
	const first = name.charAt(0);
	if (isNumber(first)) {
		return "0";
	}
	if (!/^[A-Za-z]{1,1}$/.test(first)) {
		return "#";
	}
	return first;
}

export function stripObjectName(text: string): string {
	const lower = text.toLowerCase();
	const stripped = lower.replace(/^(([^\da-z])|(the )|(an? ))*/i, "");
	const result = stripped.replace(/[^\da-z]$/i, "");
	return result.length > 0 ? result : lower;
}

export function stripUndefined(obj: Record<string, any>): Record<string, any> {
	return JSON.parse(JSON.stringify(obj));
}

export const allSettledWithRetries = async (
	promises: Promise<void>[],
	retries = 3,
	waitBetweenRetries = 500,
) => {
	const results = await Promise.allSettled(promises);
	const successResponses = results.filter(
		(result) => result.status == "fulfilled",
	);

	if (retries == 0 || successResponses.length == promises.length) {
		return successResponses;
	}

	const failedPromises: Promise<void>[] = [];
	results.forEach((promiseResult, index) => {
		if (promiseResult.status == "rejected") {
			failedPromises.push(promises[index]);
		}
	});

	console.warn(
		`Failed to fulfill ${failedPromises.length} promises. Will try again.`,
	);

	await new Promise((resolve) => setTimeout(resolve, waitBetweenRetries));

	const failedResults = await allSettledWithRetries(
		failedPromises,
		retries - 1,
	);

	failedResults.forEach((promiseResult) => {
		if (promiseResult.status == "fulfilled") {
			successResponses.push(promiseResult);
		}
	});

	return successResponses;
};

export const toArray = <T>(item: T): T[] =>
	Array.isArray(item) ? item : [item];

// Shared between ListWrapper.save() and updateRssData.ts - both batch
// upserts into $transaction calls, and Prisma's array-form $transaction has
// a fixed 5s timeout under the mariadb driver adapter that can't be
// overridden. A busy real-world auction (~19k item/comment rows) pushed a
// 200-row batch to 26.79s under memory pressure and blew that cap - a
// smaller shared limit keeps every batch well under it regardless of how
// comment-heavy a given chunk of items happens to be.
export const IMPORT_BATCH_SIZE = 50;

export const queryWithTimeout = async (
	queryFn: () => Promise<any>,
	timeoutMs: number,
) => {
	const timeoutPromise = new Promise((_, reject) =>
		setTimeout(() => reject(new Error("Query timed out")), timeoutMs),
	);

	return Promise.race([queryFn(), timeoutPromise]);
};

export const undefinedToNull = (
	obj: Record<string, any>,
): Record<string, any> => {
	const result: Record<string, any> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined || value === null) {
			result[key] = null;
		} else if (typeof value == "object") {
			result[key] = undefinedToNull(value);
		} else {
			result[key] = value;
		}
	}
	return result;
};

export const nullToUndefined = (
	obj: Record<string, any>,
): Record<string, any> => {
	const result: Record<string, any> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value === null) {
			delete result[key];
		} else if (typeof value == "object") {
			result[key] = nullToUndefined(value);
		} else {
			result[key] = value;
		}
	}
	return result;
};
