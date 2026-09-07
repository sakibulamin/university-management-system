type TPaginationOptions = {
	page?: string | number;
	limit?: string | number;
	sortBy?: string;
	sortOrder?: string;
};

type TPaginationResult = {
	page: number;
	limit: number;
	skip: number;
	sortBy: string;
	sortOrder: "asc" | "desc";
};

const calculatePagination = (
	options: TPaginationOptions,
): TPaginationResult => {
	const page = Number(options.page) > 0 ? Number(options.page) : 1;
	const limit = Number(options.limit) > 0 ? Number(options.limit) : 10;
	const skip = (page - 1) * limit;

	const sortBy = options.sortBy || "createdAt";
	const sortOrder = options.sortOrder === "asc" ? "asc" : "desc";

	return { page, limit, skip, sortBy, sortOrder };
};

export const paginationHelper = {
	calculatePagination,
};
