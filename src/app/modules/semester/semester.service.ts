import httpStatus from "http-status";
import type { TAuthUser } from "../../interfaces/index.js";
import prisma from "../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { paginationHelper } from "../../utils/paginationHelper.js";
import type {
	ICreateSemesterPayload,
	ISemesterFilters,
	IUpdateSemesterPayload,
	IUpdateSemesterStatusPayload,
} from "./semester.interface.js";
import { SemesterStatus } from "../../../../generated/prisma/enums.js";
import { Prisma } from "../../../../generated/prisma/client.js";

const ALLOWED_SORT_FIELDS = ["name", "startDate", "endDate", "createdAt"];

const VALID_TRANSITIONS: Record<SemesterStatus, SemesterStatus[]> = {
	[SemesterStatus.UPCOMING]: [SemesterStatus.ACTIVE],
	[SemesterStatus.ACTIVE]: [SemesterStatus.COMPLETED],
	[SemesterStatus.COMPLETED]: [],
};

const createSemester = async (payload: ICreateSemesterPayload, actor?: TAuthUser) => {
	const isSemesterExists = await prisma.semester.findUnique({
		where: { name: payload.name },
	});

	if (isSemesterExists) {
		throw new AppError(httpStatus.BAD_REQUEST, "A semester with this name already exists");
	}

	const result = await prisma.semester.create({
		data: {
			name: payload.name,
			startDate: payload.startDate,
			endDate: payload.endDate,
		},
	});



	return result;
};

const getAllSemesters = async (filters: ISemesterFilters) => {
	const { page, limit, skip, sortBy, sortOrder } =
		paginationHelper.calculatePagination(filters);
	const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt";

	const andConditions: Prisma.SemesterWhereInput[] = [];

	if (filters.search) {
		andConditions.push({ name: { contains: filters.search, mode: "insensitive" } });
	}

	if (filters.status) {
		andConditions.push({ status: filters.status as SemesterStatus });
	}

	const where: Prisma.SemesterWhereInput = andConditions.length ? { AND: andConditions } : {};
	const orderBy = { [safeSortBy]: sortOrder } as Prisma.SemesterOrderByWithRelationInput;

	const [data, total] = await Promise.all([
		prisma.semester.findMany({ where, skip, take: limit, orderBy }),
		prisma.semester.count({ where }),
	]);

	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data,
	};
};

const getSingleSemester = async (id: string) => {
	const result = await prisma.semester.findUnique({ where: { id } });

	if (!result) {
		throw new AppError(httpStatus.NOT_FOUND, "Semester not found");
	}

	return result;
};

const updateSemester = async (
	id: string,
	payload: IUpdateSemesterPayload,
	actor?: TAuthUser,
) => {
	const existing = await prisma.semester.findUnique({ where: { id } });

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Semester not found");
	}

	if (payload.name) {
		const isNameTaken = await prisma.semester.findFirst({
			where: { name: payload.name, NOT: { id } },
		});

		if (isNameTaken) {
			throw new AppError(httpStatus.BAD_REQUEST, "A semester with this name already exists");
		}
	}

	const nextStartDate = payload.startDate ?? existing.startDate;
	const nextEndDate = payload.endDate ?? existing.endDate;

	if (nextEndDate <= nextStartDate) {
		throw new AppError(httpStatus.BAD_REQUEST, "End date must be after start date");
	}

	const result = await prisma.semester.update({
		where: { id },
		data: payload,
	});


	return result;
};

const updateSemesterStatus = async (
	id: string,
	payload: IUpdateSemesterStatusPayload,
	actor?: TAuthUser,
) => {
	const semester = await prisma.semester.findUnique({ where: { id } });

	if (!semester) {
		throw new AppError(httpStatus.NOT_FOUND, "Semester not found");
	}

	const allowedNextStatuses = VALID_TRANSITIONS[semester.status];

	if (!allowedNextStatuses.includes(payload.status)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Cannot change semester status from ${semester.status} to ${payload.status}`,
		);
	}

	if (payload.status === SemesterStatus.ACTIVE) {
		const alreadyActive = await prisma.semester.findFirst({
			where: { status: SemesterStatus.ACTIVE, NOT: { id } },
		});

		if (alreadyActive) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Semester "${alreadyActive.name}" is already active. Complete it before activating another.`,
			);
		}
	}

	const result = await prisma.semester.update({
		where: { id },
		data: { status: payload.status },
	});



	return result;
};

export const SemesterService = {
	createSemester,
	getAllSemesters,
	getSingleSemester,
	updateSemester,
	updateSemesterStatus,
};
