import prisma from "../prismaClient";

// Distinguishes "no such fair" from "fair exists but hasn't had a
// successful import yet" (Fair.listId stays NULL until then) for any
// route that looks up data by List.id.
export const listNotFoundError = async (listId: number) => {
	const fair = await prisma.fair.findFirst({
		where: { geeklistId: listId },
	});

	return fair
		? { error: "not_ready" }
		: { error: `No list found with id ${listId}` };
};
