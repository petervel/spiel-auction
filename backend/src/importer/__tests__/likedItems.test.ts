import { describe, expect, it } from "vitest";
import { computeNewLikes } from "../likedItems";

describe("computeNewLikes", () => {
	it("likes an item for a registered user's first bid on it", () => {
		const likes = computeNewLikes(
			[{ itemId: 1, username: "alice" }],
			new Set(),
			new Map([["alice", [42]]]),
			7,
		);

		expect(likes).toEqual([{ userId: 42, itemId: 1, fairId: 7 }]);
	});

	it("does not re-like a pair that already existed before this cycle", () => {
		const likes = computeNewLikes(
			[{ itemId: 1, username: "alice" }],
			new Set(["1:alice"]),
			new Map([["alice", [42]]]),
			7,
		);

		expect(likes).toEqual([]);
	});

	it("ignores bidders who aren't registered users", () => {
		const likes = computeNewLikes(
			[{ itemId: 1, username: "stranger" }],
			new Set(),
			new Map([["alice", [42]]]),
			7,
		);

		expect(likes).toEqual([]);
	});

	it("matches usernames case-insensitively", () => {
		const likes = computeNewLikes(
			[{ itemId: 1, username: "Alice" }],
			new Set(),
			new Map([["alice", [42]]]),
			7,
		);

		expect(likes).toEqual([{ userId: 42, itemId: 1, fairId: 7 }]);
	});

	it("handles multiple new bidders on multiple items", () => {
		const likes = computeNewLikes(
			[
				{ itemId: 1, username: "alice" },
				{ itemId: 2, username: "bob" },
				{ itemId: 2, username: "alice" },
			],
			new Set(["2:alice"]),
			new Map([
				["alice", [42]],
				["bob", [43]],
			]),
			7,
		);

		expect(likes).toEqual([
			{ userId: 42, itemId: 1, fairId: 7 },
			{ userId: 43, itemId: 2, fairId: 7 },
		]);
	});

	it("likes the item for every registered user sharing the same bggUsername", () => {
		const likes = computeNewLikes(
			[{ itemId: 1, username: "alice" }],
			new Set(),
			new Map([["alice", [42, 99]]]),
			7,
		);

		expect(likes).toEqual([
			{ userId: 42, itemId: 1, fairId: 7 },
			{ userId: 99, itemId: 1, fairId: 7 },
		]);
	});
});
