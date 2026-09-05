export interface ICreateSectionPayload {
	courseId: string;
	semesterId: string;
	instructorId: string;
	sectionCode: string;
	capacity: number;
	schedule?: string;
}

export interface IUpdateSectionPayload {
	sectionCode?: string;
	capacity?: number;
	schedule?: string;
}

export interface IAssignInstructorPayload {
	instructorId: string;
}

export interface ISectionFilters {
	search?: string;
	courseId?: string;
	semesterId?: string;
	instructorId?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}
