// Page-level flags that control how an item row renders - constant for a
// whole list/page, unlike per-item data (e.g. isOutbid) which varies item
// to item and stays as its own prop rather than living in here.
export type ItemDisplayOptions = {
	allowBookmarks?: boolean;
	allowLikes?: boolean;
	silentToggle?: boolean;
	// The single-item page has nothing else to show, so it starts this open
	// rather than making the user click to reveal the auction body - still
	// toggle-able afterwards like any other row.
	startExpanded?: boolean;
	// Off for the wishlist page's nested items - the compare/BGG links are
	// object-level (same for every listing of that game) and already shown
	// once on the object header above, so repeating them per item here
	// would just be redundant.
	allowObjectActions?: boolean;
};
