import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { DepartmentService } from "./department.service.js";
import type { IDepartmentFilters } from "./department.interface.js";

const createDepartment = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentService.createDepartment(req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.CREATED,
		message: "Department created successfully",
		data: result,
	});
});

const getAllDepartments = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentService.getAllDepartments(
		req.query as unknown as IDepartmentFilters,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Departments retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getSingleDepartment = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentService.getSingleDepartment(req.params.id);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Department retrieved successfully",
		data: result,
	});
});

const updateDepartment = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentService.updateDepartment(
		req.params.id,
		req.body,
		req.user,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Department updated successfully",
		data: result,
	});
});

const deleteDepartment = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentService.deleteDepartment(req.params.id, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Department deleted successfully",
		data: result,
	});
});

export const DepartmentController = {
	createDepartment,
	getAllDepartments,
	getSingleDepartment,
	updateDepartment,
	deleteDepartment,
};
