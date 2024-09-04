import bids from "./bids";
import fairs from "./fairs";
import items from "./items";
import object from "./object";

export default [
	{ path: "/fairs", object: fairs },
	{ path: "/bids", object: bids },
	{ path: "/items", object: items },
	{ path: "/object", object: object },
];
