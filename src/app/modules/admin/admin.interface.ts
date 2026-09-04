import type { Role } from "../../../generated/prisma/index.js";

export interface IUpdateUserRolePayload {
	role: Role;
}

export interface IUserFilters {
	search?: string;
	role?: string;
	status?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}

export interface IAuditLogFilters {
	userId?: string;
	entity?: string;
	action?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}
