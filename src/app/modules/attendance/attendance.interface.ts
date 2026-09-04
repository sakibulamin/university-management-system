import type { AttendanceStatus } from "../../../generated/prisma/index.js";

export interface ICreateAttendancePayload {
	enrollmentId: string;
	date: Date;
	status: AttendanceStatus;
}

export interface IUpdateAttendancePayload {
	status: AttendanceStatus;
}

export interface IMyAttendanceFilters {
	sectionId?: string;
	from?: string;
	to?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}

export interface ISectionAttendanceFilters {
	studentId?: string;
	from?: string;
	to?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}
