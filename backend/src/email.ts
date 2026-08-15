import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_TOKEN);

export const sendMagicLinkEmail = async (email: string, link: string) => {
	const { error } = await resend.emails.send({
		from: process.env.EMAIL_FROM!,
		to: email,
		subject: "Your login link for Spiel Auction",
		html: `<p>Click the link below to log in. It's valid for 15 minutes and can only be used once.</p><p><a href="${link}">Log in to Spiel Auction</a></p>`,
	});

	if (error) {
		throw new Error(`Failed to send magic link email: ${error.message}`);
	}
};
