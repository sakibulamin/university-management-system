import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";
import config from "./app/config/index.js";
import globalErrorHandler from "./app/middleware/globalErrorHandler.js";
import notFound from "./app/middleware/notFound.js";
import { rateLimiter } from "./app/middleware/rateLimiter.js";
import router from "./app/routes/index.js";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter.globalRateLimiter);

app.get("/", (_req: Request, res: Response) => {
	res.status(200).json({
		success: true,
		message: "University Management System API is running",
		data: null,
	});
});

app.use("/api/v1", router);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
