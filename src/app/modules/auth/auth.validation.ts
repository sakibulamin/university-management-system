import z from "zod";

const RegisterZodSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	email: z.email("Invalid email address"),
	password: z.string().min(6, "Password must be at least 6 characters"),
	programId: z.string().min(1, "Program is required"),
});

const VerifyEmailZodSchema = z.object({
	email: z.email("Invalid email address"),
	otp: z.string().length(6, "OTP must be 6 digits"),
});

const LoginZodSchema = z.object({
	email: z.email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
});

const GoogleLoginZodSchema = z.object({
	idToken: z.string().min(1, "Google ID token is required"),
	programId: z.string().min(1).optional(),
});

const ForgotPasswordZodSchema = z.object({
	email: z.email("Invalid email address"),
});

const ResetPasswordZodSchema = z.object({
	email: z.email("Invalid email address"),
	otp: z.string().length(6, "OTP must be 6 digits"),
	newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export const AuthValidation = {
	RegisterZodSchema,
	VerifyEmailZodSchema,
	LoginZodSchema,
	GoogleLoginZodSchema,
	ForgotPasswordZodSchema,
	ResetPasswordZodSchema,
};
