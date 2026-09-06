import crypto from "node:crypto";
import httpStatus from "http-status";

import type { TAuthUser } from "../../interfaces/index.js";
import prisma from "../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { paginationHelper } from "../../utils/paginationHelper.js";
import type {
	ICreateInstructorPayload,
	IInstructorFilters,
	IUpdateInstructorPayload,
} from "./instructor.interface.js";
import { Role } from "../../../../generated/prisma/enums.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import { createAuditLog } from "../../utils/auditLog.js";

const ALLOWED_SORT_FIELDS = ["instructorId", "createdAt"];

const USER_SELECT = {
	id: true,
	name: true,
	email: true,
	role: true,
	status: true,
};
const DEPARTMENT_SELECT = { id: true, name: true, code: true };
const INSTRUCTOR_INCLUDE = {
	user: { select: USER_SELECT },
	department: { select: DEPARTMENT_SELECT },
};

const generateInstructorId = async () => {
	const year = new Date().getFullYear();
	let instructorId = "";
	let isUnique = false;

	while (!isUnique) {
		const randomPart = crypto.randomInt(1000, 9999);
		instructorId = `INS-${year}-${randomPart}`;

		const existing = await prisma.instructor.findUnique({
			where: { instructorId },
		});
		isUnique = !existing;
	}

	return instructorId;
};

const createInstructor = async (
	payload: ICreateInstructorPayload,
	actor?: TAuthUser,
) => {
	const user = await prisma.user.findUnique({ where: { id: payload.userId } });

	if (!user || user.isDeleted) {
		throw new AppError(httpStatus.BAD_REQUEST, "Selected user does not exist");
	}

	if (user.role !== Role.INSTRUCTOR) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Selected user does not have the INSTRUCTOR role",
		);
	}

	const isProfileExists = await prisma.instructor.findUnique({
		where: { userId: payload.userId },
	});

	if (isProfileExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"An instructor profile already exists for this user",
		);
	}

	const isDepartmentExists = await prisma.department.findFirst({
		where: { id: payload.departmentId, isDeleted: false },
	});

	if (!isDepartmentExists) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Selected department does not exist",
		);
	}

	const instructorId = await generateInstructorId();

	const result = await prisma.instructor.create({
		data: {
			userId: payload.userId,
			instructorId,
			departmentId: payload.departmentId,
			designation: payload.designation,
			phone: payload.phone,
			profileImage: payload.profileImage,
		},
		include: INSTRUCTOR_INCLUDE,
	});
	await createAuditLog({
		userId: actor?.id,
		action: "CREATE_INSTRUCTOR",
		entity: "Instructor",
		entityId: result.id,
		details: {
			instructorId: result.instructorId,
			departmentId: result.departmentId,
		},
	});
	return result;
};

const getAllInstructors = async (filters: IInstructorFilters) => {
	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy)
		? sortBy
		: "createdAt";

	const andConditions: Prisma.InstructorWhereInput[] = [{ isDeleted: false }];

	if (filters.search) {
		andConditions.push({
			OR: [
				{ instructorId: { contains: filters.search, mode: "insensitive" } },
				{ user: { name: { contains: filters.search, mode: "insensitive" } } },
				{ user: { email: { contains: filters.search, mode: "insensitive" } } },
			],
		});
	}

	if (filters.departmentId) {
		andConditions.push({ departmentId: filters.departmentId });
	}

	const where: Prisma.InstructorWhereInput = { AND: andConditions };
	const orderBy = {
		[safeSortBy]: sortOrder,
	} as Prisma.InstructorOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.instructor.findMany({
			where,
			skip,
			take: limit,
			orderBy,
			include: INSTRUCTOR_INCLUDE,
		}),
		prisma.instructor.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

const getSingleInstructor = async (id: string) => {
	const result = await prisma.instructor.findFirst({
		where: { id, isDeleted: false },
		include: INSTRUCTOR_INCLUDE,
	});

	if (!result) {
		throw new AppError(httpStatus.NOT_FOUND, "Instructor not found");
	}

	return result;
};

const getMyInstructorProfile = async (userId: string) => {
	const result = await prisma.instructor.findFirst({
		where: { userId, isDeleted: false },
		include: INSTRUCTOR_INCLUDE,
	});

	if (!result) {
		throw new AppError(httpStatus.NOT_FOUND, "Instructor profile not found");
	}

	return result;
};

const updateInstructor = async (
	id: string,
	payload: IUpdateInstructorPayload,
	actor?: TAuthUser,
) => {
	const existing = await prisma.instructor.findFirst({
		where: { id, isDeleted: false },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Instructor not found");
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

	const result = await prisma.instructor.update({
		where: { id },
		data: payload,
		include: INSTRUCTOR_INCLUDE,
	});

	await createAuditLog({
		userId: actor?.id,
		action: "UPDATE_INSTRUCTOR",
		entity: "Instructor",
		entityId: id,
		details: { ...payload },
	});

	return result;
};

const deleteInstructor = async (id: string, actor?: TAuthUser) => {
	const existing = await prisma.instructor.findFirst({
		where: { id, isDeleted: false },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Instructor not found");
	}

	const activeSectionCount = await prisma.section.count({
		where: { instructorId: id, isDeleted: false },
	});

	if (activeSectionCount > 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot delete an instructor with active section assignments. Reassign sections first.",
		);
	}

	const result = await prisma.instructor.update({
		where: { id },
		data: { isDeleted: true, deletedAt: new Date() },
	});

	await createAuditLog({
		userId: actor?.id,
		action: "DELETE_INSTRUCTOR",
		entity: "Instructor",
		entityId: id,
	});
	return result;
};

export const InstructorService = {
	createInstructor,
	getAllInstructors,
	getSingleInstructor,
	getMyInstructorProfile,
	updateInstructor,
	deleteInstructor,
};
