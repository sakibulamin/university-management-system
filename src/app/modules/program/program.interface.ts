export interface ICreateProgramPayload {
	name: string;
	code: string;
	departmentId: string;
}

export interface IUpdateProgramPayload {
	name?: string;
	code?: string;
	departmentId?: string;
}

export interface IProgramFilters {
	search?: string;
	departmentId?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}
