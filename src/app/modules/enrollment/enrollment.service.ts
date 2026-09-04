import httpStatus from "http-status";
import {
	EnrollmentStatus,
	Grade,
	Prisma,
	Role,
	SemesterStatus,
} from "../../../generated/prisma/index.js";
import type { TAuthUser } from "../../interfaces/index.js";
import prisma from "../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { createAuditLog } from "../../utils/auditLog.js";
import { paginationHelper } from "../../utils/paginationHelper.js";
import type {
	ICreateEnrollmentPayload,
	IEnrollmentFilters,
} from "./enrollment.interface.js";

const ALLOWED_SORT_FIELDS = ["enrolledAt", "createdAt"];

const SECTION_SELECT = {
	id: true,
	sectionCode: true,
	capacity: true,
	course: { select: { id: true, name: true, code: true, credits: true } },
	semester: { select: { id: true, name: true, status: true } },
	instructor: {
		select: {
			id: true,
			instructorId: true,
			user: { select: { name: true, email: true } },
		},
	},
};

const ENROLLMENT_INCLUDE = { section: { select: SECTION_SELECT } };

// ---------------------------------------------------------------------------
// Create (self-service — student enrolls themselves)
// ---------------------------------------------------------------------------
const createEnrollment = async (payload: ICreateEnrollmentPayload, actor: TAuthUser) => {
	const student = await prisma.student.findFirst({
		where: { userId: actor.id, isDeleted: false },
	});

	if (!student) {
		throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
	}

	const result = await prisma.$transaction(
		async (tx) => {
			const section = await tx.section.findFirst({
				where: { id: payload.sectionId, isDeleted: false },
				include: { course: true, semester: true },
			});

			if (!section) {
				throw new AppError(httpStatus.NOT_FOUND, "Section not found");
			}

			if (section.semester.status !== SemesterStatus.ACTIVE) {
				throw new AppError(
					httpStatus.BAD_REQUEST,
					"Registration is only allowed during an active semester",
				);
			}

			// --- Prerequisite check ---
			const prerequisites = await tx.coursePrerequisite.findMany({
				where: { courseId: section.courseId },
			});

			for (const prerequisite of prerequisites) {
				const completedEnrollment = await tx.enrollment.findFirst({
					where: {
						studentId: student.id,
						status: EnrollmentStatus.COMPLETED,
						section: { courseId: prerequisite.prerequisiteCourseId },
						results: { none: { grade: Grade.F } },
					},
				});

				if (!completedEnrollment) {
					const prerequisiteCourse = await tx.course.findUnique({
						where: { id: prerequisite.prerequisiteCourseId },
					});

					throw new AppError(
						httpStatus.BAD_REQUEST,
						`Prerequisite not completed: ${prerequisiteCourse?.name ?? "a required course"}`,
					);
				}
			}

			// --- Capacity check ---
			const activeEnrollmentCount = await tx.enrollment.count({
				where: { sectionId: section.id, status: EnrollmentStatus.ACTIVE },
			});

			if (activeEnrollmentCount >= section.capacity) {
				throw new AppError(httpStatus.BAD_REQUEST, "This section is full");
			}

			// --- Duplicate / re-enrollment check ---
			// Unique constraint is on (studentId, sectionId) regardless of status,
			// so a previously cancelled row must be reactivated, not re-inserted.
			const existingEnrollment = await tx.enrollment.findUnique({
				where: {
					studentId_sectionId: {
						studentId: student.id,
						sectionId: section.id,
					},
				},
			});

			if (existingEnrollment) {
				if (existingEnrollment.status === EnrollmentStatus.ACTIVE) {
					throw new AppError(
						httpStatus.BAD_REQUEST,
						"You are already enrolled in this section",
					);
				}

				if (existingEnrollment.status === EnrollmentStatus.COMPLETED) {
					throw new AppError(
						httpStatus.BAD_REQUEST,
						"You have already completed this section",
					);
				}

				return tx.enrollment.update({
					where: { id: existingEnrollment.id },
					data: {
						status: EnrollmentStatus.ACTIVE,
						enrolledAt: new Date(),
						cancelledAt: null,
					},
				});
			}

			return tx.enrollment.create({
				data: {
					studentId: student.id,
					sectionId: section.id,
					status: EnrollmentStatus.ACTIVE,
				},
			});
		},
		{ isolation: Prisma.TransactionIsolationLevel.Serializable },
	);

	await createAuditLog({
		userId: actor.id,
		action: "ENROLLMENT_CREATED",
		entity: "Enrollment",
		entityId: result.id,
		details: { sectionId: result.sectionId },
	});

	return result;
};

