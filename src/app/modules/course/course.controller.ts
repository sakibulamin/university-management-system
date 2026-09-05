import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import type { ICourseFilters } from "./course.interface.js";
import { CourseService } from "./course.service.js";

const createCourse = catchAsync(async (req: Request, res: Response) => {
	const result = await CourseService.createCourse(req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.CREATED,
		message: "Course created successfully",
		data: result,
	});
});

const getAllCourses = catchAsync(async (req: Request, res: Response) => {
	const result = await CourseService.getAllCourses(
		req.query as unknown as ICourseFilters,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Courses retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getSingleCourse = catchAsync(async (req: Request, res: Response) => {
	const params=req.params.id as string;
	const result = await CourseService.getSingleCourse(params);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Course retrieved successfully",
		data: result,
	});
});

const updateCourse = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const params = req.params.id as string;
	const payload = req.body

	const result = await CourseService.updateCourse(params,payload, user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Course updated successfully",
		data: result,
	});
});

const deleteCourse = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const params = req.params.id as string;

	const result = await CourseService.deleteCourse(params, user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Course deleted successfully",
		data: result,
	});
});

export const CourseController = {
	createCourse,
	getAllCourses,
	getSingleCourse,
	updateCourse,
	deleteCourse,
};
