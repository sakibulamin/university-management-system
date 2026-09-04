import httpStatus from "http-status";
import { type ExamType, Prisma, Role } from "../../../generated/prisma/index.js";
import type { TAuthUser } from "../../interfaces/index.js";
import prisma from "../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { createAuditLog } from "../../utils/auditLog.js";
import { paginationHelper } from "../../utils/paginationHelper.js";
import type {
	ICreateExamPayload,
	IExamFilters,
	IUpdateExamPayload,
} from "./exam.interface.js";

const ALLOWED_SORT_FIELDS = ["examDate", "createdAt"];

const SECTION_SELECT = {
	id: true,
	sectionCode: true,
	course: { select: { id: true, name: true, code: true } },
};

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

	if (!section) {
		throw new AppError(httpStatus.NOT_FOUND, "Section not found");
	}

	if (section.instructorId !== instructor.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only manage exams for your own sections",
		);
	}
};

const createExam = async (payload: ICreateExamPayload, actor: TAuthUser) => {
	const section = await prisma.section.findFirst({
		where: { id: payload.sectionId, isDeleted: false },
	});

	if (!section) {
		throw new AppError(httpStatus.BAD_REQUEST, "Selected section does not exist");
	}

	await assertInstructorOwnsSection(actor, payload.sectionId);

	const result = await prisma.exam.create({
		data: {
			sectionId: payload.sectionId,
			title: payload.title,
			type: payload.type,
			totalMarks: payload.totalMarks,
			examDate: payload.examDate,
		},
		include: { section: { select: SECTION_SELECT } },
	});

	await createAuditLog({
		userId: actor.id,
		action: "EXAM_CREATED",
		entity: "Exam",
		entityId: result.id,
		details: { sectionId: result.sectionId, type: result.type },
	});

	return result;
};

const getAllExams = async (filters: IExamFilters) => {
	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt";

	const andConditions: Prisma.ExamWhereInput[] = [{ isDeleted: false }];

	if (filters.sectionId) {
		andConditions.push({ sectionId: filters.sectionId });
	}

	if (filters.type) {
		andConditions.push({ type: filters.type as ExamType });
	}

	const where: Prisma.ExamWhereInput = { AND: andConditions };
	const orderBy = { [safeSortBy]: sortOrder } as Prisma.ExamOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.exam.findMany({
			where,
			skip,
			take: limit,
			orderBy,
			include: { section: { select: SECTION_SELECT } },
		}),
		prisma.exam.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

const getSingleExam = async (id: string) => {
	const result = await prisma.exam.findFirst({
		where: { id, isDeleted: false },
		include: { section: { select: SECTION_SELECT } },
	});

	if (!result) {
		throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
	}

	return result;
};

const updateExam = async (id: string, payload: IUpdateExamPayload, actor: TAuthUser) => {
	const existing = await prisma.exam.findFirst({
		where: { id, isDeleted: false },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
	}

	await assertInstructorOwnsSection(actor, existing.sectionId);

	if (payload.totalMarks !== undefined) {
		const highestObtainedMarks = await prisma.result.findFirst({
			where: { examId: id },
			orderBy: { obtainedMarks: "desc" },
			select: { obtainedMarks: true },
		});

		if (highestObtainedMarks && payload.totalMarks < highestObtainedMarks.obtainedMarks) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Total marks cannot be less than an already-submitted result's obtained marks",
			);
		}
	}

	const result = await prisma.exam.update({
		where: { id },
		data: payload,
		include: { section: { select: SECTION_SELECT } },
	});

	await createAuditLog({
		userId: actor.id,
		action: "EXAM_UPDATED",
		entity: "Exam",
		entityId: id,
		details: { ...payload },
	});

	return result;
};

export const ExamService = {
	createExam,
	getAllExams,
	getSingleExam,
	updateExam,
};
