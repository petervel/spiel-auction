import { describe, expect, it } from "vitest";
import { parseEndDateString } from "../util/helpers";

// Real "Auction ends" text captured from live items during this session.
describe("parseEndDateString", () => {
	it("parses a plain date with no time", () => {
		expect(parseEndDateString("Sat 26 Sep, random time", 2026)).toBe(
			"20260926",
		);
	});

	it("drops a trailing time + timezone abbreviation Date.parse can't handle", () => {
		expect(parseEndDateString("Sat 10 Oct, 20:00 CEST", 2026)).toBe(
			"20261010",
		);
	});

	it("picks the earlier of two 'or'-alternated dates", () => {
		expect(
			parseEndDateString("Sat 26 Sep or Sun 27 Sep, random time", 2026),
		).toBe("20260926");
	});

	it("returns undefined for empty input", () => {
		expect(parseEndDateString("", 2026)).toBeUndefined();
		expect(parseEndDateString(null, 2026)).toBeUndefined();
	});
});
