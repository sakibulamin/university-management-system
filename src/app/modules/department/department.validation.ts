import z from "zod";

const CreateDepartmentZodSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	code: z.string().min(2, "Code must be at least 2 characters"),
});

const UpdateDepartmentZodSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters").optional(),
	code: z.string().min(2, "Code must be at least 2 characters").optional(),
});

export const DepartmentValidation = {
	CreateDepartmentZodSchema,
	UpdateDepartmentZodSchema,
};
