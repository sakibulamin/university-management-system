import type { Request, Response } from "express";
import httpStatus from "http-status";

import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

import { PaymentService } from "./payment.service";

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const result = await PaymentService.initiatePayment(req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment Initiated Successfully",
		data: result,
	});
});

const successCallback = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const payload = req.body;

	const result = await PaymentService.successCallback(payload, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment Completed Successfully",
		data: result,
	});
});

const failCallback = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const result = await PaymentService.failCallback(req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment Failed Successfully",
		data: result,
	});
});

const cancelCallback = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const result = await PaymentService.cancelCallback(req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment Cancelled Successfully",
		data: result,
	});
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const user = req.user!;

	const result = await PaymentService.getPaymentById(id, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment Retrieved Successfully",
		data: result,
	});
});

export const PaymentController = {
	initiatePayment,
	successCallback,
	failCallback,
	cancelCallback,
	getPaymentById,
};
