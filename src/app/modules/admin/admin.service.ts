import httpStatus from "http-status";

import type { TAuthUser } from "../../interfaces/index.js";

import AppError from "../../utils/AppError.js";
import { createAuditLog } from "../../utils/auditLog.js";
import { paginationHelper } from "../../utils/paginationHelper.js";
import {
	type Prisma,
	type Role,
	UserStatus,
} from "../../../../generated/prisma/client.js";
import type {
	IAuditLogFilters,
	IUpdateUserRolePayload,
	IUserFilters,
} from "./admin.interface.js";
import prisma from "../../lib/prisma.js";
import { redisClient } from "../../lib/redis.js";

const USER_SORT_FIELDS = ["name", "email", "createdAt"];
const AUDIT_LOG_SORT_FIELDS = ["createdAt"];

const DASHBOARD_CACHE_KEY = "admin:dashboard-stats";
const DASHBOARD_CACHE_TTL_SECONDS = 30;

const USER_SELECT = {
	id: true,
	name: true,
	email: true,
	role: true,
	status: true,
	authProvider: true,
	emailVerified: true,
	isDeleted: true,
	deletedAt: true,
	createdAt: true,
	updatedAt: true,
};

const getAllUsers = async (filters: IUserFilters) => {
	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = USER_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt";

	const andConditions: Prisma.UserWhereInput[] = [{ isDeleted: false }];

	if (filters.search) {
		andConditions.push({
			OR: [
				{ name: { contains: filters.search, mode: "insensitive" } },
				{ email: { contains: filters.search, mode: "insensitive" } },
			],
		});
	}

	if (filters.role) {
		andConditions.push({ role: filters.role as Role });
	}

	if (filters.status) {
		andConditions.push({ status: filters.status as UserStatus });
	}

	const where: Prisma.UserWhereInput = { AND: andConditions };
	const orderBy = {
		[safeSortBy]: sortOrder,
	} as Prisma.UserOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.user.findMany({
			where,
			skip,
			take: limit,
			orderBy,
			select: USER_SELECT,
		}),
		prisma.user.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

const updateUserRole = async (
	id: string,
	payload: IUpdateUserRolePayload,
	actor: TAuthUser,
) => {
	if (actor.id === id) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"You cannot change your own role",
		);
	}

	const user = await prisma.user.findFirst({ where: { id, isDeleted: false } });

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	if (user.role === payload.role) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`User already has the role ${payload.role}`,
		);
	}

	const result = await prisma.user.update({
		where: { id },
		data: { role: payload.role },
		select: USER_SELECT,
	});

	await createAuditLog({
		userId: actor.id,
		action: "USER_ROLE_CHANGED",
		entity: "User",
		entityId: id,
		details: { from: user.role, to: payload.role },
	});

	return result;
};

const blockUser = async (id: string, actor: TAuthUser) => {
	if (actor.id === id) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"You cannot block your own account",
		);
	}

	const user = await prisma.user.findFirst({ where: { id, isDeleted: false } });

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new AppError(httpStatus.BAD_REQUEST, "User is already blocked");
	}

	const result = await prisma.user.update({
		where: { id },
		data: { status: UserStatus.BLOCKED },
		select: USER_SELECT,
	});

	await createAuditLog({
		userId: actor.id,
		action: "USER_BLOCKED",
		entity: "User",
		entityId: id,
	});

	return result;
};

const unblockUser = async (id: string, actor: TAuthUser) => {
	const user = await prisma.user.findFirst({ where: { id, isDeleted: false } });

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	if (user.status !== UserStatus.BLOCKED) {
		throw new AppError(httpStatus.BAD_REQUEST, "User is not blocked");
	}

	const result = await prisma.user.update({
		where: { id },
		data: { status: UserStatus.ACTIVE },
		select: USER_SELECT,
	});

	await createAuditLog({
		userId: actor.id,
		action: "USER_UNBLOCKED",
		entity: "User",
		entityId: id,
	});

	return result;
};

const deleteUser = async (id: string, actor: TAuthUser) => {
	if (actor.id === id) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"You cannot delete your own account",
		);
	}

	const user = await prisma.user.findFirst({ where: { id, isDeleted: false } });

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const result = await prisma.user.update({
		where: { id },
		data: {
			isDeleted: true,
			deletedAt: new Date(),
			status: UserStatus.DELETED,
		},
		select: USER_SELECT,
	});

	await createAuditLog({
		userId: actor.id,
		action: "USER_DELETED",
		entity: "User",
		entityId: id,
	});

	return result;
};

const getDashboardStats = async () => {
	const cached = await redisClient.get(DASHBOARD_CACHE_KEY).catch(() => null);

	if (cached) {
		return JSON.parse(cached);
	}

	const [
		totalStudents,
		totalInstructors,
		totalDepartments,
		totalCourses,
		activeEnrollments,
	] = await Promise.all([
		prisma.student.count({ where: { isDeleted: false } }),
		prisma.instructor.count({ where: { isDeleted: false } }),
		prisma.department.count({ where: { isDeleted: false } }),
		prisma.course.count({ where: { isDeleted: false } }),
		prisma.user.count({
			where: { status: UserStatus.BLOCKED, isDeleted: false },
		}),
	]);

	const stats = {
		totalStudents,
		totalInstructors,
		totalDepartments,
		totalCourses
	};

	await redisClient
		.setEx(
			DASHBOARD_CACHE_KEY,
			DASHBOARD_CACHE_TTL_SECONDS,
			JSON.stringify(stats),
		)
		.catch(() => undefined);

	return stats;
};

const getAuditLogs = async (filters: IAuditLogFilters) => {
	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = AUDIT_LOG_SORT_FIELDS.includes(sortBy)
		? sortBy
		: "createdAt";

	const andConditions: Prisma.AuditLogWhereInput[] = [];

	if (filters.userId) {
		andConditions.push({ userId: filters.userId });
	}

	if (filters.entity) {
		andConditions.push({ entity: filters.entity });
	}

	if (filters.action) {
		andConditions.push({ action: filters.action });
	}

	const where: Prisma.AuditLogWhereInput = andConditions.length
		? { AND: andConditions }
		: {};
	const orderBy = {
		[safeSortBy]: sortOrder,
	} as Prisma.AuditLogOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.auditLog.findMany({
			where,
			skip,
			take: limit,
			orderBy,
			include: { user: { select: { id: true, name: true, email: true } } },
		}),
		prisma.auditLog.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

export const AdminService = {
	getAllUsers,
	updateUserRole,
	blockUser,
	unblockUser,
	deleteUser,
	getDashboardStats,
	getAuditLogs,
};
