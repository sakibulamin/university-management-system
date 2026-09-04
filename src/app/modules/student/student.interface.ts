export interface IUpdateMyStudentProfilePayload {
	phone?: string;
	address?: string;
	dateOfBirth?: Date;
	profileImage?: string;
}

export interface IAdminUpdateStudentPayload {
	programId?: string;
	phone?: string;
	address?: string;
	dateOfBirth?: Date;
	profileImage?: string;
}

export interface IStudentFilters {
	search?: string;
	programId?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}
