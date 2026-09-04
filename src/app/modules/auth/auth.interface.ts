export interface IRegisterPayload {
	name: string;
	email: string;
	password: string;
	programId: string;
}

export interface IVerifyEmailPayload {
	email: string;
	otp: string;
}

export interface ILoginPayload {
	email: string;
	password: string;
}

export interface IGoogleLoginPayload {
	idToken: string;
	// Only required when the Google sign-in creates a brand-new Student
	// (Student.programId is required in the schema, but Google gives us
	// no program choice on its own).
	programId?: string;
}

export interface IForgotPasswordPayload {
	email: string;
}

export interface IResetPasswordPayload {
	email: string;
	otp: string;
	newPassword: string;
}
