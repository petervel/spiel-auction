import webpush from "web-push";
import prisma from "../prismaClient";

webpush.setVapidDetails(
	process.env.VAPID_SUBJECT!,
	process.env.VAPID_PUBLIC_KEY!,
	process.env.VAPID_PRIVATE_KEY!,
);

export type PushPayload = {
	title: string;
	body: string;
};

export const sendPushToUser = async (userId: number, payload: PushPayload) => {
	const subscriptions = await prisma.pushSubscription.findMany({
		where: { userId },
	});

	await Promise.all(
		subscriptions.map(async (subscription) => {
			try {
				await webpush.sendNotification(
					{
						endpoint: subscription.endpoint,
						keys: {
							p256dh: subscription.p256dh,
							auth: subscription.auth,
						},
					},
					JSON.stringify(payload),
				);
			} catch (error: any) {
				if (error.statusCode === 404 || error.statusCode === 410) {
					// Subscription is gone (browser unsubscribed/uninstalled) - clean it up.
					await prisma.pushSubscription.delete({
						where: { id: subscription.id },
					});
				} else {
					console.error(
						`Push send failed for user ${userId}:`,
						error,
					);
				}
			}
		}),
	);
};
