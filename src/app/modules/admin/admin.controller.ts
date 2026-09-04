import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { AdminService } from "./admin.service.js";
import type { IAuditLogFilters, IUserFilters } from "./admin.interface.js";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
	const result = await AdminService.getAllUsers(req.query as unknown as IUserFilters);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Users retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await AdminService.updateUserRole(req.params.id, req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "User role updated successfully",
		data: result,
	});
});

const blockUser = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await AdminService.blockUser(req.params.id, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "User blocked successfully",
		data: result,
	});
});

const unblockUser = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await AdminService.unblockUser(req.params.id, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "User unblocked successfully",
		data: result,
	});
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await AdminService.deleteUser(req.params.id, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "User deleted successfully",
		data: result,
	});
});

const getDashboardStats = catchAsync(async (_req: Request, res: Response) => {
	const result = await AdminService.getDashboardStats();

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Dashboard statistics retrieved successfully",
		data: result,
	});
});

const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
	const result = await AdminService.getAuditLogs(req.query as unknown as IAuditLogFilters);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Audit logs retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

export const AdminController = {
	getAllUsers,
	updateUserRole,
	blockUser,
	unblockUser,
	deleteUser,
	getDashboardStats,
	getAuditLogs,
};
