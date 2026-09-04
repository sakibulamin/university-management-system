import z from "zod";

const CreateCourseZodSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	code: z.string().min(2, "Code must be at least 2 characters"),
	credits: z.number().int().min(1, "Credits must be at least 1"),
	description: z.string().optional(),
	departmentId: z.string().min(1).optional(),
});

const UpdateCourseZodSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters").optional(),
	code: z.string().min(2, "Code must be at least 2 characters").optional(),
	credits: z.number().int().min(1, "Credits must be at least 1").optional(),
	description: z.string().optional(),
	departmentId: z.string().min(1).optional(),
});

export const CourseValidation = {
	CreateCourseZodSchema,
	UpdateCourseZodSchema,
};
