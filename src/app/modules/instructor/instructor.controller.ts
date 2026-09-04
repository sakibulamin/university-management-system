import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import type { IInstructorFilters } from "./instructor.interface.js";
import { InstructorService } from "./instructor.service.js";

const createInstructor = catchAsync(async (req: Request, res: Response) => {
	const result = await InstructorService.createInstructor(req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.CREATED,
		message: "Instructor created successfully",
		data: result,
	});
});

const getAllInstructors = catchAsync(async (req: Request, res: Response) => {
	const result = await InstructorService.getAllInstructors(
		req.query as unknown as IInstructorFilters,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Instructors retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getMyInstructorProfile = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await InstructorService.getMyInstructorProfile(req.user.id);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Instructor profile retrieved successfully",
		data: result,
	});
});

const getSingleInstructor = catchAsync(async (req: Request, res: Response) => {
	const result = await InstructorService.getSingleInstructor(req.params.id);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Instructor retrieved successfully",
		data: result,
	});
});

const updateInstructor = catchAsync(async (req: Request, res: Response) => {
	const result = await InstructorService.updateInstructor(req.params.id, req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Instructor updated successfully",
		data: result,
	});
});

const deleteInstructor = catchAsync(async (req: Request, res: Response) => {
	const result = await InstructorService.deleteInstructor(req.params.id, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Instructor deleted successfully",
		data: result,
	});
});

export const InstructorController = {
	createInstructor,
	getAllInstructors,
	getMyInstructorProfile,
	getSingleInstructor,
	updateInstructor,
	deleteInstructor,
};
