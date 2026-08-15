import { User } from "@prisma/client";
import prisma from "./prismaClient";
import { useListId } from "./api/useListId";

// Links the user to the currently active fair (creating the UserFair if
// needed) and points currentUserFairId at it, unless it's already there.
export const ensureCurrentFair = async (user: User): Promise<User> => {
	const activeFair = await prisma.fair.findFirst({
		where: { geeklistId: useListId() },
	});
	if (!activeFair) return user;

	const currentLink = user.currentUserFairId
		? await prisma.userFair.findUnique({
				where: { id: user.currentUserFairId },
			})
		: null;

	if (currentLink?.fairId === activeFair.id) return user;

	const userFair =
		(await prisma.userFair.findUnique({
			where: { userId_fairId: { userId: user.id, fairId: activeFair.id } },
		})) ??
		(await prisma.userFair.create({
			data: { userId: user.id, fairId: activeFair.id },
		}));

	return prisma.user.update({
		where: { id: user.id },
		data: { currentUserFairId: userFair.id },
	});
};
