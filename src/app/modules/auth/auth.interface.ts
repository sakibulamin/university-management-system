import { Role } from "../../../../generated/prisma/enums";

export interface IRegisterPayload {
	name: string;
	email: string;
	password: string;
	role: string;
}

export interface IVerifyEmailPayload {
	email: string;
	otp: string;
	role?: string;
}

export interface ILoginPayload {
	email: string;
	password: string;
}

export interface IGoogleLoginPayload {
	idToken: string;
}

export interface IForgotPasswordPayload {
	email: string;
}

export interface IResetPasswordPayload {
	email: string;
	otp: string;
	newPassword: string;
}
