import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import type { IStudentFilters } from "./student.interface.js";
import { StudentService } from "./student.service.js";

const getAllStudents = catchAsync(async (req: Request, res: Response) => {
	const result = await StudentService.getAllStudents(
		req.query as unknown as IStudentFilters,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Students retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getMyStudentProfile = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await StudentService.getMyStudentProfile(req.user.id);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Student profile retrieved successfully",
		data: result,
	});
});

const getSingleStudent = catchAsync(async (req: Request, res: Response) => {
	const result = await StudentService.getSingleStudent(req.params.id);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Student retrieved successfully",
		data: result,
	});
});

const updateMyStudentProfile = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await StudentService.updateMyStudentProfile(
		req.user.id,
		req.body,
		req.user,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Profile updated successfully",
		data: result,
	});
});

const adminUpdateStudent = catchAsync(async (req: Request, res: Response) => {
	const result = await StudentService.adminUpdateStudent(req.params.id, req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Student updated successfully",
		data: result,
	});
});

const deleteStudent = catchAsync(async (req: Request, res: Response) => {
	const result = await StudentService.deleteStudent(req.params.id, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Student deleted successfully",
		data: result,
	});
});

export const StudentController = {
	getAllStudents,
	getMyStudentProfile,
	getSingleStudent,
	updateMyStudentProfile,
	adminUpdateStudent,
	deleteStudent,
};
