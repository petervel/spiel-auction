import { User } from "@prisma/client";
import prisma from "./prismaClient";
import { useListId } from "./api/useListId";

// Links the user to a default fair (creating the UserFair if needed) and
// points currentUserFairId at it - but only when the user has no active
// fair yet. Once set, a user's choice is theirs to keep; it must never be
// silently reverted back to the env-configured default on a later request.
export const ensureCurrentFair = async (user: User): Promise<User> => {
	if (user.currentUserFairId) return user;

	const activeFair = await prisma.fair.findFirst({
		where: { geeklistId: useListId() },
	});
	if (!activeFair) return user;

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