// ---------------------------------------------------------------------------
// My Enrollments (STUDENT, self only)
// ---------------------------------------------------------------------------
const getMyEnrollments = async (userId: string, filters: IEnrollmentFilters) => {
	const student = await prisma.student.findFirst({
		where: { userId, isDeleted: false },
	});

	if (!student) {
		throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
	}

	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt";

	const andConditions: Prisma.EnrollmentWhereInput[] = [{ studentId: student.id }];

	if (filters.status) {
		andConditions.push({ status: filters.status as EnrollmentStatus });
	}

	if (filters.semesterId) {
		andConditions.push({ section: { semesterId: filters.semesterId } });
	}

	const where: Prisma.EnrollmentWhereInput = { AND: andConditions };
	const orderBy = { [safeSortBy]: sortOrder } as Prisma.EnrollmentOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.enrollment.findMany({
			where,
			skip,
			take: limit,
			orderBy,
			include: ENROLLMENT_INCLUDE,
		}),
		prisma.enrollment.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

// ---------------------------------------------------------------------------
// All Enrollments (ADMIN unrestricted; INSTRUCTOR limited to own sections)
// ---------------------------------------------------------------------------
const getAllEnrollments = async (filters: IEnrollmentFilters, actor: TAuthUser) => {
	if (actor.role === Role.INSTRUCTOR) {
		if (!filters.sectionId) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"sectionId is required for instructors to view enrollments",
			);
		}

		const instructor = await prisma.instructor.findFirst({
			where: { userId: actor.id, isDeleted: false },
		});

		if (!instructor) {
			throw new AppError(httpStatus.NOT_FOUND, "Instructor profile not found");
		}

		const section = await prisma.section.findFirst({
			where: { id: filters.sectionId, isDeleted: false },
		});

		if (!section) {
			throw new AppError(httpStatus.NOT_FOUND, "Section not found");
		}

		if (section.instructorId !== instructor.id) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You can only view enrollments for your own sections",
			);
		}
	}

	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt";

	const andConditions: Prisma.EnrollmentWhereInput[] = [];

	if (filters.studentId) {
		andConditions.push({ studentId: filters.studentId });
	}

	if (filters.sectionId) {
		andConditions.push({ sectionId: filters.sectionId });
	}

	if (filters.status) {
		andConditions.push({ status: filters.status as EnrollmentStatus });
	}

	if (filters.semesterId) {
		andConditions.push({ section: { semesterId: filters.semesterId } });
	}

	const where: Prisma.EnrollmentWhereInput = andConditions.length
		? { AND: andConditions }
		: {};
	const orderBy = { [safeSortBy]: sortOrder } as Prisma.EnrollmentOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.enrollment.findMany({
			where,
			skip,
			take: limit,
			orderBy,
			include: {
				...ENROLLMENT_INCLUDE,
				student: {
					select: {
						id: true,
						studentId: true,
						user: { select: { name: true, email: true } },
					},
				},
			},
		}),
		prisma.enrollment.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

// ---------------------------------------------------------------------------
// Cancel (STUDENT — own only; ADMIN — any)
// ---------------------------------------------------------------------------
const cancelEnrollment = async (id: string, actor: TAuthUser) => {
	const enrollment = await prisma.enrollment.findUnique({
		where: { id },
		include: { section: { include: { semester: true } } },
	});

	if (!enrollment) {
		throw new AppError(httpStatus.NOT_FOUND, "Enrollment not found");
	}

	if (actor.role === Role.STUDENT) {
		const student = await prisma.student.findFirst({
			where: { userId: actor.id, isDeleted: false },
		});

		if (!student || enrollment.studentId !== student.id) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You can only cancel your own enrollment",
			);
		}
	}

	if (enrollment.status !== EnrollmentStatus.ACTIVE) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Cannot cancel an enrollment with status ${enrollment.status}`,
		);
	}

	if (enrollment.section.semester.status === SemesterStatus.COMPLETED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot cancel an enrollment for a completed semester",
		);
	}

	const result = await prisma.enrollment.update({
		where: { id },
		data: { status: EnrollmentStatus.CANCELLED, cancelledAt: new Date() },
	});

	await createAuditLog({
		userId: actor.id,
		action: "ENROLLMENT_CANCELLED",
		entity: "Enrollment",
		entityId: id,
		details: { sectionId: enrollment.sectionId },
	});

	return result;
};

export const EnrollmentService = {
	createEnrollment,
	getMyEnrollments,
	getAllEnrollments,
	cancelEnrollment,
};
