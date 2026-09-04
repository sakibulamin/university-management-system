import type { Request, Response } from "express";
import httpStatus from "http-status";
import config from "../../config/index.js";
import AppError from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { AuthService } from "./auth.service.js";

const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

const setRefreshTokenCookie = (res: Response, token: string) => {
	res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
		httpOnly: true,
		secure: config.env === "production",
		sameSite: "strict",
	});
};

const register = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.registerUser(req.body);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "OTP sent to your email. Please verify to complete registration",
		data: result,
	});
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.verifyEmail(req.body);

	setRefreshTokenCookie(res, result.refreshToken);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.CREATED,
		message: "Email verified and account created successfully",
		data: {
			user: result.user,
			accessToken: result.accessToken,
		},
	});
});

const login = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.loginUser(req.body);

	setRefreshTokenCookie(res, result.refreshToken);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Logged in successfully",
		data: {
			user: result.user,
			accessToken: result.accessToken,
		},
	});
});

const googleLogin = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.googleLogin(req.body);

	setRefreshTokenCookie(res, result.refreshToken);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Logged in with Google successfully",
		data: {
			user: result.user,
			accessToken: result.accessToken,
		},
	});
});

const getMe = catchAsync(async (req: Request, res: Response) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
	}

	const result = await AuthService.getMe(req.user.id);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Profile retrieved successfully",
		data: result,
	});
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
	const token = req.cookies?.refreshToken as string | undefined;

	const result = await AuthService.refreshTokenService(token);

	setRefreshTokenCookie(res, result.refreshToken);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Access token refreshed successfully",
		data: {
			accessToken: result.accessToken,
		},
	});
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.forgotPassword(req.body);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "OTP sent to your email",
		data: result,
	});
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.resetPassword(req.body);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Password reset successfully",
		data: result,
	});
});

const logout = catchAsync(async (req: Request, res: Response) => {
	const token = req.cookies?.refreshToken as string | undefined;

	await AuthService.logoutUser(token);

	res.clearCookie(REFRESH_TOKEN_COOKIE_NAME);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Logged out successfully",
		data: null,
	});
});

export const AuthController = {
	register,
	verifyEmail,
	login,
	googleLogin,
	getMe,
	refreshToken,
	forgotPassword,
	resetPassword,
	logout,
};
