import { List, PrismaPromise } from "@prisma/client";
import { decode } from "html-entities";
import prisma from "../../prismaClient";
import { IMPORT_BATCH_SIZE, queryWithTimeout } from "../util/helpers";
import { ok } from "../util/result";
import { ItemWrapper } from "./ItemWrapper";
import { ListCommentWrapper } from "./ListCommentWrapper";

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

	public getItems(): ItemWrapper[] {
		return this.items;
	}

	public static async fromXml(
		fairId: number,
		source: Record<string, any>,
		updateTime: number,
		referenceYear: number,
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

		const items = ItemWrapper.loadAll(
			listId,
			source["item"],
			updateTime,
			referenceYear,
		);

		return new ListWrapper(listData, commentsData, items);
	}

	public async save() {
		// List + its own comments are small and bounded - one batch, upfront.
		const listUpserts: PrismaPromise<any>[] = [
			prisma.list.upsert({
				where: { id: this.dbObject.id },
				create: this.dbObject,
				update: this.dbObject,
			}),
			...ListCommentWrapper.saveAll(this.comments),
		];
		await queryWithTimeout(() => prisma.$transaction(listUpserts), 30000);
		let totalUpserts = listUpserts.length;

		// Items (and their own comments) are the potentially-huge part for a
		// busy auction - build each chunk's upserts just-in-time and transact
		// it immediately, rather than materializing every item's (and every
		// item's comments') upsert - each holding a full data payload - into
		// one array before batching. That's what let peak memory scale with
		// the whole list's size instead of one chunk's.
		for (
			let offset = 0;
			offset < this.items.length;
			offset += IMPORT_BATCH_SIZE
		) {
			const chunk = this.items.slice(offset, offset + IMPORT_BATCH_SIZE);
			const chunkUpserts = ItemWrapper.saveAll(chunk);
			await queryWithTimeout(
				() => prisma.$transaction(chunkUpserts),
				30000,
			);
			console.log(`Batch ${offset}-${offset + IMPORT_BATCH_SIZE} done.`);
			totalUpserts += chunkUpserts.length;
		}

		return ok(totalUpserts);
	}
}
