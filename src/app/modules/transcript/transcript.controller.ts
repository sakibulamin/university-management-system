import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { TranscriptService } from "./transcript.service.js";

const getMyTranscript = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await TranscriptService.getMyTranscript(req.user.id);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Transcript retrieved successfully",
		data: result,
	});
});

export const TranscriptController = {
	getMyTranscript,
};
