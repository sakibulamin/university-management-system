import { SemesterStatus } from "../../../../generated/prisma/enums";


export interface ICreateSemesterPayload {
	name: string;
	startDate: Date;
	endDate: Date;
}

export interface IUpdateSemesterPayload {
	name?: string;
	startDate?: Date;
	endDate?: Date;
}

export interface IUpdateSemesterStatusPayload {
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
