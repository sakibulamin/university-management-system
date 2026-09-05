import httpStatus from "http-status";

import type { TAuthUser } from "../../interfaces/index.js";
import prisma from "../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { createAuditLog } from "../../utils/auditLog.js";
import { paginationHelper } from "../../utils/paginationHelper.js";
import type {
	ICreateDepartmentPayload,
	IDepartmentFilters,
	IUpdateDepartmentPayload,
} from "./department.interface.js";
import { Prisma } from "../../../../generated/prisma/client.js";


const ALLOWED_SORT_FIELDS = ["name", "code", "createdAt"];

const createDepartment = async (payload: ICreateDepartmentPayload, actor?: TAuthUser) => {
	const isDepartmentExists = await prisma.department.findFirst({
		where: { code: payload.code, isDeleted: false },
	});

	if (isDepartmentExists) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Department with this code already exists",
		);
	}

	const result = await prisma.department.create({
		data: payload,
	});

	

	return result;
};

const getAllDepartments = async (filters: IDepartmentFilters) => {
	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt";

	const andConditions: Prisma.DepartmentWhereInput[] = [{ isDeleted: false }];

	if (filters.search) {
		andConditions.push({
			OR: [
				{ name: { contains: filters.search, mode: "insensitive" } },
				{ code: { contains: filters.search, mode: "insensitive" } },
			],
		});
	}

	const where: Prisma.DepartmentWhereInput = { AND: andConditions };
	const orderBy = {
		[safeSortBy]: sortOrder,
	} as Prisma.DepartmentOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.department.findMany({ where, skip, take: limit, orderBy }),
		prisma.department.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

const getSingleDepartment = async (id: string) => {
	const result = await prisma.department.findFirst({
		where: { id, isDeleted: false },
	});

	if (!result) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	return result;
};

const updateDepartment = async (
	id: string,
	payload: IUpdateDepartmentPayload,
	actor?: TAuthUser,
) => {
	const existing = await prisma.department.findFirst({
		where: { id, isDeleted: false },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	if (payload.code) {
		const isCodeTaken = await prisma.department.findFirst({
			where: { code: payload.code, isDeleted: false, NOT: { id } },
		});

		if (isCodeTaken) {
			throw new AppError(httpStatus.BAD_REQUEST, "Department code already in use");
		}
	}

	const result = await prisma.department.update({
		where: { id },
		data: payload,
	});



	return result;
};

const deleteDepartment = async (id: string, actor?: TAuthUser) => {
	const existing = await prisma.department.findFirst({
		where: { id, isDeleted: false },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	const [programCount, courseCount, instructorCount] = await Promise.all([
		prisma.program.count({ where: { departmentId: id, isDeleted: false } }),
		prisma.course.count({ where: { departmentId: id, isDeleted: false } }),
		prisma.instructor.count({ where: { departmentId: id, isDeleted: false } }),
	]);

	if (programCount > 0 || courseCount > 0 || instructorCount > 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot delete a department with active programs, courses, or instructors",
		);
	}

	const result = await prisma.department.update({
		where: { id },
		data: { isDeleted: true, deletedAt: new Date() },
	});

	

	return result;
};

export const DepartmentService = {
	createDepartment,
	getAllDepartments,
	getSingleDepartment,
	updateDepartment,
	deleteDepartment,
};
