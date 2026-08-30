import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const prismaClientSingleton = () => {
	const adapter = new PrismaMariaDb({
		host: process.env.DATABASE_HOST,
		port: Number(process.env.DATABASE_PORT),
		user: process.env.DATABASE_USER,
		password: process.env.DATABASE_PASSWORD,
		database: process.env.DATABASE_NAME,
		// Idle connections in this pool can go dead (server-side close, network
		// blip) without either side noticing. Without these, a stale connection
		// gets handed to a query and fails with "socket unexpectedly closed"
		// instead of being detected and replaced.
		keepAliveDelay: 30_000,
		minDelayValidation: 0,
	});
	return new PrismaClient({ adapter });
};

declare const globalThis: {
	prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
