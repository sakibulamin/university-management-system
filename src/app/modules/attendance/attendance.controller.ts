import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { AttendanceService } from "./attendance.service.js";
import type {
	IMyAttendanceFilters,
	ISectionAttendanceFilters,
} from "./attendance.interface.js";

const markAttendance = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await AttendanceService.markAttendance(req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.CREATED,
		message: "Attendance marked successfully",
		data: result,
	});
});

const updateAttendance = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await AttendanceService.updateAttendance(
		req.params.id,
		req.body,
		req.user,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Attendance updated successfully",
		data: result,
	});
});

const getMyAttendance = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await AttendanceService.getMyAttendance(
		req.user.id,
		req.query as unknown as IMyAttendanceFilters,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Attendance retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getSectionAttendance = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await AttendanceService.getSectionAttendance(
		req.params.sectionId,
		req.query as unknown as ISectionAttendanceFilters,
		req.user,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Section attendance retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

export const AttendanceController = {
	markAttendance,
	updateAttendance,
	getMyAttendance,
	getSectionAttendance,
};
