import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";

const notFound = (req: Request, res: Response, _next: NextFunction) => {
	res.status(httpStatus.NOT_FOUND).json({
		success: false,
		message: "API not found",
		errors: [
			{
				path: req.originalUrl,
				message: "The requested route does not exist",
			},
		],
	});
};

export default notFound;
