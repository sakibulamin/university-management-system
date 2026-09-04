import z from "zod";

const CreateProgramZodSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	code: z.string().min(2, "Code must be at least 2 characters"),
	departmentId: z.string().min(1, "Department is required"),
});

const UpdateProgramZodSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters").optional(),
	code: z.string().min(2, "Code must be at least 2 characters").optional(),
	departmentId: z.string().min(1, "Department is required").optional(),
});

export const ProgramValidation = {
	CreateProgramZodSchema,
	UpdateProgramZodSchema,
};
