import z from "zod";

const RegisterZodSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	email: z.email("Invalid email address"),
	password: z
		.string()
		.min(8, "Password Must Minimum 8 Characters Long.")
		.regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
		.regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")

		.regex(/[0-9]/, "Password must contain atleast 1 Number")
		.regex(/[^A-Za-z0-9]/, "Password must contain atleast 1 Special Character"),
	role: z.enum(["STUDENT", "INSTRUCTOR"]),
});

const VerifyEmailZodSchema = z.object({
	email: z.email("Invalid email address"),
	otp: z.string().length(6, "OTP must be 6 digits"),
});

const LoginZodSchema = z.object({
	email: z.email("Invalid email address"),
	password: z
		.string()
		.min(8, "Password Must Minimum 8 Characters Long.")
		.regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
		.regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")

		.regex(/[0-9]/, "Password must contain atleast 1 Number")
		.regex(/[^A-Za-z0-9]/, "Password must contain atleast 1 Special Character"),
});

const GoogleLoginZodSchema = z.object({
	idToken: z.string().min(1, "Google ID token is required"),
});

const ForgotPasswordZodSchema = z.object({
	email: z.email("Invalid email address"),
});

const ResetPasswordZodSchema = z.object({
	email: z.email("Invalid email address"),
	otp: z.string().length(6, "OTP must be 6 digits"),
	newPassword: z
		.string()
		.min(8, "Password Must Minimum 8 Characters Long.")
		.regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
		.regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")

		.regex(/[0-9]/, "Password must contain atleast 1 Number")
		.regex(/[^A-Za-z0-9]/, "Password must contain atleast 1 Special Character"),
});

export const AuthValidation = {
	RegisterZodSchema,
	VerifyEmailZodSchema,
	LoginZodSchema,
	GoogleLoginZodSchema,
	ForgotPasswordZodSchema,
	ResetPasswordZodSchema,
};
