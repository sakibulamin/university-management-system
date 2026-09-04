import crypto from "node:crypto";
import httpStatus from "http-status";
import {
	PaymentGateway,
	PaymentStatus,
	Prisma,
	Role,
} from "../../../generated/prisma/index.js";
import type { TAuthUser } from "../../interfaces/index.js";
import { bkash } from "../../lib/bkash.js";
import config from "../../config/index.js";
import prisma from "../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { createAuditLog } from "../../utils/auditLog.js";
import { paginationHelper } from "../../utils/paginationHelper.js";
import type {
	IInitiatePaymentPayload,
	IPaymentCallbackPayload,
	IPaymentFilters,
} from "./payment.interface.js";

const ALLOWED_SORT_FIELDS = ["createdAt", "amount"];

const generateMerchantInvoiceNumber = () => {
	const timestamp = Date.now();
	const randomPart = crypto.randomInt(1000, 9999);
	return `INV-${timestamp}-${randomPart}`;
};

const assertOwnsPayment = async (actor: TAuthUser, payment: { studentId: string }) => {
	if (actor.role === Role.ADMIN) {
		return;
	}

	const student = await prisma.student.findFirst({
		where: { userId: actor.id, isDeleted: false },
	});

	if (!student || student.id !== payment.studentId) {
		throw new AppError(httpStatus.FORBIDDEN, "You do not have access to this payment");
	}
};

const findPaymentByGatewayId = async (bkashPaymentID: string) => {
	const payment = await prisma.payment.findUnique({ where: { bkashPaymentID } });

	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
	}

	return payment;
};

// ---------------------------------------------------------------------------
// Initiate Payment (STUDENT — self only)
// ---------------------------------------------------------------------------
const initiatePayment = async (payload: IInitiatePaymentPayload, actor: TAuthUser) => {
	const student = await prisma.student.findFirst({
		where: { userId: actor.id, isDeleted: false },
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
		await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: PaymentStatus.FAILED,
				failureReason:
					error instanceof Error ? error.message : "bKash create payment failed",
			},
		});

		throw new AppError(
			httpStatus.BAD_GATEWAY,
			"Failed to initiate payment with bKash. Please try again.",
		);
	}

	const updated = await prisma.payment.update({
		where: { id: payment.id },
		data: {
			bkashPaymentID: createResponse.paymentID,
			createResponse: createResponse as unknown as Prisma.InputJsonValue,
		},
	});

	await createAuditLog({
		userId: actor.id,
		action: "PAYMENT_INITIATED",
		entity: "Payment",
		entityId: updated.id,
		details: { amount: updated.amount, merchantInvoiceNumber },
	});

	return {
		paymentId: updated.id,
		bkashPaymentID: createResponse.paymentID,
		bkashURL: createResponse.bkashURL,
		amount: updated.amount,
		merchantInvoiceNumber,
	};
};

// ---------------------------------------------------------------------------
// Success Callback (STUDENT — own payment; idempotent + duplicate-safe)
// ---------------------------------------------------------------------------
const handleSuccessCallback = async (
	payload: IPaymentCallbackPayload,
	actor: TAuthUser,
) => {
	const payment = await findPaymentByGatewayId(payload.paymentID);

	await assertOwnsPayment(actor, payment);

	if (payment.status === PaymentStatus.PAID) {
		// Already processed — never call bKash execute twice for one payment.
		return payment;
	}

	if (payment.status !== PaymentStatus.PENDING) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Cannot complete a payment with status ${payment.status}`,
		);
	}

	const executeResponse = await bkash.executePayment(payload.paymentID);

	if (executeResponse.transactionStatus !== "Completed" || !executeResponse.trxID) {
		await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: PaymentStatus.FAILED,
				failureReason: executeResponse.statusMessage ?? "Payment was not completed",
				executeResponse: executeResponse as unknown as Prisma.InputJsonValue,
			},
		});

		throw new AppError(
			httpStatus.BAD_REQUEST,
			executeResponse.statusMessage ?? "Payment could not be completed",
		);
	}

	// Compare-and-swap: only the first caller to see PENDING can win this
	// update. A concurrent duplicate call gets count === 0 below.
	const updateResult = await prisma.payment.updateMany({
		where: { id: payment.id, status: PaymentStatus.PENDING },
		data: {
			status: PaymentStatus.PAID,
			bkashTrxID: executeResponse.trxID,
			executeResponse: executeResponse as unknown as Prisma.InputJsonValue,
			paidAt: new Date(),
		},
	});

	const finalPayment = await prisma.payment.findUniqueOrThrow({
		where: { id: payment.id },
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

// ---------------------------------------------------------------------------
// Fail Callback (STUDENT — own payment)
// ---------------------------------------------------------------------------
const handleFailCallback = async (payload: IPaymentCallbackPayload, actor: TAuthUser) => {
	const payment = await findPaymentByGatewayId(payload.paymentID);

	await assertOwnsPayment(actor, payment);

	if (payment.status === PaymentStatus.PAID) {
		throw new AppError(httpStatus.BAD_REQUEST, "Cannot mark a completed payment as failed");
	}

	if (payment.status !== PaymentStatus.PENDING) {
		// Already FAILED/CANCELLED — idempotent, no-op.
		return payment;
	}

	const updateResult = await prisma.payment.updateMany({
		where: { id: payment.id, status: PaymentStatus.PENDING },
		data: {
			status: PaymentStatus.FAILED,
			failureReason: "Payment failed on the bKash gateway",
		},
	});

	const finalPayment = await prisma.payment.findUniqueOrThrow({
		where: { id: payment.id },
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

// ---------------------------------------------------------------------------
// Cancel Callback (STUDENT — own payment)
// ---------------------------------------------------------------------------
const handleCancelCallback = async (
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
		where: { id: payment.id, status: PaymentStatus.PENDING },
		data: {
			status: PaymentStatus.CANCELLED,
			cancelledAt: new Date(),
		},
	});

	const finalPayment = await prisma.payment.findUniqueOrThrow({
		where: { id: payment.id },
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

// ---------------------------------------------------------------------------
// Get Payment by ID (STUDENT own only; ADMIN any)
// ---------------------------------------------------------------------------
const getPaymentById = async (id: string, actor: TAuthUser) => {
	const payment = await prisma.payment.findUnique({ where: { id } });

	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
	}

	await assertOwnsPayment(actor, payment);

	return payment;
};

// ---------------------------------------------------------------------------
// My Payment History (STUDENT — own only)
// ---------------------------------------------------------------------------
const getMyPaymentHistory = async (userId: string, filters: IPaymentFilters) => {
	const student = await prisma.student.findFirst({
		where: { userId, isDeleted: false },
	});

	if (!student) {
		throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
	}

	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt";

	const andConditions: Prisma.PaymentWhereInput[] = [{ studentId: student.id }];

	if (filters.status) {
		andConditions.push({ status: filters.status as PaymentStatus });
	}

	const where: Prisma.PaymentWhereInput = { AND: andConditions };
	const orderBy = { [safeSortBy]: sortOrder } as Prisma.PaymentOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.payment.findMany({ where, skip, take: limit, orderBy }),
		prisma.payment.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

export const PaymentService = {
	initiatePayment,
	handleSuccessCallback,
	handleFailCallback,
	handleCancelCallback,
	getPaymentById,
	getMyPaymentHistory,
};
