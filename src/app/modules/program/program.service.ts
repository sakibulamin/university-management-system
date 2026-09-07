import httpStatus from "http-status";

import type { TAuthUser } from "../../interfaces/index.js";
import prisma from "../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { paginationHelper } from "../../utils/paginationHelper.js";
import type {
	ICreateProgramPayload,
	IProgramFilters,
	IUpdateProgramPayload,
} from "./program.interface.js";
import type { Prisma } from "../../../../generated/prisma/client.js";
import { createAuditLog } from "../../utils/auditLog.js";

const ALLOWED_SORT_FIELDS = ["name", "code", "createdAt"];

const DEPARTMENT_SELECT = { id: true, name: true, code: true };

const createProgram = async (
	payload: ICreateProgramPayload,
	actor?: TAuthUser,
) => {
	const isDepartmentExists = await prisma.department.findFirst({
		where: { id: payload.departmentId, isDeleted: false },
	});

	if (!isDepartmentExists) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Selected department does not exist",
		);
	}

	const isProgramExists = await prisma.program.findFirst({
		where: { code: payload.code, isDeleted: false },
	});

	if (isProgramExists) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Program with this code already exists",
		);
	}

	const result = await prisma.program.create({
		data: payload,
		include: { department: { select: DEPARTMENT_SELECT } },
	});
	await createAuditLog({
		userId: actor?.id,
		action: "PROGRAM_CREATED",
		entity: "Program",
		entityId: result.id,
		details: {
			name: result.name,
			code: result.code,
			departmentId: result.departmentId,
		},
	});

	return result;
};

const getAllPrograms = async (filters: IProgramFilters) => {
	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy)
		? sortBy
		: "createdAt";

	const andConditions: Prisma.ProgramWhereInput[] = [{ isDeleted: false }];

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

	const where: Prisma.ProgramWhereInput = { AND: andConditions };
	const orderBy = {
		[safeSortBy]: sortOrder,
	} as Prisma.ProgramOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.program.findMany({
			where,
			skip,
			take: limit,
			orderBy,
			include: { department: { select: DEPARTMENT_SELECT } },
		}),
		prisma.program.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

const getSingleProgram = async (id: string) => {
	const result = await prisma.program.findFirst({
		where: { id, isDeleted: false },
		include: { department: { select: DEPARTMENT_SELECT } },
	});

	if (!result) {
		throw new AppError(httpStatus.NOT_FOUND, "Program not found");
	}

	return result;
};

const updateProgram = async (
	id: string,
	payload: IUpdateProgramPayload,
	actor?: TAuthUser,
) => {
	const existing = await prisma.program.findFirst({
		where: { id, isDeleted: false },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Program not found");
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

	if (payload.code) {
		const isCodeTaken = await prisma.program.findFirst({
			where: { code: payload.code, isDeleted: false, NOT: { id } },
		});

		if (isCodeTaken) {
			throw new AppError(httpStatus.BAD_REQUEST, "Program code already in use");
		}
	}

	const result = await prisma.program.update({
		where: { id },
		data: payload,
		include: { department: { select: DEPARTMENT_SELECT } },
	});

	await createAuditLog({
		userId: actor?.id,
		action: "PROGRAM_UPDATED",
		entity: "Program",
		entityId: id,
		details: { ...payload },
	});
	return result;
};

const deleteProgram = async (id: string, actor?: TAuthUser) => {
	const existing = await prisma.program.findFirst({
		where: { id, isDeleted: false },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Program not found");
	}

	const studentCount = await prisma.student.count({
		where: { programId: id, isDeleted: false },
	});

	if (studentCount > 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot delete a program with active students",
		);
	}

	const result = await prisma.program.update({
		where: { id },
		data: { isDeleted: true, deletedAt: new Date() },
	});

	await createAuditLog({
		userId: actor?.id,
		action: "PROGRAM_DELETED",
		entity: "Program",
		entityId: id,
	});

	return result;
};

export const ProgramService = {
	createProgram,
	getAllPrograms,
	getSingleProgram,
	updateProgram,
	deleteProgram,
};
