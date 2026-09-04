import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/index.js";
import config from "../config/index.js";

const adapter = new PrismaPg({
	connectionString: config.database_url,
});

const prisma = new PrismaClient({
	adapter,
	log: config.env === "development" ? ["query", "error", "warn"] : ["error"],
});

export default prisma;
