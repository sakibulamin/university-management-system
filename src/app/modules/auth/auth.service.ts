import crypto from "node:crypto";
import path from "node:path";
import bcrypt from "bcryptjs";
import ejs from "ejs";
import httpStatus from "http-status";
import config from "../../config/index.js";
import { verifyGoogleIdToken } from "../../lib/googleAuth.js";
import sendEmail from "../../lib/nodemailer.js";
import prisma from "../../lib/prisma.js";
import redisClient from "../../lib/redis.js";
import AppError from "../../utils/AppError.js";
import { jwtHelpers } from "../../utils/jwt.js";
import { AuthProvider, Prisma, Role } from "../../../generated/prisma/index.js";
import type {
	IForgotPasswordPayload,
	IGoogleLoginPayload,
	ILoginPayload,
	IRegisterPayload,
	IResetPasswordPayload,
	IVerifyEmailPayload,
} from "./auth.interface.js";

const OTP_EXPIRY_SECONDS = 5 * 60; // 5 minutes, per spec
const TEMPLATES_DIR = path.join(process.cwd(), "src/app/templates");

const generateOtp = () => {
	return crypto.randomInt(100000, 999999).toString();
};

const sendOtpEmail = async (to: string, name: string, otp: string, subject: string) => {
	const html = await ejs.renderFile(path.join(TEMPLATES_DIR, "otp.ejs"), {
		name,
		otp,
		subject,
	});

	await sendEmail({ to, subject, html: html as string });
};

const sendPasswordChangedEmail = async (to: string, name: string) => {
	const html = await ejs.renderFile(path.join(TEMPLATES_DIR, "passwordChanged.ejs"), {
		name,
	});

	await sendEmail({
		to,
		subject: "Your password has been changed",
		html: html as string,
	});
};

// Generates a unique human-readable Student ID, e.g. STU-2026-4821.
const generateStudentId = async (tx: Prisma.TransactionClient) => {
	const year = new Date().getFullYear();
	let studentId = "";
	let isUnique = false;

	while (!isUnique) {
		const randomPart = crypto.randomInt(1000, 9999);
		studentId = `STU-${year}-${randomPart}`;

		const existing = await tx.student.findUnique({ where: { studentId } });
		isUnique = !existing;
	}

	return studentId;
};

const generateAuthTokens = async (user: { id: string; role: Role }) => {
	if (!config.jwt_access_secret || !config.jwt_refresh_secret) {
		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			"JWT secrets are not configured",
		);
	}

	const accessToken = jwtHelpers.generateToken(
		{ id: user.id, role: user.role },
		config.jwt_access_secret,
		config.jwt_access_expires_in,
	);

	const refreshToken = jwtHelpers.generateToken(
		{ id: user.id, role: user.role },
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in,
	);

	const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
	const expiresAt = jwtHelpers.getExpiryDate(config.jwt_refresh_expires_in);

	await prisma.refreshToken.create({
		data: {
			userId: user.id,
			tokenHash,
			expiresAt,
		},
	});

	return { accessToken, refreshToken };
};

const assertAccountIsUsable = (user: { isDeleted: boolean; status: string }) => {
	if (user.isDeleted) {
		throw new AppError(httpStatus.UNAUTHORIZED, "This account no longer exists");
	}

	if (user.status === "BLOCKED") {
		throw new AppError(httpStatus.FORBIDDEN, "This account has been blocked");
	}

	if (user.status === "DELETED") {
		throw new AppError(httpStatus.FORBIDDEN, "This account has been deleted");
	}
};

