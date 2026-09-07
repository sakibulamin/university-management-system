import bcrypt from "bcryptjs";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import {
	AuthProvider,
	Role,
	UserStatus,
} from "../../../../generated/prisma/enums";

import prisma from "../../lib/prisma";

import type {
	IForgotPasswordPayload,
	IGoogleLoginPayload,
	ILoginPayload,
	IRegisterPayload,
	IResetPasswordPayload,
	IVerifyEmailPayload,
} from "./auth.interface";

import crypto from "crypto";

import path from "path";
import ejs from "ejs";
import { jwtUtils } from "../../utils/jwt";
import config from "../../config";
import { transporter } from "../../lib/nodemailer";
import { googleclient } from "../../lib/googleAuth";
import type { TokenPayload } from "google-auth-library";
import { redisClient } from "../../lib/redis";

const registerStudent = async (payload: IRegisterPayload) => {
	const { name, password, role } = payload;

	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new Error("User with this email already exists");
	}
	if (!role) {
		throw new Error("Role is required");
	}

	const hashedPassword = await bcrypt.hash(
		password,
		Number(config.bcrypt_salt_rounds),
	);

	const otpKey = `student verification otp:${email}`;

	const expiredSeconds = 5 * 60;

	const otpValue = crypto.randomInt(100000, 1000000).toString();

	await redisClient.set(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: expiredSeconds,
		},
	});

	const registrationKey = `student registration data:${email}`;

	const registrationPayload = {
		name,
		email,
		password: hashedPassword,
		role,
	};

	await redisClient.setEx(
		registrationKey,
		expiredSeconds,
		JSON.stringify(registrationPayload),
	);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/registration-user-otp.ejs",
	);

	const templateData = {
		name,
		email,
		otp: otpValue,
		expirationMinutes: expiredSeconds / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.sender_email,
		to: email,
		subject: "Email Verification",
		html,
	});

	return {
		name,
		email,
		password,
		role,
	};
};

const verifyEmail = async (payload: IVerifyEmailPayload) => {
	const otp = payload.otp;
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists?.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (isUserExists?.emailVerified) {
		throw new Error("Email already verified");
	}

	if (isUserExists?.isDeleted || isUserExists?.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}

	const expiredSeconds = 5 * 60;

	const otpKey = `student verification otp:${email}`;

	const redisOtp = await redisClient.get(otpKey);

	if (!redisOtp) {
		throw new Error("Invalid or expired OTP");
	}

	if (redisOtp !== otp) {
		throw new Error("OTP does not match");
	}

	await redisClient.del(otpKey);

	const registrationKey = `student registration data:${email}`;

	const redisStudentData = await redisClient.get(registrationKey);

	if (!redisStudentData) {
		throw new Error("Registration data has expired. Please register again");
	}

	const studentPayload = JSON.parse(redisStudentData) as IRegisterPayload;

	const userData: any = {
		name: studentPayload.name,
		email: studentPayload.email,
		password: studentPayload.password,
		role: studentPayload.role,
		status: UserStatus.ACTIVE,
		authProvider: AuthProvider.CREDENTIAL,
		emailVerified: true,
	};

	if (studentPayload.role === Role.STUDENT) {
		userData.student = {
			create: {
				studentId: await generateStudentId(),
			},
		};
	}

	if (studentPayload.role === Role.INSTRUCTOR) {
		userData.instructor = {
			create: {
				instructorId: await generateInstructorId(),
			},
		};
	}

	const createdUser = await prisma.user.create({
		data: userData,

		omit: {
			password: true,
		},

		include: {
			student: true,
			instructor: true,
		},
	});

	await redisClient.del(registrationKey);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/student-welcome-email.ejs",
	);

	const templateData = {
		name: createdUser.name,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.sender_email,
		to: email,
		subject: "Welcome To University Management System",
		html,
	});

	const { student, instructor, ...user } = createdUser;

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret as string,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret as string,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		user,
		student: student ?? null,
		instructor: instructor ?? null,
		accessToken,
		refreshToken,
	};
};

