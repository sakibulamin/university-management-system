import dotenv from "dotenv";

dotenv.config();

const config = {
	env: process.env.NODE_ENV || "development",
	port: process.env.PORT || "5000",

	database_url: process.env.DATABASE_URL,

	jwt_access_secret: process.env.JWT_ACCESS_SECRET,
	jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
	jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
	jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || "30d",

	bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS || "12",

	google_client_id: process.env.GOOGLE_CLIENT_ID,

	redis_url: process.env.REDIS_URL,

	sender_email: process.env.SENDER_EMAIL,
	sender_password: process.env.SENDER_PASSWORD,

	cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
	cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET,

	bkash_base_url: process.env.BKASH_BASE_URL,
	bkash_username: process.env.BKASH_USERNAME,
	bkash_password: process.env.BKASH_PASSWORD,
	bkash_app_key: process.env.BKASH_APP_KEY,
	bkash_app_secret: process.env.BKASH_APP_SECRET,

	backend_url: process.env.BACKEND_URL || "http://localhost:5000",
	frontend_url: process.env.FRONTEND_URL || "http://localhost:3000",
};

export default config;
