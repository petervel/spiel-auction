import auth from "./auth";
import bids from "./bids";
import deleted from "./deleted";
import duplicates from "./duplicates";
import fairs from "./fairs";
import items from "./items";
import object from "./object";
import objects from "./objects";
import outbids from "./outbids";
import starred from "./starred";
import user from "./user";

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
	{ path: "/user", object: user },
	{ path: "/starred", object: starred },
];
