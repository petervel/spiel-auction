import auth from "./auth";
import bids from "./bids";
import deleted from "./deleted";
import duplicates from "./duplicates";
import fairs from "./fairs";
import item from "./item";
import items from "./items";
import liked from "./liked";
import object from "./object";
import objects from "./objects";
import outbids from "./outbids";
import push from "./push";
import user from "./user";
import wishlist from "./wishlist";

export default [
	{ path: "/auth", object: auth },
	{ path: "/bids", object: bids },
	{ path: "/deleted", object: deleted },
	{ path: "/duplicates", object: duplicates },
	{ path: "/fairs", object: fairs },
	{ path: "/item", object: item },
	{ path: "/items", object: items },
	{ path: "/object", object: object },
	{ path: "/objects", object: objects },
	{ path: "/outbids", object: outbids },
	{ path: "/push", object: push },
	{ path: "/user", object: user },
	{ path: "/liked", object: liked },
	{ path: "/wishlist", object: wishlist },
];
