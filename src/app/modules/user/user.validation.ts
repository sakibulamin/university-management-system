import { z } from "zod";

export const updateProfileValidationSchema = z.object({
	name: z
		.string()
		.min(2, "Name must be at least 2 characters")
		.max(100, "Name cannot exceed 100 characters")
		.optional(),
});
