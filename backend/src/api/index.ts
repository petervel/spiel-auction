import auth from "./auth";
import bids from "./bids";
import bookmark from "./bookmark";
import deleted from "./deleted";
import duplicates from "./duplicates";
import fairs from "./fairs";
import items from "./items";
import object from "./object";
import objects from "./objects";
import outbids from "./outbids";
import starred from "./starred";

export default [
	{ path: "/auth", object: auth },
	{ path: "/bids", object: bids },
	{ path: "/deleted", object: deleted },
	{ path: "/duplicates", object: duplicates },
	{ path: "/fairs", object: fairs },
	{ path: "/items", object: items },
	{ path: "/object", object: object },
	{ path: "/objects", object: objects },
	{ path: "/outbids", object: outbids },
	{ path: "/user/bookmark", object: bookmark },
	{ path: "/user/starred", object: starred },
];
