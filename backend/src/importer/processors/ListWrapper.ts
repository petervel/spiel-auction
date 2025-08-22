import { List, PrismaPromise } from "@prisma/client";
import { decode } from "html-entities";
import prisma from "../../prismaClient";
import { queryWithTimeout } from "../util/helpers";
import { ok } from "../util/result";
import { ItemWrapper } from "./ItemWrapper";
import { ListCommentWrapper } from "./ListCommentWrapper";

const BATCH_SIZE = 1000;

export class ListWrapper {
	private dbObject: List;
	private comments: ListCommentWrapper[];
	private items: ItemWrapper[];

	constructor(
		listObject: List,
		comments: ListCommentWrapper[],
		items: ItemWrapper[],
	) {
		this.dbObject = listObject;
		this.comments = comments;
		this.items = items;
	}

	public static async fromXml(
		fairId: number,
		source: Record<string, any>,
		updateTime: number,
	) {
		const listId = Number(source["@_id"]);

		const commentsData = ListCommentWrapper.loadAll(
			listId,
			source["comment"],
			updateTime,
		);

		let editTimestamp = Number(source["editdate_timestamp"]);
		editTimestamp = Math.max(
			editTimestamp,
			ListCommentWrapper.getLatestEdit(commentsData),
		);

		let postDateTimestamp = Number(source["postdate_timestamp"]);
		let postDate = new Date(0);
		if (postDateTimestamp < 0) {
			postDateTimestamp = 0; // Ensure non-negative timestamp
		} else {
			postDate = new Date(source["postdate"]);
		}

		const listData = {
			id: listId,
			fair: { connect: { id: fairId } },
			title: decode(source["title"]),
			username: decode(source["username"]),
			postDate: postDate,
			postTimestamp: postDateTimestamp,
			editDate: new Date(source["editdate"]),
			editTimestamp,
			thumbs: Number(source["thumbs"]),
			itemCount: Number(source["numitems"]),
			description: decode(source["description"]),
			tosUrl: source["@_termsofuse"],
			lastSeen: updateTime,
			deleted: false,
		};

		const items = ItemWrapper.loadAll(listId, source["item"], updateTime);

		return new ListWrapper(listData, commentsData, items);
	}

	public async save() {
		let upserts: PrismaPromise<any>[] = [];

		upserts.push(
			prisma.list.upsert({
				where: { id: this.dbObject.id },
				create: this.dbObject,
				update: this.dbObject,
			}),
		);

		upserts = upserts.concat(ListCommentWrapper.saveAll(this.comments));

		upserts = upserts.concat(ItemWrapper.saveAll(this.items));

		let offset = 0;
		while (offset < upserts.length) {
			const batch = upserts.slice(offset, offset + BATCH_SIZE);
			await queryWithTimeout(() => prisma.$transaction(batch), 30000); // 30s timeout
			offset += BATCH_SIZE;
		}

		return ok(upserts.length);
	}
}
