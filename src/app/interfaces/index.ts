import type { Role } from "../../../generated/prisma/enums";

export type TAuthUser = {
	id: string;
	email: string;
	role: Role;
};

export type TPaginationMeta = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};
