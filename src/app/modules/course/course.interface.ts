export interface ICreateCoursePayload {
	name: string;
	code: string;
	credits: number;
	description?: string;
	departmentId?: string;
}

export interface IUpdateCoursePayload {
	name?: string;
	code?: string;
	credits?: number;
	description?: string;
	departmentId?: string;
}

// NOTE: no programId — Course has no relation to Program in the schema
// (see Phase 5 gap analysis). Only departmentId is a valid filter.
export interface ICourseFilters {
	search?: string;
	departmentId?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}
