import z from "zod";

const CreateSectionZodSchema = z.object({
	courseId: z.string().min(1, "Course is required"),
	semesterId: z.string().min(1, "Semester is required"),
	instructorId: z.string().min(1, "Instructor is required"),
	sectionCode: z.string().min(1, "Section code is required"),
	capacity: z.number().int().min(1, "Capacity must be at least 1"),
	schedule: z.string().optional(),
});

const UpdateSectionZodSchema = z.object({
	sectionCode: z.string().min(1, "Section code is required").optional(),
	capacity: z.number().int().min(1, "Capacity must be at least 1").optional(),
	schedule: z.string().optional(),
});

const AssignInstructorZodSchema = z.object({
	instructorId: z.string().min(1, "Instructor is required"),
});

export const SectionValidation = {
	CreateSectionZodSchema,
	UpdateSectionZodSchema,
	AssignInstructorZodSchema,
};
