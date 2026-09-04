import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import type { ISectionFilters } from "./section.interface.js";
import { SectionService } from "./section.service.js";

const createSection = catchAsync(async (req: Request, res: Response) => {
	const result = await SectionService.createSection(req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.CREATED,
		message: "Section created successfully",
		data: result,
	});
});

const getAllSections = catchAsync(async (req: Request, res: Response) => {
	const result = await SectionService.getAllSections(
		req.query as unknown as ISectionFilters,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Sections retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getSingleSection = catchAsync(async (req: Request, res: Response) => {
	const result = await SectionService.getSingleSection(req.params.id);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Section retrieved successfully",
		data: result,
	});
});

const updateSection = catchAsync(async (req: Request, res: Response) => {
	const result = await SectionService.updateSection(req.params.id, req.body, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Section updated successfully",
		data: result,
	});
});

const assignInstructor = catchAsync(async (req: Request, res: Response) => {
	const result = await SectionService.assignInstructor(
		req.params.id,
		req.body,
		req.user,
	);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Instructor assigned successfully",
		data: result,
	});
});

const deleteSection = catchAsync(async (req: Request, res: Response) => {
	const result = await SectionService.deleteSection(req.params.id, req.user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Section deleted successfully",
		data: result,
	});
});

export const SectionController = {
	createSection,
	getAllSections,
	getSingleSection,
	updateSection,
	assignInstructor,
	deleteSection,
};
