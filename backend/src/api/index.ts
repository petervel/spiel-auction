import bids from "./bids";
import deleted from "./deleted";
import duplicates from "./duplicates";
import fairs from "./fairs";
import items from "./items";
import object from "./object";
import objects from "./objects";
import outbids from "./outbids";

export default [
	{ path: "/fairs", object: fairs },
	{ path: "/bids", object: bids },
	{ path: "/items", object: items },
	{ path: "/object", object: object },
	{ path: "/objects", object: objects },
	{ path: "/duplicates", object: duplicates },
	{ path: "/deleted", object: deleted },
	{ path: "/outbids", object: outbids },
];
