import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import type { IEnrollmentFilters } from "./enrollment.interface.js";
import { EnrollmentService } from "./enrollment.service.js";

const createEnrollment = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await EnrollmentService.createEnrollment(req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.CREATED,
		message: "Enrolled successfully",
		data: result,
	});
});

const getMyEnrollments = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await EnrollmentService.getMyEnrollments(
		req.user.id,
		req.query as unknown as IEnrollmentFilters,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Enrollments retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getAllEnrollments = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await EnrollmentService.getAllEnrollments(
		req.query as unknown as IEnrollmentFilters,
		req.user,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Enrollments retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const cancelEnrollment = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await EnrollmentService.cancelEnrollment(req.params.id, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Enrollment cancelled successfully",
		data: result,
	});
});

export const EnrollmentController = {
	createEnrollment,
	getMyEnrollments,
	getAllEnrollments,
	cancelEnrollment,
};
