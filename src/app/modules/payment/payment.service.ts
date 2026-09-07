import crypto from "node:crypto";
import httpStatus from "http-status";

import type { TAuthUser } from "../../interfaces/index.js";

import { bkash } from "../../lib/bkash.js";
import config from "../../config/index.js";
import prisma from "../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import type {
	IInitiatePaymentPayload,
	IPaymentCallbackPayload,
} from "./payment.interface.js";

import {
	PaymentGateway,
	PaymentStatus,
	Role,
} from "../../../../generated/prisma/enums.js";

import { Prisma } from "../../../../generated/prisma/client.js";
import { createAuditLog } from "../../utils/auditLog.js";

const generateMerchantInvoiceNumber = () => {
	const timestamp = Date.now();
	const randomPart = crypto.randomInt(1000, 9999);

	return `INV-${timestamp}-${randomPart}`;
};

const assertOwnsPayment = async (
	actor: TAuthUser,
	payment: {
		studentId: string;
	},
) => {
	if (actor.role === Role.ADMIN) {
		return;
	}

	const student = await prisma.student.findFirst({
		where: {
			userId: actor.id,
			isDeleted: false,
		},
	});

	if (!student || student.id !== payment.studentId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You do not have access to this payment",
		);
	}
};

const findPaymentByGatewayId = async (bkashPaymentID: string) => {
	const payment = await prisma.payment.findUnique({
		where: {
			bkashPaymentID,
		},
	});

	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
	}

	return payment;
};

const initiatePayment = async (
	payload: IInitiatePaymentPayload,
	actor: TAuthUser,
) => {
	const student = await prisma.student.findFirst({
		where: {
			userId: actor.id,
			isDeleted: false,
		},
	});

	if (!student) {
		throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
	}

	const merchantInvoiceNumber = generateMerchantInvoiceNumber();

	const payment = await prisma.payment.create({
		data: {
			studentId: student.id,
			amount: payload.amount,
			currency: "BDT",
			status: PaymentStatus.PENDING,
			gateway: PaymentGateway.BKASH,
			merchantInvoiceNumber,
			payerReference: student.studentId,
		},
	});

	let createResponse: Awaited<ReturnType<typeof bkash.createPayment>>;

	try {
		createResponse = await bkash.createPayment({
			amount: payload.amount,
			merchantInvoiceNumber,
			payerReference: student.studentId,
			callbackURL: `${config.frontend_url}/payment/callback`,
		});
	} catch (error) {
		
			console.error("Unknown error:", error);
		



		await prisma.payment.update({
			where: {
				id: payment.id,
			},
			data: {
				status: PaymentStatus.FAILED,
				failureReason:
					error instanceof Error
						? error.message
						: "bKash create payment failed",
			},
		});

		throw new AppError(
			httpStatus.BAD_GATEWAY,
			error instanceof Error
				? error.message
				: "Failed to initiate payment with bKash",
		);
	}

	const updatedPayment = await prisma.payment.update({
		where: {
			id: payment.id,
		},
		data: {
			bkashPaymentID: createResponse.paymentID,

			createResponse: createResponse as unknown as Prisma.InputJsonValue,
		},
	});

	await createAuditLog({
		userId: actor.id,
		action: "PAYMENT_INITIATED",
		entity: "Payment",
		entityId: updatedPayment.id,
		details: { amount: updatedPayment.amount, merchantInvoiceNumber },
	});

	return {
		paymentId: updatedPayment.id,
		bkashPaymentID: createResponse.paymentID,
		bkashURL: createResponse.bkashURL,
		amount: updatedPayment.amount,
		merchantInvoiceNumber,
	};
};