// ---------------------------------------------------------------------------
// 1. Register (STUDENT only) — creates OTP + temp registration data in Redis,
//    does NOT create the User until verify-email succeeds.
// ---------------------------------------------------------------------------
const registerUser = async (payload: IRegisterPayload) => {
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({ where: { email } });

	if (isUserExists) {
		throw new AppError(httpStatus.BAD_REQUEST, "User already exists with this email");
	}

	const isProgramExists = await prisma.program.findUnique({
		where: { id: payload.programId },
	});

	if (!isProgramExists || isProgramExists.isDeleted) {
		throw new AppError(httpStatus.BAD_REQUEST, "Selected program does not exist");
	}

	const hashedPassword = await bcrypt.hash(
		payload.password,
		Number(config.bcrypt_salt_rounds),
	);

	const otp = generateOtp();

	const tempPayload = {
		name: payload.name,
		email,
		password: hashedPassword,
		programId: payload.programId,
	};

	await redisClient.setEx(`otp:register:${email}`, OTP_EXPIRY_SECONDS, otp);
	await redisClient.setEx(
		`reg:temp:${email}`,
		OTP_EXPIRY_SECONDS,
		JSON.stringify(tempPayload),
	);

	await sendOtpEmail(email, payload.name, otp, "Verify your email");

	return { email };
};

// ---------------------------------------------------------------------------
// 2. Verify Email — reads OTP + temp data from Redis, creates User + Student.
// ---------------------------------------------------------------------------
const verifyEmail = async (payload: IVerifyEmailPayload) => {
	const email = payload.email.trim().toLowerCase();

	const storedOtp = await redisClient.get(`otp:register:${email}`);

	if (!storedOtp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP has expired, please register again");
	}

	if (storedOtp !== payload.otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
	}

	const tempDataRaw = await redisClient.get(`reg:temp:${email}`);

	if (!tempDataRaw) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Registration data has expired, please register again",
		);
	}

	const tempData = JSON.parse(tempDataRaw) as {
		name: string;
		email: string;
		password: string;
		programId: string;
	};

	const isUserExists = await prisma.user.findUnique({ where: { email } });

	if (isUserExists) {
		throw new AppError(httpStatus.BAD_REQUEST, "User already exists with this email");
	}

	const result = await prisma.$transaction(async (tx) => {
		const user = await tx.user.create({
			data: {
				name: tempData.name,
				email: tempData.email,
				password: tempData.password,
				role: Role.STUDENT,
				authProvider: AuthProvider.CREDENTIAL,
				emailVerified: true,
			},
		});

		const studentId = await generateStudentId(tx);

		const student = await tx.student.create({
			data: {
				userId: user.id,
				studentId,
				programId: tempData.programId,
			},
		});

		return { user, student };
	});

	await redisClient.del(`otp:register:${email}`);
	await redisClient.del(`reg:temp:${email}`);

	const tokens = await generateAuthTokens({ id: result.user.id, role: result.user.role });

	const { password: _password, ...userWithoutPassword } = result.user;

	return {
		user: { ...userWithoutPassword, student: result.student },
		...tokens,
	};
};

// ---------------------------------------------------------------------------
// 3. Login (credential-based)
// ---------------------------------------------------------------------------
const loginUser = async (payload: ILoginPayload) => {
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({ where: { email } });

	if (!user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
	}

	assertAccountIsUsable(user);

	if (user.authProvider !== AuthProvider.CREDENTIAL || !user.password) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This account uses Google login, please continue with Google",
		);
	}

	const isPasswordValid = await bcrypt.compare(payload.password, user.password);

	if (!isPasswordValid) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
	}

	const tokens = await generateAuthTokens({ id: user.id, role: user.role });

	const { password: _password, ...userWithoutPassword } = user;

	return { user: userWithoutPassword, ...tokens };
};

// ---------------------------------------------------------------------------
// 4. Google Login — public Google sign-up creates STUDENT only.
// ---------------------------------------------------------------------------
const googleLogin = async (payload: IGoogleLoginPayload) => {
	const googleProfile = await verifyGoogleIdToken(payload.idToken);
	const email = googleProfile.email.trim().toLowerCase();

	let user = await prisma.user.findUnique({ where: { email } });

	if (user) {
		assertAccountIsUsable(user);

		if (!user.googleId) {
			user = await prisma.user.update({
				where: { id: user.id },
				data: { googleId: googleProfile.googleId, emailVerified: true },
			});
		}
	} else {
		if (!payload.programId) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Program is required to complete registration",
			);
		}

		const programId = payload.programId;

		user = await prisma.$transaction(async (tx) => {
			const isProgramExists = await tx.program.findUnique({
				where: { id: programId },
			});

			if (!isProgramExists || isProgramExists.isDeleted) {
				throw new AppError(httpStatus.BAD_REQUEST, "Selected program does not exist");
			}

			const newUser = await tx.user.create({
				data: {
					name: googleProfile.name,
					email,
					role: Role.STUDENT,
					authProvider: AuthProvider.GOOGLE,
					googleId: googleProfile.googleId,
					emailVerified: true,
				},
			});

			const studentId = await generateStudentId(tx);

			await tx.student.create({
				data: {
					userId: newUser.id,
					studentId,
					programId,
				},
			});

			return newUser;
		});
	}

	if (!user) {
		throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to resolve user");
	}

	const tokens = await generateAuthTokens({ id: user.id, role: user.role });

	const { password: _password, ...userWithoutPassword } = user;

	return { user: userWithoutPassword, ...tokens };
};

