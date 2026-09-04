import { createClient } from "redis";
import config from "../config/index.js";

const redisClient = createClient({
	url: config.redis_url,
});

redisClient.on("error", (error) => {
	console.error("❌ Redis Client Error:", error);
});

export const connectRedis = async () => {
	if (!redisClient.isOpen) {
		await redisClient.connect();
	}
};

export default redisClient;
