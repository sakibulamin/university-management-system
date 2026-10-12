import type { Request, Response } from "express";
import httpStatus from "http-status";

import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AuthService } from "./auth.service";
import type { TAuthUser } from "../../interfaces";
import config from "../../config";

const registerStudent = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	await AuthService.registerStudent(payload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Verification OTP sent successfully",
		data: null,
	});
});

const verifiedEmail = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await AuthService.verifyEmail(payload);

	const { accessToken, refreshToken, user, student, instructor } = result;

	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: config.node_env === "development" ? false : true,
		sameSite: config.node_env === "development" ? "lax" : "none",
		maxAge: 1000 * 60 * 60 * 24, // 1 day
	});

	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: config.node_env === "development" ? false : true,
		sameSite: config.node_env === "development" ? "lax" : "none",
		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	});

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Student verification successfully",
		data: {
			accessToken,
			refreshToken,
			user,
			student,
			instructor,
		},
	});
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await AuthService.loginUser(payload);

	const { accessToken, refreshToken, user } = result;

	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: config.node_env === "development" ? false : true,
		sameSite: config.node_env === "development" ? "lax" : "none",
		maxAge: 1000 * 60 * 60 * 24, // 1 day
	});

	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: config.node_env === "development" ? false : true,
		sameSite: config.node_env === "development" ? "lax" : "none",
		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	});

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User logged in successfully",
		data: {
			accessToken,
			refreshToken,
			user,
		},
	});
});

const getMe = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as TAuthUser;

	if (!user) {
		throw new Error("User information is missing in the request");
	}

	const result = await AuthService.getMe(user.id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Student profile fetched successfully",
		data: result,
	});
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
        if (!req.cookies?.refreshToken) {
                return res.status(httpStatus.UNAUTHORIZED).json({
                        success: false,
                        statusCode: httpStatus.UNAUTHORIZED,
                        message: "Refresh token is missing",
                        data: null,
                });
        }

        const result = await AuthService.refreshToken(
                req.cookies.refreshToken,
        );

        const { accessToken, refreshToken: newRefreshToken } = result;

      

        res.cookie("accessToken", accessToken, {
               	httpOnly: true,
		secure: config.node_env === "development" ? false : true,
		sameSite: config.node_env === "development" ? "lax" : "none",
                maxAge: 1000 * 60 * 60 * 24,
        });

        res.cookie("refreshToken", newRefreshToken, {
                	httpOnly: true,
		secure: config.node_env === "development" ? false : true,
		sameSite: config.node_env === "development" ? "lax" : "none",
                maxAge: 1000 * 60 * 60 * 24 * 7,
        });

        sendResponse(res, {
                statusCode: httpStatus.OK,
                success: true,
                message: "Tokens refreshed successfully",
                data: {
                        accessToken,
                },
        });
});

// const refreshToken = catchAsync(async (req: Request, res: Response) => {
// 	if (!req.cookies.refreshToken) {
// 		throw new Error("Refresh token is missing");
// 	}

// 	const result = await AuthService.refreshToken(req.cookies.refreshToken);

// 	const { accessToken, refreshToken: newRefreshToken } = result;

// 	res.cookie("accessToken", accessToken, {
// 		httpOnly: true,
// 		secure: config.node_env === "development" ? false : true,
// 		sameSite: config.node_env === "development" ? "lax" : "none",
// 		maxAge: 1000 * 60 * 60 * 24, // 1 day
// 	});

// 	res.cookie("refreshToken", newRefreshToken, {
// 		httpOnly: true,
// 		secure: config.node_env === "development" ? false : true,
// 		sameSite: config.node_env === "development" ? "lax" : "none",
// 		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
// 	});

// 	sendResponse(res, {
// 		statusCode: httpStatus.OK,
// 		success: true,
// 		message: "New tokens generated successfully",
// 		data: {
// 			accessToken,
// 			refreshToken: newRefreshToken,
// 		},
// 	});
// });


// const refreshToken = catchAsync(async (req: Request, res: Response) => {


// 	if (!req.cookies?.refreshToken) {
// 		throw new Error("Refresh token is missing");
// 	}

// 	const result = await AuthService.refreshToken(req.cookies.refreshToken);



// });


const googleLogin = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await AuthService.googleLogin(payload);
	const { accessToken, refreshToken } = result;

	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: config.node_env === "development" ? false : true,
		sameSite: config.node_env === "development" ? "lax" : "none",
		maxAge: 1000 * 60 * 60 * 24, // 1 day
	});

	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: config.node_env === "development" ? false : true,
		sameSite: config.node_env === "development" ? "lax" : "none",
		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	});

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User logged in with Google successfully",
		data: {
			accessToken,
			refreshToken,
		},
	});
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	await AuthService.forgotPassword(payload);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: `OTP sent to email: ${payload.email}`,
		data: null,
	});
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	await AuthService.resetPassword(payload);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Password changed successfully",
		data: null,
	});
});

const logout = catchAsync(async (req: Request, res: Response) => {
	const token = req.cookies?.refreshToken as string | undefined;

	await AuthService.logoutUser(token);

	res.clearCookie("accessToken", {
		httpOnly: true,
		secure: config.node_env === "development" ? false : true,
		sameSite: config.node_env === "development" ? "lax" : "none",
	});

	res.clearCookie("refreshToken", {
		httpOnly: true,
		secure: config.node_env === "development" ? false : true,
		sameSite: config.node_env === "development" ? "lax" : "none",
	});

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Logged out successfully",
		data: null,
	});
});

export const AuthController = {
	registerStudent,
	verifiedEmail,
	loginUser,
	getMe,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword,
	logout,
};