const generateStudentId = async () => {
	const year = new Date().getFullYear();

	let studentId = "";
	let isUnique = false;

	while (!isUnique) {
		const randomPart = crypto.randomInt(1000, 10000);

		studentId = `STU-${year}-${randomPart}`;

		const existingStudent = await prisma.student.findUnique({
			where: {
				studentId,
			},
		});

		if (!existingStudent) {
			isUnique = true;
		}
	}

	return studentId;
};

const generateInstructorId = async (): Promise<string> => {
	const year = new Date().getFullYear();

	while (true) {
		const randomPart = Math.floor(100000 + Math.random() * 900000).toString();

		const instructorId = `INS-${year}-${randomPart}`;

		const existingInstructor = await prisma.instructor.findUnique({
			where: { instructorId },
		});

		if (!existingInstructor) {
			return instructorId;
		}
	}
};

const loginUser = async (payload: ILoginPayload) => {
	const { password } = payload;

	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		throw new Error("Invalid email or password");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}

	if (user.authProvider !== AuthProvider.CREDENTIAL || !user.password) {
		throw new Error("This account uses Google login. Please login with Google");
	}

	const isPasswordMatched = await bcrypt.compare(password, user.password);

	if (!isPasswordMatched) {
		throw new Error("Invalid email or password");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret as string,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret as string,
		config.jwt_refresh_expires_in as SignOptions,
	);

	const { password: _, ...userWithoutPassword } = user;

	return {
		user: userWithoutPassword,
		accessToken,
		refreshToken,
	};
};

const getMe = async (userId: string) => {
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},

		include: {
			student: true,
			instructor: true,
		},

		omit: {
			password: true,
		},
	});

	if (!user) {
		throw new Error("User not found");
	}

	return user;
};

