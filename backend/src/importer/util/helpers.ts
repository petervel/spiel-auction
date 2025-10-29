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
		return matches.pop() as string;
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
	return removeBetweenTags(text, "q");
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
export function parseEndDateString(end: string | undefined | null) {
	if (!end) return undefined;

	end = end.replace(
		/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b,?\s+/gi,
		"",
	);

	end = end.replace(/(,?\s*random time\.?)?/gi, "");
	end = end.trim();

	const currentYear = new Date().getFullYear();
	if (!/\b\d{4}\b/.test(end)) {
		end += ` ${currentYear}`;
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
