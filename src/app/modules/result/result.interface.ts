export interface ISubmitResultPayload {
	enrollmentId: string;
	examId: string;
	obtainedMarks: number;
}

export interface IUpdateResultPayload {
	obtainedMarks: number;
}

export interface IMyResultFilters {
	sectionId?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}

export interface ISectionResultFilters {
	examId?: string;
	studentId?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}
