import type { Request, Response } from "express";
import httpStatus from "http-status";

import { catchAsync } from "../../utils/catchAsync.js";

import { userService } from "./user.service.js";
import sendResponse from "../../utils/sendResponse.js";
import { updateProfileValidationSchema } from "./user.validation.js";

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user!.userId;

	const result = await userService.getMyProfile(userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile retrieved successfully",
		data: result,
	});
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user!.userId;

	const validatedData = updateProfileValidationSchema.parse(req.body);

	const result = await userService.updateMyProfile(userId, validatedData);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile updated successfully",
		data: result,
	});
});

const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user!.userId;

	if (!req.file) {
		throw new Error("Profile image is required");
	}

	const result = await userService.uploadProfileImage(req.file.buffer, userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile image uploaded successfully",
		data: result,
	});
});

export const userController = {
	getMyProfile,
	updateMyProfile,
	uploadProfileImage,
};
