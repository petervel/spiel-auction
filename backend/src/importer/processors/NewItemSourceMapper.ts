// Shape of the newitem-{itemId}-{geeklistId}-{timestamp}.json files
// xml-fetcher writes (see its fetchAndSaveNewItem) - one BGG geekdo
// listitem, already flattened and with the seller's username resolved.
export type NewItemPayload = {
	itemId: number;
	objectType: string;
	objectSubtype: string;
	objectId: number;
	objectName: string;
	username: string;
	postDate: string;
	editDate: string;
	imageId: number;
	body: string;
};

// Maps a parsed newitem-*.json payload into a synthetic xmlapi-<item>-
// shaped source object, so it can be fed unmodified into the real
// ItemWrapper.fromXml - the same reuse pattern RssCommentWrapper already
// uses for comments. Deliberately no "comment" key: ItemCommentWrapper
// .loadAll (called inside fromXml) already returns [] for an absent
// source, and a freshly-created item's comments arrive later via the
// existing RSS comment path once it exists in the DB.
export const toXmlApiSource = (
	payload: NewItemPayload,
): Record<string, any> => ({
	"@_id": String(payload.itemId),
	"@_objecttype": payload.objectType,
	"@_subtype": payload.objectSubtype,
	"@_objectid": String(payload.objectId),
	"@_objectname": payload.objectName,
	"@_username": payload.username,
	"@_postdate": payload.postDate,
	"@_editdate": payload.editDate,
	// Not available without an extra fetch - self-heals on the next xmlapi
	// cycle, same as RSS-derived fields elsewhere.
	"@_thumbs": "0",
	"@_imageid": String(payload.imageId),
	body: payload.body,
});