const successCallback = async (
	payload: IPaymentCallbackPayload,
	actor: TAuthUser,
) => {
	const payment = await findPaymentByGatewayId(payload.paymentID);

	await assertOwnsPayment(actor, payment);

	if (payment.status === PaymentStatus.PAID) {
		return payment;
	}

	if (payment.status !== PaymentStatus.PENDING) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Cannot complete a payment with status ${payment.status}`,
		);
	}

	let executeResponse: Awaited<ReturnType<typeof bkash.executePayment>>;

	try {
		executeResponse = await bkash.executePayment(payload.paymentID);
	} catch (error) {
		throw new AppError(
			httpStatus.BAD_GATEWAY,
			error instanceof Error
				? error.message
				: "Failed to execute bKash payment",
		);
	}

	if (
		executeResponse.transactionStatus !== "Completed" ||
		!executeResponse.trxID
	) {
		await prisma.payment.update({
			where: {
				id: payment.id,
			},
			data: {
				status: PaymentStatus.FAILED,

				failureReason:
					executeResponse.statusMessage ?? "Payment was not completed",

				executeResponse: executeResponse as unknown as Prisma.InputJsonValue,
			},
		});

		throw new AppError(
			httpStatus.BAD_REQUEST,
			executeResponse.statusMessage ?? "Payment could not be completed",
		);
	}

	const updateResult = await prisma.payment.updateMany({
		where: {
			id: payment.id,
			status: PaymentStatus.PENDING,
		},
		data: {
			status: PaymentStatus.PAID,

			bkashTrxID: executeResponse.trxID,

			executeResponse: executeResponse as unknown as Prisma.InputJsonValue,

			paidAt: new Date(),
		},
	});

	const finalPayment = await prisma.payment.findUniqueOrThrow({
		where: {
			id: payment.id,
		},
	});

	if (updateResult.count > 0) {
		await createAuditLog({
			userId: actor.id,
			action: "PAYMENT_SUCCESS",
			entity: "Payment",
			entityId: payment.id,
			details: { trxID: executeResponse.trxID, amount: finalPayment.amount },
		});
	}

	return finalPayment;
};

const failCallback = async (
	payload: IPaymentCallbackPayload,
	actor: TAuthUser,
) => {
	const payment = await findPaymentByGatewayId(payload.paymentID);

	await assertOwnsPayment(actor, payment);

	if (payment.status === PaymentStatus.PAID) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot mark a completed payment as failed",
		);
	}

	if (payment.status !== PaymentStatus.PENDING) {
		return payment;
	}

	const updateResult = await prisma.payment.updateMany({
		where: {
			id: payment.id,
			status: PaymentStatus.PENDING,
		},
		data: {
			status: PaymentStatus.FAILED,
			failureReason: "Payment failed on the bKash gateway",
		},
	});

	const finalPayment = await prisma.payment.findUniqueOrThrow({
		where: {
			id: payment.id,
		},
	});

	if (updateResult.count > 0) {
		await createAuditLog({
			userId: actor.id,
			action: "PAYMENT_FAILED",
			entity: "Payment",
			entityId: payment.id,
		});
	}

	return finalPayment;
};

const cancelCallback = async (
	payload: IPaymentCallbackPayload,
	actor: TAuthUser,
) => {
	const payment = await findPaymentByGatewayId(payload.paymentID);

	await assertOwnsPayment(actor, payment);

	if (payment.status === PaymentStatus.PAID) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot cancel a payment that has already been completed",
		);
	}

	if (payment.status !== PaymentStatus.PENDING) {
		return payment;
	}

	const updateResult = await prisma.payment.updateMany({
		where: {
			id: payment.id,
			status: PaymentStatus.PENDING,
		},
		data: {
			status: PaymentStatus.CANCELLED,
			cancelledAt: new Date(),
		},
	});

	const finalPayment = await prisma.payment.findUniqueOrThrow({
		where: {
			id: payment.id,
		},
	});

	if (updateResult.count > 0) {
		await createAuditLog({
			userId: actor.id,
			action: "PAYMENT_CANCELLED",
			entity: "Payment",
			entityId: payment.id,
		});
	}
	return finalPayment;
};

const getPaymentById = async (id: string, actor: TAuthUser) => {
	const payment = await prisma.payment.findUnique({
		where: {
			id,
		},
	});

	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
	}

	await assertOwnsPayment(actor, payment);

	return payment;
};

export const PaymentService = {
	initiatePayment,
	successCallback,
	failCallback,
	cancelCallback,
	getPaymentById,
};
