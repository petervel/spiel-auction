import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkGeeklistForHash } from "../bggVerification";

vi.mock("axios");

const buildGeeklistXml = (comments: string) => `<geeklist id="385009">
<title>Spiel Auction Tool - confirm your identity</title>
<item id="13176910" objecttype="thing" subtype="boardgame" objectid="1" objectname="Test" username="owner" postdate="Wed, 19 Oct 2022 11:32:50 +0000" editdate="Wed, 19 Oct 2022 11:42:50 +0000" thumbs="0" imageid="1">
<body>Post your verification code here as a comment.</body>
${comments}
</item>
</geeklist>`;

describe("checkGeeklistForHash", () => {
	beforeEach(() => {
		vi.mocked(axios.get).mockReset();
	});

	it("finds a hash posted by the matching username", async () => {
		const xml = buildGeeklistXml(
			'<comment username="JokeVelSlot" date="Sun, 28 Apr 2024 18:51:57 +0000" postdate="Sun, 28 Apr 2024 18:51:57 +0000" editdate="Sun, 28 Apr 2024 18:51:57 +0000" thumbs="0">spielauction-abc123</comment>',
		);
		vi.mocked(axios.get).mockResolvedValue({ status: 200, data: xml });

		const found = await checkGeeklistForHash(
			"JokeVelSlot",
			"spielauction-abc123",
		);
		expect(found).toBe(true);
	});

	it("matches the username case-insensitively", async () => {
		const xml = buildGeeklistXml(
			'<comment username="JokeVelSlot" date="Sun, 28 Apr 2024 18:51:57 +0000" postdate="Sun, 28 Apr 2024 18:51:57 +0000" editdate="Sun, 28 Apr 2024 18:51:57 +0000" thumbs="0">spielauction-abc123</comment>',
		);
		vi.mocked(axios.get).mockResolvedValue({ status: 200, data: xml });

		const found = await checkGeeklistForHash(
			"jokevelslot",
			"spielauction-abc123",
		);
		expect(found).toBe(true);
	});

	it("doesn't match a comment from a different username with the same hash", async () => {
		const xml = buildGeeklistXml(
			'<comment username="someoneElse" date="Sun, 28 Apr 2024 18:51:57 +0000" postdate="Sun, 28 Apr 2024 18:51:57 +0000" editdate="Sun, 28 Apr 2024 18:51:57 +0000" thumbs="0">spielauction-abc123</comment>',
		);
		vi.mocked(axios.get).mockResolvedValue({ status: 200, data: xml });

		const found = await checkGeeklistForHash(
			"JokeVelSlot",
			"spielauction-abc123",
		);
		expect(found).toBe(false);
	});

	it("doesn't match the right username with a different/missing hash", async () => {
		const xml = buildGeeklistXml(
			'<comment username="JokeVelSlot" date="Sun, 28 Apr 2024 18:51:57 +0000" postdate="Sun, 28 Apr 2024 18:51:57 +0000" editdate="Sun, 28 Apr 2024 18:51:57 +0000" thumbs="0">just saying hi</comment>',
		);
		vi.mocked(axios.get).mockResolvedValue({ status: 200, data: xml });

		const found = await checkGeeklistForHash(
			"JokeVelSlot",
			"spielauction-abc123",
		);
		expect(found).toBe(false);
	});

	it("handles multiple comments (array shape), finding a match among them", async () => {
		const xml = buildGeeklistXml(
			[
				'<comment username="alice" date="Sun, 28 Apr 2024 18:51:57 +0000" postdate="Sun, 28 Apr 2024 18:51:57 +0000" editdate="Sun, 28 Apr 2024 18:51:57 +0000" thumbs="0">not it</comment>',
				'<comment username="JokeVelSlot" date="Sun, 28 Apr 2024 18:52:57 +0000" postdate="Sun, 28 Apr 2024 18:52:57 +0000" editdate="Sun, 28 Apr 2024 18:52:57 +0000" thumbs="0">spielauction-abc123</comment>',
			].join("\n"),
		);
		vi.mocked(axios.get).mockResolvedValue({ status: 200, data: xml });

		const found = await checkGeeklistForHash(
			"JokeVelSlot",
			"spielauction-abc123",
		);
		expect(found).toBe(true);
	});

	it("returns false when the item has no comments at all", async () => {
		const xml = buildGeeklistXml("");
		vi.mocked(axios.get).mockResolvedValue({ status: 200, data: xml });

		const found = await checkGeeklistForHash(
			"JokeVelSlot",
			"spielauction-abc123",
		);
		expect(found).toBe(false);
	});

	it("retries once on a 202 (still generating) before succeeding", async () => {
		const xml = buildGeeklistXml(
			'<comment username="JokeVelSlot" date="Sun, 28 Apr 2024 18:51:57 +0000" postdate="Sun, 28 Apr 2024 18:51:57 +0000" editdate="Sun, 28 Apr 2024 18:51:57 +0000" thumbs="0">spielauction-abc123</comment>',
		);
		vi.mocked(axios.get)
			.mockResolvedValueOnce({ status: 202, data: "" })
			.mockResolvedValueOnce({ status: 200, data: xml });

		const found = await checkGeeklistForHash(
			"JokeVelSlot",
			"spielauction-abc123",
		);
		expect(found).toBe(true);
		expect(axios.get).toHaveBeenCalledTimes(2);
	});

	it("throws on a non-200/202 response", async () => {
		vi.mocked(axios.get).mockResolvedValue({ status: 500, data: "" });

		await expect(
			checkGeeklistForHash("JokeVelSlot", "spielauction-abc123"),
		).rejects.toThrow();
	});
});
