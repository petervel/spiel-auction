import { ListComment } from "@prisma/client";
import { decode } from "html-entities";
import { toArray } from "../../importer/util/helpers";
import prisma from "../../prismaClient";

export class ListCommentWrapper {
	private dbObject: ListComment;

	constructor(dbObject: ListComment) {
		this.dbObject = dbObject;
	}

	public static fromXml(listId: number, source: Record<string, any>) {
		const dbObject = {
			listId,
			username: decode(source["@_username"]),
			date: source["@_date"],
			postDate: new Date(source["@_postdate"]),
			postTimestamp: Math.floor(Date.parse(source["@_postdate"]) / 1000),
			editDate: new Date(source["@_editdate"]),
			editTimestamp: Math.floor(Date.parse(source["@_editdate"]) / 1000),
			thumbs: Number(source["@_thumbs"]),
			text: decode(`${source["#text"]}`), // force this to be a string, for parsing purposes.
		};

		return new ListCommentWrapper(dbObject);
	}

	public static loadAll(listId: number, source: Record<string, any>) {
		if (!source) return [];

		return toArray(source).map((commentData) =>
			ListCommentWrapper.fromXml(listId, commentData),
		);
	}

	public static async saveAll(comments: ListCommentWrapper[]) {
		const upserts = comments.map((comment) =>
			prisma.listComment.upsert({
				where: {
					listId_username_postTimestamp: {
						listId: comment.dbObject.listId,
						username: comment.dbObject.username,
						postTimestamp: comment.dbObject.postTimestamp,
					},
				},
				create: comment.dbObject,
				update: comment.dbObject,
			}),
		);

		return upserts;
	}

	public static getLatestEdit(wrappers: ListCommentWrapper[]) {
		return Math.max(
			...wrappers
				.map((wrapper) => wrapper.dbObject)
				.map((comment) => comment.editTimestamp),
		);
	}
}
