import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import type { ISemesterFilters } from "./semester.interface.js";
import { SemesterService } from "./semester.service.js";

const createSemester = catchAsync(async (req: Request, res: Response) => {
	const result = await SemesterService.createSemester(req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.CREATED,
		message: "Semester created successfully",
		data: result,
	});
});

const getAllSemesters = catchAsync(async (req: Request, res: Response) => {
	const result = await SemesterService.getAllSemesters(
		req.query as unknown as ISemesterFilters,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Semesters retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getSingleSemester = catchAsync(async (req: Request, res: Response) => {
	const result = await SemesterService.getSingleSemester(req.params.id);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Semester retrieved successfully",
		data: result,
	});
});

const updateSemester = catchAsync(async (req: Request, res: Response) => {
	const result = await SemesterService.updateSemester(req.params.id, req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Semester updated successfully",
		data: result,
	});
});

const updateSemesterStatus = catchAsync(async (req: Request, res: Response) => {
	const result = await SemesterService.updateSemesterStatus(
		req.params.id,
		req.body,
		req.user,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Semester status updated successfully",
		data: result,
	});
});

export const SemesterController = {
	createSemester,
	getAllSemesters,
	getSingleSemester,
	updateSemester,
	updateSemesterStatus,
};
