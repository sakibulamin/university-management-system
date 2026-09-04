import z from "zod";

const InitiatePaymentZodSchema = z.object({
	amount: z.number().positive("Amount must be greater than 0"),
	purpose: z.string().optional(),
});

const PaymentCallbackZodSchema = z.object({
	paymentID: z.string().min(1, "paymentID is required"),
});

export const PaymentValidation = {
	InitiatePaymentZodSchema,
	PaymentCallbackZodSchema,
};
