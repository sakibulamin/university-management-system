import app from "./app";
import config from "./app/config";
import { transporter } from "./app/lib/nodemailer";
import prisma from "./app/lib/prisma";
import { redisClient } from "./app/lib/redis";

import {
	seedTesterAdmin,
	seedTesterInstructor,
	seedTesterStudent,
} from "./app/utils/seed";

const PORT = config.port;

const main = async () => {
	try {
		await prisma.$connect();

		await redisClient.connect();
		console.log("redis conncet successfully!");

		await transporter.verify();
		console.log("nodemailer connect successfully");

		await seedTesterAdmin();
		await seedTesterStudent();
		await seedTesterInstructor();

		console.log("Connected to the database successfully.");
		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	} catch (error) {
		console.error("Error starting the server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
};

main();
