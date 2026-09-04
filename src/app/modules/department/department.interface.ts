export interface ICreateDepartmentPayload {
	name: string;
	code: string;
}

export interface IUpdateDepartmentPayload {
	name?: string;
	code?: string;
}

export interface IDepartmentFilters {
	search?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}
