import type { Server } from "node:http";
import app from "./app.js";
import config from "./app/config/index.js";
import prisma from "./app/lib/prisma.js";
import redisClient, { connectRedis } from "./app/lib/redis.js";

let server: Server;

const main = async () => {
	try {
		await prisma.$connect();
		console.log("✅ Database connected successfully");

		await connectRedis();
		console.log("✅ Redis connected successfully");

		server = app.listen(config.port, () => {
			console.log(`🚀 Server is running on port ${config.port}`);
		});
	} catch (error) {
		console.error("❌ Failed to start server:", error);
		process.exit(1);
	}
};

main();

const shutdown = async (signal: string) => {
	console.log(`\n${signal} received. Shutting down gracefully...`);

	if (server) {
		server.close(async () => {
			await prisma.$disconnect();
			if (redisClient.isOpen) {
				await redisClient.quit();
			}
			console.log("🛑 Server and database connections closed");
			process.exit(0);
		});
	} else {
		await prisma.$disconnect();
		if (redisClient.isOpen) {
			await redisClient.quit();
		}
		process.exit(0);
	}
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
	console.error("Unhandled Rejection:", reason);
	shutdown("unhandledRejection");
});

process.on("uncaughtException", (error) => {
	console.error("Uncaught Exception:", error);
	process.exit(1);
});
