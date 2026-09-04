import z from "zod";

// Deliberately does NOT include role/password/email/studentId/programId/
// status/isDeleted — Zod objects strip unknown keys by default, so even if
// a client sends those fields they are silently dropped before this data
// ever reaches the service layer.
const UpdateMyStudentProfileZodSchema = z.object({
	phone: z.string().optional(),
	address: z.string().optional(),
	dateOfBirth: z.coerce.date().optional(),
	profileImage: z.string().optional(),
});

// Admin is allowed to also change programId, but still never role/password/
// email/studentId/status/isDeleted.
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
