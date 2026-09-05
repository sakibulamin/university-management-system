import httpStatus from "http-status";

import type { TAuthUser } from "../../interfaces/index.js";
import prisma from "../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { paginationHelper } from "../../utils/paginationHelper.js";
import type {
	IAssignInstructorPayload,
	ICreateSectionPayload,
	ISectionFilters,
	IUpdateSectionPayload,
} from "./section.interface.js";
import { EnrollmentStatus, UserStatus } from "../../../../generated/prisma/enums.js";
import { Prisma } from "../../../../generated/prisma/client.js";

const ALLOWED_SORT_FIELDS = ["sectionCode", "capacity", "createdAt"];

const COURSE_SELECT = { id: true, name: true, code: true };
const SEMESTER_SELECT = { id: true, name: true, status: true };
const INSTRUCTOR_SELECT = {
	id: true,
	instructorId: true,
	user: { select: { id: true, name: true, email: true } },
};
const SECTION_INCLUDE = {
	course: { select: COURSE_SELECT },
	semester: { select: SEMESTER_SELECT },
	instructor: { select: INSTRUCTOR_SELECT },
};

const assertInstructorIsAssignable = async (instructorId: string) => {
	const instructor = await prisma.instructor.findFirst({
		where: { id: instructorId, isDeleted: false },
		include: { user: true },
	});

	if (!instructor) {
		throw new AppError(httpStatus.BAD_REQUEST, "Selected instructor does not exist");
	}

	if (instructor.user.isDeleted || instructor.user.status !== UserStatus.ACTIVE) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Selected instructor is not active and cannot be assigned",
		);
	}
};

const createSection = async (payload: ICreateSectionPayload, actor?: TAuthUser) => {
	const isCourseExists = await prisma.course.findFirst({
		where: { id: payload.courseId, isDeleted: false },
	});

	if (!isCourseExists) {
		throw new AppError(httpStatus.BAD_REQUEST, "Selected course does not exist");
	}

	const isSemesterExists = await prisma.semester.findUnique({
		where: { id: payload.semesterId },
	});

	if (!isSemesterExists) {
		throw new AppError(httpStatus.BAD_REQUEST, "Selected semester does not exist");
	}

	await assertInstructorIsAssignable(payload.instructorId);

	const isDuplicateSection = await prisma.section.findFirst({
		where: {
			courseId: payload.courseId,
			semesterId: payload.semesterId,
			sectionCode: payload.sectionCode,
			isDeleted: false,
		},
	});

	if (isDuplicateSection) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"A section with this code already exists for this course and semester",
		);
	}

	const result = await prisma.section.create({
		data: {
			courseId: payload.courseId,
			semesterId: payload.semesterId,
			instructorId: payload.instructorId,
			sectionCode: payload.sectionCode,
			capacity: payload.capacity,
			schedule: payload.schedule,
		},
		include: SECTION_INCLUDE,
	});



	return result;
};

const getAllSections = async (filters: ISectionFilters) => {
	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt";

	const andConditions: Prisma.SectionWhereInput[] = [{ isDeleted: false }];

	if (filters.search) {
		andConditions.push({
			sectionCode: { contains: filters.search, mode: "insensitive" },
		});
	}

	if (filters.courseId) {
		andConditions.push({ courseId: filters.courseId });
	}

	if (filters.semesterId) {
		andConditions.push({ semesterId: filters.semesterId });
	}

	if (filters.instructorId) {
		andConditions.push({ instructorId: filters.instructorId });
	}

	const where: Prisma.SectionWhereInput = { AND: andConditions };
	const orderBy = { [safeSortBy]: sortOrder } as Prisma.SectionOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.section.findMany({
			where,
			skip,
			take: limit,
			orderBy,
			include: SECTION_INCLUDE,
		}),
		prisma.section.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

const getSingleSection = async (id: string) => {
	const result = await prisma.section.findFirst({
		where: { id, isDeleted: false },
		include: SECTION_INCLUDE,
	});

	if (!result) {
		throw new AppError(httpStatus.NOT_FOUND, "Section not found");
	}

	return result;
};

const updateSection = async (
	id: string,
	payload: IUpdateSectionPayload,
	actor?: TAuthUser,
) => {
	const existing = await prisma.section.findFirst({
		where: { id, isDeleted: false },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Section not found");
	}

	if (payload.sectionCode) {
		const isDuplicateSection = await prisma.section.findFirst({
			where: {
				courseId: existing.courseId,
				semesterId: existing.semesterId,
				sectionCode: payload.sectionCode,
				isDeleted: false,
				NOT: { id },
			},
		});

		if (isDuplicateSection) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"A section with this code already exists for this course and semester",
			);
		}
	}

	if (payload.capacity !== undefined) {
		const activeEnrollmentCount = await prisma.enrollment.count({
			where: { sectionId: id, status: EnrollmentStatus.ACTIVE },
		});

		if (payload.capacity < activeEnrollmentCount) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Capacity cannot be less than the current active enrollment count (${activeEnrollmentCount})`,
			);
		}
	}

	const result = await prisma.section.update({
		where: { id },
		data: payload,
		include: SECTION_INCLUDE,
	});


	return result;
};

const assignInstructor = async (
	id: string,
	payload: IAssignInstructorPayload,
	actor?: TAuthUser,
) => {
	const existing = await prisma.section.findFirst({
		where: { id, isDeleted: false },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Section not found");
	}

	await assertInstructorIsAssignable(payload.instructorId);

	if (existing.instructorId === payload.instructorId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This instructor is already assigned to this section",
		);
	}

	const result = await prisma.section.update({
		where: { id },
		data: { instructorId: payload.instructorId },
		include: SECTION_INCLUDE,
	});



	return result;
};

const deleteSection = async (id: string, actor?: TAuthUser) => {
	const existing = await prisma.section.findFirst({
		where: { id, isDeleted: false },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Section not found");
	}

	const [enrollmentCount, examCount] = await Promise.all([
		prisma.enrollment.count({ where: { sectionId: id } }),
		prisma.exam.count({ where: { sectionId: id, isDeleted: false } }),
	]);

	if (enrollmentCount > 0 || examCount > 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot delete a section with existing enrollments or exams",
		);
	}

	const result = await prisma.section.update({
		where: { id },
		data: { isDeleted: true, deletedAt: new Date() },
	});


	return result;
};

export const SectionService = {
	createSection,
	getAllSections,
	getSingleSection,
	updateSection,
	assignInstructor,
	deleteSection,
};
