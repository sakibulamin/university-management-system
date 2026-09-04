import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import type { IPaymentFilters } from "./payment.interface.js";
import { PaymentService } from "./payment.service.js";

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await PaymentService.initiatePayment(req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.CREATED,
		message: "Payment initiated successfully",
		data: result,
	});
});

const handleSuccessCallback = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await PaymentService.handleSuccessCallback(req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Payment completed successfully",
		data: result,
	});
});

const handleFailCallback = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await PaymentService.handleFailCallback(req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Payment marked as failed",
		data: result,
	});
});

const handleCancelCallback = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await PaymentService.handleCancelCallback(req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Payment cancelled",
		data: result,
	});
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await PaymentService.getPaymentById(req.params.id, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Payment retrieved successfully",
		data: result,
	});
});

const getMyPaymentHistory = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await PaymentService.getMyPaymentHistory(
		req.user.id,
		req.query as unknown as IPaymentFilters,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Payment history retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

export const PaymentController = {
	initiatePayment,
	handleSuccessCallback,
	handleFailCallback,
	handleCancelCallback,
	getPaymentById,
	getMyPaymentHistory,
};
