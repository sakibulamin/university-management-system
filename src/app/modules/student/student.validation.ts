import z from "zod";

const UpdateMyStudentProfileZodSchema = z.object({
	phone: z.string().optional(),
	address: z.string().optional(),
	dateOfBirth: z.coerce.date().optional(),
	profileImage: z.string().optional(),
});

const AdminUpdateStudentZodSchema = z.object({
	programId: z.string().min(1, "Program is required").optional(),
	phone: z.string().optional(),
	address: z.string().optional(),
	dateOfBirth: z.coerce.date().optional(),
	profileImage: z.string().optional(),
});

export const StudentValidation = {
	UpdateMyStudentProfileZodSchema,
	AdminUpdateStudentZodSchema,
};
