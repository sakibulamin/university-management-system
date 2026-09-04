import z from "zod";

const CreateInstructorZodSchema = z.object({
	userId: z.string().min(1, "User is required"),
	departmentId: z.string().min(1, "Department is required"),
	designation: z.string().optional(),
	phone: z.string().optional(),
	profileImage: z.string().optional(),
});

const UpdateInstructorZodSchema = z.object({
	departmentId: z.string().min(1, "Department is required").optional(),
	designation: z.string().optional(),
	phone: z.string().optional(),
	profileImage: z.string().optional(),
});

export const InstructorValidation = {
	CreateInstructorZodSchema,
	UpdateInstructorZodSchema,
};
