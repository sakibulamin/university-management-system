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

// NOTE: no "status" filter — Section has no status field in the schema
// (see Phase 5 gap analysis). Only isDeleted exists, and deleted sections
// are already excluded from every query below.
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
