export interface ICreateInstructorPayload {
	userId: string;
	departmentId: string;
	designation?: string;
	phone?: string;
	profileImage?: string;
}

export interface IUpdateInstructorPayload {
	departmentId?: string;
	designation?: string;
	phone?: string;
	profileImage?: string;
}

export interface IInstructorFilters {
	search?: string;
	departmentId?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}
