import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import type { IProgramFilters } from "./program.interface.js";
import { ProgramService } from "./program.service.js";

const createProgram = catchAsync(async (req: Request, res: Response) => {
	const result = await ProgramService.createProgram(req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.CREATED,
		message: "Program created successfully",
		data: result,
	});
});

const getAllPrograms = catchAsync(async (req: Request, res: Response) => {
	const result = await ProgramService.getAllPrograms(
		req.query as unknown as IProgramFilters,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Programs retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getSingleProgram = catchAsync(async (req: Request, res: Response) => {
	const result = await ProgramService.getSingleProgram(req.params.id);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Program retrieved successfully",
		data: result,
	});
});

const updateProgram = catchAsync(async (req: Request, res: Response) => {
	const result = await ProgramService.updateProgram(req.params.id, req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Program updated successfully",
		data: result,
	});
});

const deleteProgram = catchAsync(async (req: Request, res: Response) => {
	const result = await ProgramService.deleteProgram(req.params.id, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Program deleted successfully",
		data: result,
	});
});

export const ProgramController = {
	createProgram,
	getAllPrograms,
	getSingleProgram,
	updateProgram,
	deleteProgram,
};
