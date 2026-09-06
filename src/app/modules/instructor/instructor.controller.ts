import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import type { IInstructorFilters } from "./instructor.interface.js";
import { InstructorService } from "./instructor.service.js";

const createInstructor = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const payload = req.body;
	const result = await InstructorService.createInstructor(payload, user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.CREATED,
		message: "Instructor created successfully",
		data: result,
	});
});

const getAllInstructors = catchAsync(async (req: Request, res: Response) => {
	const query = req.query;
	const result = await InstructorService.getAllInstructors(
		query as unknown as IInstructorFilters,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Instructors retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getMyInstructorProfile = catchAsync(
	async (req: Request, res: Response) => {
		const user = req.user?.id;

		if (!user) {
			throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
		}

		const result = await InstructorService.getMyInstructorProfile(user);

		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Instructor profile retrieved successfully",
			data: result,
		});
	},
);

const getSingleInstructor = catchAsync(async (req: Request, res: Response) => {
	const params = req.params.id as string;

	const result = await InstructorService.getSingleInstructor(params);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Instructor retrieved successfully",
		data: result,
	});
});

const updateInstructor = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const params = req.params.id as string;
	const payload = req.body;
	const result = await InstructorService.updateInstructor(
		params,
		payload,
		user,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Instructor updated successfully",
		data: result,
	});
});

const deleteInstructor = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const params = req.params.id as string;

	const result = await InstructorService.deleteInstructor(params, user);

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