// ---------------------------------------------------------------------------
// 5. Get My Profile
// ---------------------------------------------------------------------------
const getMe = async (userId: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			student: true,
			instructor: true,
		},
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const { password: _password, ...userWithoutPassword } = user;

	return userWithoutPassword;
};

// ---------------------------------------------------------------------------
// 6. Refresh Token — verifies + rotates (revokes old, issues new).
// ---------------------------------------------------------------------------
const refreshTokenService = async (token: string | undefined) => {
	if (!token) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token not found");
	}

	if (!config.jwt_refresh_secret) {
		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			"JWT refresh secret is not configured",
		);
	}

	const decoded = jwtHelpers.verifyToken(token, config.jwt_refresh_secret);
	const userId = decoded.id as string;

	const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

	const storedToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });

	if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid or expired refresh token");
	}

	const user = await prisma.user.findUnique({ where: { id: userId } });

	if (!user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "User does not exist");
	}

	assertAccountIsUsable(user);

	await prisma.refreshToken.update({
		where: { id: storedToken.id },
		data: { revokedAt: new Date() },
	});

	const tokens = await generateAuthTokens({ id: user.id, role: user.role });

	return tokens;
};

// ---------------------------------------------------------------------------
// 7. Forgot Password
// ---------------------------------------------------------------------------
const forgotPassword = async (payload: IForgotPasswordPayload) => {
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({ where: { email } });

	if (!user || user.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "No account found with this email");
	}

	if (user.status === "BLOCKED") {
		throw new AppError(httpStatus.FORBIDDEN, "This account has been blocked");
	}

	if (user.authProvider === AuthProvider.GOOGLE) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This account uses Google login and does not have a password",
		);
	}

	const otp = generateOtp();

	await redisClient.setEx(`otp:forgot:${email}`, OTP_EXPIRY_SECONDS, otp);

	await sendOtpEmail(email, user.name, otp, "Reset your password");

	return { email };
};

// ---------------------------------------------------------------------------
// 8. Reset Password
// ---------------------------------------------------------------------------
const resetPassword = async (payload: IResetPasswordPayload) => {
	const email = payload.email.trim().toLowerCase();

	const storedOtp = await redisClient.get(`otp:forgot:${email}`);

	if (!storedOtp || storedOtp !== payload.otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
	}

	const user = await prisma.user.findUnique({ where: { email } });

	if (!user || user.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "No account found with this email");
	}

	const hashedPassword = await bcrypt.hash(
		payload.newPassword,
		Number(config.bcrypt_salt_rounds),
	);

	await prisma.user.update({
		where: { id: user.id },
		data: { password: hashedPassword },
	});

	await redisClient.del(`otp:forgot:${email}`);

	await sendPasswordChangedEmail(email, user.name);

	return { email };
};

// ---------------------------------------------------------------------------
// 9. Logout — revokes the refresh token row (see Phase 4 plan for rationale).
// ---------------------------------------------------------------------------
const logoutUser = async (token: string | undefined) => {
	if (!token) {
		return null;
	}

	const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

	await prisma.refreshToken.updateMany({
		where: { tokenHash, revokedAt: null },
		data: { revokedAt: new Date() },
	});

	return null;
};

export const AuthService = {
	registerUser,
	verifyEmail,
	loginUser,
	googleLogin,
	getMe,
	refreshTokenService,
	forgotPassword,
	resetPassword,
	logoutUser,
};
