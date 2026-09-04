import httpStatus from "http-status";
import { EnrollmentStatus, Prisma, Role } from "../../../generated/prisma/index.js";
import type { TAuthUser } from "../../interfaces/index.js";
import prisma from "../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { createAuditLog } from "../../utils/auditLog.js";
import { paginationHelper } from "../../utils/paginationHelper.js";
import type {
	ICreateAttendancePayload,
	IMyAttendanceFilters,
	ISectionAttendanceFilters,
	IUpdateAttendancePayload,
} from "./attendance.interface.js";

const ALLOWED_SORT_FIELDS = ["date", "createdAt"];

const buildDateRangeFilter = (from?: string, to?: string) => {
	if (!from && !to) {
		return undefined;
	}

	return {
		...(from && { gte: new Date(from) }),
		...(to && { lte: new Date(to) }),
	};
};

// ---------------------------------------------------------------------------
// Mark Attendance (INSTRUCTOR — own sections only)
// ---------------------------------------------------------------------------
const markAttendance = async (payload: ICreateAttendancePayload, actor: TAuthUser) => {
	const instructor = await prisma.instructor.findFirst({
		where: { userId: actor.id, isDeleted: false },
	});

	if (!instructor) {
		throw new AppError(httpStatus.NOT_FOUND, "Instructor profile not found");
	}

	const enrollment = await prisma.enrollment.findUnique({
		where: { id: payload.enrollmentId },
		include: { section: { include: { semester: true } } },
	});

	if (!enrollment) {
		throw new AppError(httpStatus.NOT_FOUND, "Enrollment not found");
	}

	if (enrollment.section.instructorId !== instructor.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only mark attendance for your own sections",
		);
	}

	if (enrollment.status !== EnrollmentStatus.ACTIVE) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot mark attendance for an enrollment that is not active",
		);
	}

	const attendanceDate = new Date(payload.date);

	if (
		attendanceDate < enrollment.section.semester.startDate ||
		attendanceDate > enrollment.section.semester.endDate
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Attendance date must fall within the section's semester",
		);
	}

	const isDuplicate = await prisma.attendance.findUnique({
		where: {
			enrollmentId_date: {
				enrollmentId: payload.enrollmentId,
				date: attendanceDate,
			},
		},
	});

	if (isDuplicate) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Attendance for this student on this date is already marked. Use update instead.",
		);
	}

	const result = await prisma.attendance.create({
		data: {
			enrollmentId: payload.enrollmentId,
			date: attendanceDate,
			status: payload.status,
		},
	});

	await createAuditLog({
		userId: actor.id,
		action: "ATTENDANCE_MARKED",
		entity: "Attendance",
		entityId: result.id,
		details: {
			enrollmentId: result.enrollmentId,
			date: result.date,
			status: result.status,
		},
	});

	return result;
};

// ---------------------------------------------------------------------------
// Update Attendance (INSTRUCTOR — own sections only)
// ---------------------------------------------------------------------------
const updateAttendance = async (
	id: string,
	payload: IUpdateAttendancePayload,
	actor: TAuthUser,
) => {
	const instructor = await prisma.instructor.findFirst({
		where: { userId: actor.id, isDeleted: false },
	});

	if (!instructor) {
		throw new AppError(httpStatus.NOT_FOUND, "Instructor profile not found");
	}

	const attendance = await prisma.attendance.findUnique({
		where: { id },
		include: { enrollment: { include: { section: true } } },
	});

	if (!attendance) {
		throw new AppError(httpStatus.NOT_FOUND, "Attendance record not found");
	}

	if (attendance.enrollment.section.instructorId !== instructor.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only update attendance for your own sections",
		);
	}

	const result = await prisma.attendance.update({
		where: { id },
		data: { status: payload.status },
	});

	await createAuditLog({
		userId: actor.id,
		action: "ATTENDANCE_UPDATED",
		entity: "Attendance",
		entityId: id,
		details: { status: payload.status },
	});

	return result;
};

// ---------------------------------------------------------------------------
// My Attendance (STUDENT — own only)
// ---------------------------------------------------------------------------
const getMyAttendance = async (userId: string, filters: IMyAttendanceFilters) => {
	const student = await prisma.student.findFirst({
		where: { userId, isDeleted: false },
	});

	if (!student) {
		throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
	}

	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "date";

	const andConditions: Prisma.AttendanceWhereInput[] = [
		{ enrollment: { studentId: student.id } },
	];

	if (filters.sectionId) {
		andConditions.push({ enrollment: { sectionId: filters.sectionId } });
	}

	const dateFilter = buildDateRangeFilter(filters.from, filters.to);

	if (dateFilter) {
		andConditions.push({ date: dateFilter });
	}

	const where: Prisma.AttendanceWhereInput = { AND: andConditions };
	const orderBy = { [safeSortBy]: sortOrder } as Prisma.AttendanceOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.attendance.findMany({
			where,
			skip,
			take: limit,
			orderBy,
			include: {
				enrollment: {
					select: {
						id: true,
						section: {
							select: {
								id: true,
								sectionCode: true,
								course: { select: { id: true, name: true, code: true } },
							},
						},
					},
				},
			},
		}),
		prisma.attendance.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

// ---------------------------------------------------------------------------
// Section Attendance (ADMIN unrestricted; INSTRUCTOR own sections only)
// ---------------------------------------------------------------------------
const getSectionAttendance = async (
	sectionId: string,
	filters: ISectionAttendanceFilters,
	actor: TAuthUser,
) => {
	const section = await prisma.section.findFirst({
		where: { id: sectionId, isDeleted: false },
	});

	if (!section) {
		throw new AppError(httpStatus.NOT_FOUND, "Section not found");
	}

	if (actor.role === Role.INSTRUCTOR) {
		const instructor = await prisma.instructor.findFirst({
			where: { userId: actor.id, isDeleted: false },
		});

		if (!instructor || section.instructorId !== instructor.id) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You can only view attendance for your own sections",
			);
		}
	}

	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "date";

	const andConditions: Prisma.AttendanceWhereInput[] = [{ enrollment: { sectionId } }];

	if (filters.studentId) {
		andConditions.push({ enrollment: { studentId: filters.studentId } });
	}

	const dateFilter = buildDateRangeFilter(filters.from, filters.to);

	if (dateFilter) {
		andConditions.push({ date: dateFilter });
	}

	const where: Prisma.AttendanceWhereInput = { AND: andConditions };
	const orderBy = { [safeSortBy]: sortOrder } as Prisma.AttendanceOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.attendance.findMany({
			where,
			skip,
			take: limit,
			orderBy,
			include: {
				enrollment: {
					select: {
						id: true,
						student: {
							select: {
								id: true,
								studentId: true,
								user: { select: { name: true, email: true } },
							},
						},
					},
				},
			},
		}),
		prisma.attendance.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

export const AttendanceService = {
	markAttendance,
	updateAttendance,
	getMyAttendance,
	getSectionAttendance,
};
