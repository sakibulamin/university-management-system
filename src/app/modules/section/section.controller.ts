import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import type { ISectionFilters } from "./section.interface.js";
import { SectionService } from "./section.service.js";

const createSection = catchAsync(async (req: Request, res: Response) => {
			const user= req.user;
	const payload=req.body
	const result = await SectionService.createSection(payload,user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.CREATED,
		message: "Section created successfully",
		data: result,
	});
});

const getAllSections = catchAsync(async (req: Request, res: Response) => {
	const query=req.query
	const result = await SectionService.getAllSections(
		query as unknown as ISectionFilters,
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
		
	const params=req.params.id as string;

	const result = await SectionService.getSingleSection(params);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Section retrieved successfully",
		data: result,
	});
});

const updateSection = catchAsync(async (req: Request, res: Response) => {
			const user= req.user;
	const params=req.params.id as string;
	const payload=req.body
	const result = await SectionService.updateSection(params,payload,user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Section updated successfully",
		data: result,
	});
});

const assignInstructor = catchAsync(async (req: Request, res: Response) => {
			const user= req.user;
	const params=req.params.id as string;
	const payload=req.body
	const result = await SectionService.assignInstructor(params,payload,user);

	sendResponse(res, {
		success: true,
		statusCode: httpStatus.OK,
		message: "Instructor assigned successfully",
		data: result,
	});
});

const deleteSection = catchAsync(async (req: Request, res: Response) => {
			const user= req.user;
	const params=req.params.id as string;

	const result = await SectionService.deleteSection(params,user);

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
