import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import type {
	IMyResultFilters,
	ISectionResultFilters,
} from "./result.interface.js";
import { ResultService } from "./result.service.js";

const submitResult = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await ResultService.submitResult(req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.CREATED,
		message: "Result submitted successfully",
		data: result,
	});
});

const updateResult = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await ResultService.updateResult(req.params.id, req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Result updated successfully",
		data: result,
	});
});

const getMyResults = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await ResultService.getMyResults(
		req.user.id,
		req.query as unknown as IMyResultFilters,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Results retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getSectionResults = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await ResultService.getSectionResults(
		req.params.sectionId,
		req.query as unknown as ISectionResultFilters,
		req.user,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Section results retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

export const ResultController = {
	submitResult,
	updateResult,
	getMyResults,
	getSectionResults,
};
