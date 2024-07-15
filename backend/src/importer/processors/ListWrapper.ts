import { List } from "@prisma/client";
import { decode } from "html-entities";
import prisma from "../../prismaClient";
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

	public static async fromXml(fairId: number, source: Record<string, any>) {
		const listId = Number(source["@_id"]);

		const commentsData = ListCommentWrapper.loadAll(
			listId,
			source["comment"],
		);

		let editTimestamp = Number(source["editdate_timestamp"]);
		editTimestamp = Math.max(
			editTimestamp,
			ListCommentWrapper.getLatestEdit(commentsData),
		);

		const listData = {
			id: listId,
			fair: { connect: { id: fairId } },
			title: decode(source["title"]),
			username: decode(source["username"]),
			postDate: new Date(source["postdate"]),
			postTimestamp: Number(source["postdate_timestamp"]),
			editDate: new Date(source["editdate"]),
			editTimestamp,
			thumbs: Number(source["thumbs"]),
			itemCount: Number(source["numitems"]),
			description: decode(source["description"]),
			tosUrl: source["@_termsofuse"],
		};

		const items = ItemWrapper.loadAll(listId, source["item"]);

		return new ListWrapper(listData, commentsData, items);
	}

	public async save() {
		let upserts: any[] = [];

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
			await prisma.$transaction(batch);
			offset += BATCH_SIZE;
		}

		return ok(upserts.length);
	}
}