const refreshToken = async (token: string) => {
	const verifiedRefreshToken = jwtUtils.verifyToken(
		token,
		config.jwt_refresh_secret,
	);

	if (!verifiedRefreshToken.success) {
		throw new Error("Invalid refresh token");
	}

	const data = verifiedRefreshToken.data as JwtPayload;

	const user = await prisma.user.findUnique({
		where: {
			id: data.userId as string,
		},
	});

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new Error("User is inactive or not found");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const newRefreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken: newRefreshToken,
	};
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
	let googleIdTokenPayload: TokenPayload | null | undefined = null;
	try {
		const ticket = await googleclient.verifyIdToken({
			idToken: payload.idToken,
			audience: config.google_client_id,
		});

		googleIdTokenPayload = ticket.getPayload();
	} catch (error) {
	
		throw new Error("Invalid Or Expired Google Id Token");
	}

	if (!googleIdTokenPayload) {
		throw new Error("Invalid Or Expired Google Id Token");
	}

	if (!googleIdTokenPayload.email) {
		throw new Error("Google Email Not Found");
	}
	if (!googleIdTokenPayload.name) {
		throw new Error("Google Email User Name Not Found");
	}

	const ifPatientExistWithGoogleAuth = await prisma.user.findUnique({
		where: {
			email: googleIdTokenPayload.email,
			role: Role.STUDENT,
			googleId: googleIdTokenPayload.sub,
		},
	});

	let user = ifPatientExistWithGoogleAuth;

	if (!ifPatientExistWithGoogleAuth) {
		const ifPatientExistWithCredentials = await prisma.user.findUnique({
			where: {
				email: googleIdTokenPayload.email,
				role: Role.STUDENT,
				authProvider: AuthProvider.CREDENTIAL,
			},
		});

		if (ifPatientExistWithCredentials) {
			if (!ifPatientExistWithCredentials.emailVerified) {
				throw new Error("Email Not Verified");
			}

			if (ifPatientExistWithCredentials.status === UserStatus.BLOCKED) {
				throw new Error("User Is Blocked");
			}

			if (
				ifPatientExistWithCredentials.isDeleted ||
				ifPatientExistWithCredentials.status === UserStatus.DELETED
			) {
				throw new Error("User Is Deleted");
			}

			user = await prisma.user.update({
				where: {
					id: ifPatientExistWithCredentials.id,
				},

				data: {
					googleId: googleIdTokenPayload.sub,
				},
			});
		} else {
			user = await prisma.user.create({
				data: {
					name: googleIdTokenPayload.name,
					email: googleIdTokenPayload.email,
					role: Role.STUDENT,
					googleId: googleIdTokenPayload.sub,
					authProvider: AuthProvider.GOOGLE,
					emailVerified: true,
					patient: {
						create: {
							name: googleIdTokenPayload.name,
							email: googleIdTokenPayload.email,
						},
					},
				},
			});

			const templatePath = path.join(
				process.cwd(),
				"src/app/templates/student-welcome-email.ejs",
			);

			const html = await ejs.renderFile(templatePath, {
				name: user.name,
			});

			await transporter.sendMail({
				from: config.sender_email,
				to: user.email,
				subject: "Welcome To University Management System",
				html,
			});
		}

		const jwtPayload = {
			userId: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
		};

		const accessToken = jwtUtils.createToken(
			jwtPayload,
			config.jwt_access_secret,
			config.jwt_access_expires_in as SignOptions,
		);

		const refreshToken = jwtUtils.createToken(
			jwtPayload,
			config.jwt_refresh_secret,
			config.jwt_refresh_expires_in as SignOptions,
		);

		return {
			accessToken,
			refreshToken,
		};
	}
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: {
			email,
		},
	});

	if (!user) {
		throw new Error("User does not exist");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (!user.emailVerified) {
		throw new Error("User email is not verified");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}

	if (user.googleId && user.authProvider === AuthProvider.GOOGLE) {
		throw new Error("This account uses Google login");
	}

	const otp = crypto.randomInt(100000, 1000000).toString();

	const expiredSeconds = 5 * 60;

	const key = `forgot password email:${email}`;

	await redisClient.setEx(key, expiredSeconds, otp);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/forgot-password.ejs",
	);

	const html = await ejs.renderFile(templatePath, {
		name: user.name,
		otp,
		expirationMinutes: expiredSeconds / 60,
	});

	await transporter.sendMail({
		from: config.sender_email,
		to: user.email,
		subject: "Reset Your Password",
		html,
	});

	return {
		email,
	};
};

const resetPassword = async (payload: IResetPasswordPayload) => {
	const { email: rawEmail, newPassword, otp } = payload;

	const email = rawEmail.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: {
			email,
		},
	});

	if (!user) {
		throw new Error("User does not exist");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (!user.emailVerified) {
		throw new Error("User email is not verified");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}

	if (user.googleId && user.authProvider === AuthProvider.GOOGLE) {
		throw new Error("This account uses Google login");
	}

	const key = `forgot password email:${email}`;

	const redisOtp = await redisClient.get(key);

	if (!redisOtp) {
		throw new Error("Invalid or expired OTP");
	}

	if (redisOtp !== otp) {
		throw new Error("OTP does not match");
	}

	const hashedNewPassword = await bcrypt.hash(
		newPassword,
		Number(config.bcrypt_salt_rounds),
	);

	await prisma.user.update({
		where: {
			id: user.id,
		},

		data: {
			password: hashedNewPassword,
		},
	});

	await redisClient.del(key);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/passwordChanged.ejs",
	);

	const html = await ejs.renderFile(templatePath, {
		name: user.name,
	});

	await transporter.sendMail({
		from: config.sender_email,
		to: user.email,
		subject: "Password Changed Successfully",
		html,
	});

	return {
		email,
	};
};

const logoutUser = async (token: string | undefined) => {
	return null;
};

export const AuthService = {
	registerStudent,
	verifyEmail,
	loginUser,
	getMe,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword,
	logoutUser,
};
