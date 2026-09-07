import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import type { IProgramFilters } from "./program.interface.js";
import { ProgramService } from "./program.service.js";

const createProgram = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const payload = req.body;
	const result = await ProgramService.createProgram(payload, user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.CREATED,
		message: "Program created successfully",
		data: result,
	});
});

const getAllPrograms = catchAsync(async (req: Request, res: Response) => {
	const query = req.query;
	const result = await ProgramService.getAllPrograms(
		query as unknown as IProgramFilters,
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
	const params = req.params.id as string;

	const result = await ProgramService.getSingleProgram(params);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Program retrieved successfully",
		data: result,
	});
});

const updateProgram = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const params = req.params.id as string;
	const payload = req.body;
	const result = await ProgramService.updateProgram(params, payload, user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Program updated successfully",
		data: result,
	});
});

const deleteProgram = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const params = req.params.id as string;

	const result = await ProgramService.deleteProgram(params, user);

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
