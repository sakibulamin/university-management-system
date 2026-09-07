import httpStatus from "http-status";

import type { TAuthUser } from "../../interfaces/index.js";
import prisma from "../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { paginationHelper } from "../../utils/paginationHelper.js";
import type {
	ICourseFilters,
	ICreateCoursePayload,
	IUpdateCoursePayload,
} from "./course.interface.js";
import type { Prisma } from "../../../../generated/prisma/client.js";
import { createAuditLog } from "../../utils/auditLog.js";

const ALLOWED_SORT_FIELDS = ["name", "code", "credits", "createdAt"];

const DEPARTMENT_SELECT = { id: true, name: true, code: true };

const createCourse = async (
	payload: ICreateCoursePayload,
	actor?: TAuthUser,
) => {
	const isCourseExists = await prisma.course.findFirst({
		where: { code: payload.code, isDeleted: false },
	});

	if (isCourseExists) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Course with this code already exists",
		);
	}

	if (payload.departmentId) {
		const isDepartmentExists = await prisma.department.findFirst({
			where: { id: payload.departmentId, isDeleted: false },
		});

		if (!isDepartmentExists) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Selected department does not exist",
			);
		}
	}

	const result = await prisma.course.create({
		data: payload,
		include: { department: { select: DEPARTMENT_SELECT } },
	});
	await createAuditLog({
		userId: actor?.id,
		action: "COURSE_CREATED",
		entity: "Course",
		entityId: result.id,
		details: { name: result.name, code: result.code, credits: result.credits },
	});

	return result;
};

const getAllCourses = async (filters: ICourseFilters) => {
	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy)
		? sortBy
		: "createdAt";

	const andConditions: Prisma.CourseWhereInput[] = [{ isDeleted: false }];

	if (filters.search) {
		andConditions.push({
			OR: [
				{ name: { contains: filters.search, mode: "insensitive" } },
				{ code: { contains: filters.search, mode: "insensitive" } },
			],
		});
	}

	if (filters.departmentId) {
		andConditions.push({ departmentId: filters.departmentId });
	}

	const where: Prisma.CourseWhereInput = { AND: andConditions };
	const orderBy = {
		[safeSortBy]: sortOrder,
	} as Prisma.CourseOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.course.findMany({
			where,
			skip,
			take: limit,
			orderBy,
			include: { department: { select: DEPARTMENT_SELECT } },
		}),
		prisma.course.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

const getSingleCourse = async (id: string) => {
	const result = await prisma.course.findFirst({
		where: { id, isDeleted: false },
		include: { department: { select: DEPARTMENT_SELECT } },
	});

	if (!result) {
		throw new AppError(httpStatus.NOT_FOUND, "Course not found");
	}

	return result;
};

const updateCourse = async (
	id: string,
	payload: IUpdateCoursePayload,
	actor?: TAuthUser,
) => {
	const existing = await prisma.course.findFirst({
		where: { id, isDeleted: false },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Course not found");
	}

	if (payload.code) {
		const isCodeTaken = await prisma.course.findFirst({
			where: { code: payload.code, isDeleted: false, NOT: { id } },
		});

		if (isCodeTaken) {
			throw new AppError(httpStatus.BAD_REQUEST, "Course code already in use");
		}
	}

	if (payload.departmentId) {
		const isDepartmentExists = await prisma.department.findFirst({
			where: { id: payload.departmentId, isDeleted: false },
		});

		if (!isDepartmentExists) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Selected department does not exist",
			);
		}
	}

	const result = await prisma.course.update({
		where: { id },
		data: payload,
		include: { department: { select: DEPARTMENT_SELECT } },
	});
	await createAuditLog({
		userId: actor?.id,
		action: "COURSE_UPDATED",
		entity: "Course",
		entityId: id,
		details: { ...payload },
	});

	return result;
};

const deleteCourse = async (id: string, actor?: TAuthUser) => {
	const existing = await prisma.course.findFirst({
		where: { id, isDeleted: false },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Course not found");
	}

	const sectionCount = await prisma.section.count({
		where: { courseId: id, isDeleted: false },
	});

	if (sectionCount > 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot delete a course with active sections",
		);
	}

	const result = await prisma.course.update({
		where: { id },
		data: { isDeleted: true, deletedAt: new Date() },
	});

	await createAuditLog({
		userId: actor?.id,
		action: "COURSE_DELETED",
		entity: "Course",
		entityId: id,
	});

	return result;
};

export const CourseService = {
	createCourse,
	getAllCourses,
	getSingleCourse,
	updateCourse,
	deleteCourse,
};
