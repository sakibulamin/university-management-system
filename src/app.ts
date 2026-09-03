import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";
import config from "./app/config/index.js";

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

app.get("/", (_req: Request, res: Response) => {
	res.status(200).json({
		success: true,
		message: "University Management System API is running",
		data: null,
	});
});

// NOTE: /api/v1 routes, notFound middleware, and globalErrorHandler
// are wired up starting Phase 2 / Phase 3 as those pieces are built.

export default app;
