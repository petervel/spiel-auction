import fairs from "./fairs";
import auctions from "./items";
import object from "./object";

export default [
	{ path: "/fairs", object: fairs },
	{ path: "/items", object: auctions },
	{ path: "/object", object: object },
];
