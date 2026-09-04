import type { ExamType } from "../../../generated/prisma/index.js";

export interface ICreateExamPayload {
	sectionId: string;
	title: string;
	type: ExamType;
	totalMarks: number;
	examDate: Date;
}

export interface IUpdateExamPayload {
	title?: string;
	type?: ExamType;
	totalMarks?: number;
	examDate?: Date;
}

export interface IExamFilters {
	sectionId?: string;
	type?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}
