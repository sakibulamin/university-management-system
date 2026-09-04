import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import config from "../config/index.js";
import { Prisma } from "../../generated/prisma/index.js";
import AppError from "../utils/AppError.js";

type TErrorSource = {
	path: string | number;
	message: string;
};

const globalErrorHandler = (
	error: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
) => {
	let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
	let message = "Something went wrong";
	let errorSources: TErrorSource[] = [{ path: "", message: "Something went wrong" }];

	if (error instanceof ZodError) {
		statusCode = httpStatus.BAD_REQUEST;
		message = "Validation failed";
		errorSources = error.issues.map((issue) => ({
			path: issue.path.join(".") || "root",
			message: issue.message,
		}));
	} else if (error instanceof Prisma.PrismaClientKnownRequestError) {
		if (error.code === "P2002") {
			statusCode = httpStatus.CONFLICT;
			message = "Duplicate entry found";
			errorSources = [
				{
					path: String(error.meta?.target ?? "unknown"),
					message: "A record with this value already exists",
				},
			];
		} else if (error.code === "P2025") {
			statusCode = httpStatus.NOT_FOUND;
			message = "Requested record not found";
			errorSources = [{ path: "", message: "Record not found" }];
		} else if (error.code === "P2034") {
			// Serializable transaction write conflict — e.g. two students
			// racing for the last seat in a section. Safe to retry.
			statusCode = httpStatus.CONFLICT;
			message = "This request conflicted with another request. Please try again.";
			errorSources = [
				{ path: "", message: "Transaction write conflict, please retry" },
			];
		} else {
			statusCode = httpStatus.BAD_REQUEST;
			message = "Database request error";
			errorSources = [{ path: "", message: error.message }];
		}
	} else if (error instanceof jwt.TokenExpiredError) {
		statusCode = httpStatus.UNAUTHORIZED;
		message = "Token has expired";
		errorSources = [{ path: "", message: "Token has expired" }];
	} else if (error instanceof jwt.JsonWebTokenError) {
		statusCode = httpStatus.UNAUTHORIZED;
		message = "Invalid token";
		errorSources = [{ path: "", message: "Invalid or malformed token" }];
	} else if (error instanceof AppError) {
		statusCode = error.statusCode;
		message = error.message;
		errorSources = [{ path: "", message: error.message }];
	} else if (error instanceof Error) {
		message = error.message;
		errorSources = [{ path: "", message: error.message }];
	}

	res.status(statusCode).json({
		success: false,
		statusCode,
		message,
		errors: errorSources,
		...(config.env === "development" && error instanceof Error
			? { stack: error.stack }
			: {}),
	});
};

export default globalErrorHandler;
