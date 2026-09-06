import httpStatus from "http-status";

import type { TAuthUser } from "../../interfaces/index.js";
import prisma from "../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { paginationHelper } from "../../utils/paginationHelper.js";
import type {
	IAdminUpdateStudentPayload,
	IStudentFilters,
	IUpdateMyStudentProfilePayload,
} from "./student.interface.js";

import { createAuditLog } from "../../utils/auditLog.js";
import { Prisma } from "../../../../generated/prisma/client.js";

const ALLOWED_SORT_FIELDS = ["studentId", "createdAt"];

const USER_SELECT = {
	id: true,
	name: true,
	email: true,
	role: true,
	status: true,
};
const PROGRAM_SELECT = { id: true, name: true, code: true };
const PROGRAM_WITH_DEPARTMENT_SELECT = {
	id: true,
	name: true,
	code: true,
	department: { select: { id: true, name: true, code: true } },
};

const STUDENT_INCLUDE = {
	user: { select: USER_SELECT },
	program: { select: PROGRAM_SELECT },
};

const getAllStudents = async (filters: IStudentFilters) => {
	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy)
		? sortBy
		: "createdAt";

	const andConditions: Prisma.StudentWhereInput[] = [{ isDeleted: false }];

	if (filters.search) {
		andConditions.push({
			OR: [
				{ studentId: { contains: filters.search, mode: "insensitive" } },
				{ user: { name: { contains: filters.search, mode: "insensitive" } } },
				{ user: { email: { contains: filters.search, mode: "insensitive" } } },
			],
		});
	}

	if (filters.programId) {
		andConditions.push({ programId: filters.programId });
	}

	const where: Prisma.StudentWhereInput = { AND: andConditions };
	const orderBy = {
		[safeSortBy]: sortOrder,
	} as Prisma.StudentOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.student.findMany({
			where,
			skip,
			take: limit,
			orderBy,
			include: STUDENT_INCLUDE,
		}),
		prisma.student.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

const getSingleStudent = async (id: string) => {
	const result = await prisma.student.findFirst({
		where: { id, isDeleted: false },
		include: STUDENT_INCLUDE,
	});

	if (!result) {
		throw new AppError(httpStatus.NOT_FOUND, "Student not found");
	}

	return result;
};

const getMyStudentProfile = async (userId: string) => {
	const result = await prisma.student.findFirst({
		where: { userId, isDeleted: false },
		include: {
			user: { select: USER_SELECT },
			program: { select: PROGRAM_WITH_DEPARTMENT_SELECT },
		},
	});

	if (!result) {
		throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
	}

	return result;
};

const updateMyStudentProfile = async (
	userId: string,
	payload: IUpdateMyStudentProfilePayload,
	actor: TAuthUser,
) => {
	const existing = await prisma.student.findFirst({
		where: { userId, isDeleted: false },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
	}

	const result = await prisma.student.update({
		where: { id: existing.id },
		data: {
			phone: payload.phone,
			address: payload.address,
			dateOfBirth: payload.dateOfBirth,
			profileImage: payload.profileImage,
		},
		include: {
			user: { select: USER_SELECT },
			program: { select: PROGRAM_WITH_DEPARTMENT_SELECT },
		},
	});

	await createAuditLog({
		userId: actor.id,
		action: "UPDATE_STUDENT_PROFILE",
		entity: "Student",
		entityId: result.id,
		details: { ...payload },
	});

	return result;
};

const adminUpdateStudent = async (
	id: string,
	payload: IAdminUpdateStudentPayload,
	actor?: TAuthUser,
) => {
	const existing = await prisma.student.findFirst({
		where: { id, isDeleted: false },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Student not found");
	}

	if (payload.programId) {
		const isProgramExists = await prisma.program.findFirst({
			where: { id: payload.programId, isDeleted: false },
		});

		if (!isProgramExists) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Selected program does not exist",
			);
		}
	}

	const result = await prisma.student.update({
		where: { id },
		data: payload,
		include: STUDENT_INCLUDE,
	});

	await createAuditLog({
		userId: actor?.id,
		action: "ADMIN_UPDATE_STUDENT",
		entity: "Student",
		entityId: id,
		details: { ...payload },
	});

	return result;
};

const deleteStudent = async (id: string, actor?: TAuthUser) => {
	const existing = await prisma.student.findFirst({
		where: { id, isDeleted: false },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Student not found");
	}

	const result = await prisma.student.update({
		where: { id },
		data: { isDeleted: true, deletedAt: new Date() },
	});

	return result;
};

export const StudentService = {
	getAllStudents,
	getSingleStudent,
	getMyStudentProfile,
	updateMyStudentProfile,
	adminUpdateStudent,
	deleteStudent,
};
