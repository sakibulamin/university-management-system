import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
	env: process.env.NODE_ENV || "development",
	port: process.env.PORT,

	database_url: process.env.DATABASE_URL!,

	jwt_access_secret: process.env.JWT_ACCESS_SECRET!,
	jwt_refresh_secret: process.env.JWT_REFRESH_SECRET!,
	jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
	jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || "30d",

	bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS || "12",

	google_client_id: process.env.GOOGLE_CLIENT_ID!,

	redis_user: process.env.REDIS_USER!,
	redis_password: process.env.REDIS_PASSWORD!,
	redis_host: process.env.REDIS_HOST!,
	redis_port: process.env.REDIS_PORT!,

	tester_admin_email: process.env.ADMIN_EMAIL!,
	tester_admin_password: process.env.ADMIN_PASSWORD!,

	tester_instructor_email: process.env.INSTRUCTOR_EMAIL!,
	tester_instructor_password: process.env.INSTRUCTOR_PASSWORD!,

	tester_student_email: process.env.STUDENT_EMAIL!,
	tester_student_password: process.env.STUDENT_PASSWORD!,

	sender_email: process.env.SENDER_MAIL!,
	sender_password: process.env.SENDER_PASSWORD!,

	cloudinary_cloude_name:process.env.CLOUDINARY_CLOUD_NAME,
	cloudinary_api_key:process.env.CLOUDINARY_API_KEY!,
	cloudinary_api_secret:process.env.CLOUDINARY_API_SECERT,

	bkash_base_url: process.env.BKASH_BASE_URL!,
	bkash_username: process.env.BKASH_USERNAME!,

	bkash_password: process.env.BKASH_PASSWORD!,
	bkash_app_key: process.env.BKASH_APP_KEY!,
	bkash_app_secret: process.env.BKASH_APP_SECRET!,

	backend_url: process.env.BACKEND_URL || "http://localhost:5000",
	frontend_url: process.env.FRONTEND_URL || "http://localhost:3000",
};
