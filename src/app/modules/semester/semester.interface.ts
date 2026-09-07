import type { SemesterStatus } from "../../../../generated/prisma/enums";

export interface ICreateSemesterPayload {
	name: string;
	startDate: Date;
	endDate: Date;
}



export interface IUpdateSemesterStatusPayload {
	name?: string;
	startDate?: Date;
	endDate?: Date;
	status: SemesterStatus;

}

export interface ISemesterFilters {
	search?: string;
	status?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}
