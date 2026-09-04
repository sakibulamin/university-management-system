import type { Role } from "../../generated/prisma/index.js";

// Matches the shape checkAuth.ts attaches to req.user
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
