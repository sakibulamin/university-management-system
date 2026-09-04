import httpStatus from "http-status";
import { EnrollmentStatus, Prisma, Role } from "../../../generated/prisma/index.js";
import type { TAuthUser } from "../../interfaces/index.js";
import prisma from "../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { createAuditLog } from "../../utils/auditLog.js";
import { calculateGrade } from "../../utils/gradeCalculator.js";
import { paginationHelper } from "../../utils/paginationHelper.js";
import type {
	IMyResultFilters,
	ISectionResultFilters,
	ISubmitResultPayload,
	IUpdateResultPayload,
} from "./result.interface.js";

const ALLOWED_SORT_FIELDS = ["createdAt", "obtainedMarks"];

const EXAM_SELECT = { id: true, title: true, type: true, totalMarks: true, examDate: true };

const assertInstructorOwnsSection = async (actor: TAuthUser, sectionId: string) => {
	if (actor.role !== Role.INSTRUCTOR) {
		return;
	}

	const instructor = await prisma.instructor.findFirst({
		where: { userId: actor.id, isDeleted: false },
	});

	if (!instructor) {
		throw new AppError(httpStatus.NOT_FOUND, "Instructor profile not found");
	}

	const section = await prisma.section.findFirst({
		where: { id: sectionId, isDeleted: false },
	});

	if (!section || section.instructorId !== instructor.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only manage results for your own sections",
		);
	}
};

// ---------------------------------------------------------------------------
// Submit Result (ADMIN, or INSTRUCTOR for their own section's exam)
// ---------------------------------------------------------------------------
const submitResult = async (payload: ISubmitResultPayload, actor: TAuthUser) => {
	const exam = await prisma.exam.findFirst({
		where: { id: payload.examId, isDeleted: false },
	});

	if (!exam) {
		throw new AppError(httpStatus.BAD_REQUEST, "Selected exam does not exist");
	}

	await assertInstructorOwnsSection(actor, exam.sectionId);

	const enrollment = await prisma.enrollment.findUnique({
		where: { id: payload.enrollmentId },
	});

	if (!enrollment) {
		throw new AppError(httpStatus.BAD_REQUEST, "Selected enrollment does not exist");
	}

	if (enrollment.sectionId !== exam.sectionId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This enrollment does not belong to the exam's section",
		);
	}

	if (enrollment.status === EnrollmentStatus.CANCELLED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot submit a result for a cancelled enrollment",
		);
	}

	if (payload.obtainedMarks > exam.totalMarks) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Obtained marks cannot exceed total marks (${exam.totalMarks})`,
		);
	}

	const isDuplicate = await prisma.result.findUnique({
		where: {
			enrollmentId_examId: {
				enrollmentId: payload.enrollmentId,
				examId: payload.examId,
			},
		},
	});

	if (isDuplicate) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"A result for this student and exam already exists. Use update instead.",
		);
	}

	const percentage = (payload.obtainedMarks / exam.totalMarks) * 100;
	const { grade, gradePoint } = calculateGrade(percentage);

	const result = await prisma.result.create({
		data: {
			enrollmentId: payload.enrollmentId,
			examId: payload.examId,
			obtainedMarks: payload.obtainedMarks,
			grade,
			gradePoint,
			publishedAt: new Date(),
		},
		include: { exam: { select: EXAM_SELECT } },
	});

	await createAuditLog({
		userId: actor.id,
		action: "RESULT_SUBMITTED",
		entity: "Result",
		entityId: result.id,
		details: {
			enrollmentId: result.enrollmentId,
			examId: result.examId,
			obtainedMarks: result.obtainedMarks,
			grade: result.grade,
		},
	});

	return result;
};

// ---------------------------------------------------------------------------
// Update Result (ADMIN, or INSTRUCTOR for their own section's exam)
// ---------------------------------------------------------------------------
const updateResult = async (
	id: string,
	payload: IUpdateResultPayload,
	actor: TAuthUser,
) => {
	const existing = await prisma.result.findUnique({
		where: { id },
		include: { exam: true },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Result not found");
	}

	await assertInstructorOwnsSection(actor, existing.exam.sectionId);

	if (payload.obtainedMarks > existing.exam.totalMarks) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Obtained marks cannot exceed total marks (${existing.exam.totalMarks})`,
		);
	}

	const percentage = (payload.obtainedMarks / existing.exam.totalMarks) * 100;
	const { grade, gradePoint } = calculateGrade(percentage);

	const result = await prisma.result.update({
		where: { id },
		data: { obtainedMarks: payload.obtainedMarks, grade, gradePoint },
		include: { exam: { select: EXAM_SELECT } },
	});

	await createAuditLog({
		userId: actor.id,
		action: "RESULT_UPDATED",
		entity: "Result",
		entityId: id,
		details: { obtainedMarks: result.obtainedMarks, grade: result.grade },
	});

	return result;
};

// ---------------------------------------------------------------------------
// My Results (STUDENT — own only)
// ---------------------------------------------------------------------------
const getMyResults = async (userId: string, filters: IMyResultFilters) => {
	const student = await prisma.student.findFirst({
		where: { userId, isDeleted: false },
	});

	if (!student) {
		throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
	}

	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt";

	const andConditions: Prisma.ResultWhereInput[] = [
		{ enrollment: { studentId: student.id } },
	];

	if (filters.sectionId) {
		andConditions.push({ enrollment: { sectionId: filters.sectionId } });
	}

	const where: Prisma.ResultWhereInput = { AND: andConditions };
	const orderBy = { [safeSortBy]: sortOrder } as Prisma.ResultOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.result.findMany({
			where,
			skip,
			take: limit,
			orderBy,
			include: {
				exam: { select: EXAM_SELECT },
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
		prisma.result.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

// ---------------------------------------------------------------------------
// Section Results (ADMIN unrestricted; INSTRUCTOR own sections only)
// ---------------------------------------------------------------------------
const getSectionResults = async (
	sectionId: string,
	filters: ISectionResultFilters,
	actor: TAuthUser,
) => {
	const section = await prisma.section.findFirst({
		where: { id: sectionId, isDeleted: false },
	});

	if (!section) {
		throw new AppError(httpStatus.NOT_FOUND, "Section not found");
	}

	await assertInstructorOwnsSection(actor, sectionId);

	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt";

	const andConditions: Prisma.ResultWhereInput[] = [{ exam: { sectionId } }];

	if (filters.examId) {
		andConditions.push({ examId: filters.examId });
	}

	if (filters.studentId) {
		andConditions.push({ enrollment: { studentId: filters.studentId } });
	}

	const where: Prisma.ResultWhereInput = { AND: andConditions };
	const orderBy = { [safeSortBy]: sortOrder } as Prisma.ResultOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.result.findMany({
			where,
			skip,
			take: limit,
			orderBy,
			include: {
				exam: { select: EXAM_SELECT },
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
		prisma.result.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

export const ResultService = {
	submitResult,
	updateResult,
	getMyResults,
	getSectionResults,
};
