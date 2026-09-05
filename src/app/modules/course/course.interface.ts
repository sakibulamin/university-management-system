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

export interface ICourseFilters {
	search?: string;
	departmentId?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}
