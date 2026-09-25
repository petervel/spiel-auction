import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkThreadForHash } from "../bggVerification";

vi.mock("axios");

const buildThreadXml = (
	articles: string,
) => `<thread id="3773437" numarticles="1">
<subject>Spiel Auction Tool - Identification Thread</subject>
<articles>
${articles}
</articles>
</thread>`;

const buildArticle = (username: string, body: string, id = "1") =>
	`<article id="${id}" username="${username}" link="https://boardgamegeek.com/thread/3773437/article/${id}#${id}" postdate="2026-09-25T17:19:51-05:00" editdate="2026-09-25T17:19:51-05:00" numedits="0">
<subject>Re: Spiel Auction Tool - Identification Thread</subject>
<body>${body}</body>
</article>`;

describe("checkThreadForHash", () => {
	beforeEach(() => {
		vi.mocked(axios.get).mockReset();
	});

	it("finds a hash posted by the matching username", async () => {
		const xml = buildThreadXml(
			buildArticle("JokeVelSlot", "spielauction-abc123"),
		);
		vi.mocked(axios.get).mockResolvedValue({ status: 200, data: xml });

		const found = await checkThreadForHash(
			"JokeVelSlot",
			"spielauction-abc123",
		);
		expect(found).toBe(true);
	});

	it("matches the username case-insensitively", async () => {
		const xml = buildThreadXml(
			buildArticle("JokeVelSlot", "spielauction-abc123"),
		);
		vi.mocked(axios.get).mockResolvedValue({ status: 200, data: xml });

		const found = await checkThreadForHash(
			"jokevelslot",
			"spielauction-abc123",
		);
		expect(found).toBe(true);
	});

	it("doesn't match an article from a different username with the same hash", async () => {
		const xml = buildThreadXml(
			buildArticle("someoneElse", "spielauction-abc123"),
		);
		vi.mocked(axios.get).mockResolvedValue({ status: 200, data: xml });

		const found = await checkThreadForHash(
			"JokeVelSlot",
			"spielauction-abc123",
		);
		expect(found).toBe(false);
	});

	it("doesn't match the right username with a different/missing hash", async () => {
		const xml = buildThreadXml(
			buildArticle("JokeVelSlot", "just saying hi"),
		);
		vi.mocked(axios.get).mockResolvedValue({ status: 200, data: xml });

		const found = await checkThreadForHash(
			"JokeVelSlot",
			"spielauction-abc123",
		);
		expect(found).toBe(false);
	});

	it("handles multiple articles (array shape), finding a match among them", async () => {
		const xml = buildThreadXml(
			[
				buildArticle(
					"petervel",
					"This thread is for verification",
					"1",
				),
				buildArticle("alice", "not it", "2"),
				buildArticle("JokeVelSlot", "spielauction-abc123", "3"),
			].join("\n"),
		);
		vi.mocked(axios.get).mockResolvedValue({ status: 200, data: xml });

		const found = await checkThreadForHash(
			"JokeVelSlot",
			"spielauction-abc123",
		);
		expect(found).toBe(true);
	});

	it("returns false when the thread has no articles at all", async () => {
		const xml = `<thread id="3773437" numarticles="0"><subject>Empty</subject><articles></articles></thread>`;
		vi.mocked(axios.get).mockResolvedValue({ status: 200, data: xml });

		const found = await checkThreadForHash(
			"JokeVelSlot",
			"spielauction-abc123",
		);
		expect(found).toBe(false);
	});

	it("retries once on a 202 (still generating) before succeeding", async () => {
		const xml = buildThreadXml(
			buildArticle("JokeVelSlot", "spielauction-abc123"),
		);
		vi.mocked(axios.get)
			.mockResolvedValueOnce({ status: 202, data: "" })
			.mockResolvedValueOnce({ status: 200, data: xml });

		const found = await checkThreadForHash(
			"JokeVelSlot",
			"spielauction-abc123",
		);
		expect(found).toBe(true);
		expect(axios.get).toHaveBeenCalledTimes(2);
	});

	it("throws on a non-200/202 response", async () => {
		vi.mocked(axios.get).mockResolvedValue({ status: 500, data: "" });

		await expect(
			checkThreadForHash("JokeVelSlot", "spielauction-abc123"),
		).rejects.toThrow();
	});
});
