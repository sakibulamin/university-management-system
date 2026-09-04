import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import type { IExamFilters } from "./exam.interface.js";
import { ExamService } from "./exam.service.js";

const createExam = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await ExamService.createExam(req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.CREATED,
		message: "Exam created successfully",
		data: result,
	});
});

const getAllExams = catchAsync(async (req: Request, res: Response) => {
	const result = await ExamService.getAllExams(req.query as unknown as IExamFilters);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Exams retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getSingleExam = catchAsync(async (req: Request, res: Response) => {
	const result = await ExamService.getSingleExam(req.params.id);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Exam retrieved successfully",
		data: result,
	});
});

const updateExam = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await ExamService.updateExam(req.params.id, req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Exam updated successfully",
		data: result,
	});
});

export const ExamController = {
	createExam,
	getAllExams,
	getSingleExam,
	updateExam,
};
