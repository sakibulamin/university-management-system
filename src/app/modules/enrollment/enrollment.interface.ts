export interface ICreateEnrollmentPayload {
	sectionId: string;
}

export interface IEnrollmentFilters {
	studentId?: string;
	sectionId?: string;
	semesterId?: string;
	status?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}
