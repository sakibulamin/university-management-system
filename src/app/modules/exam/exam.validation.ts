import z from "zod";

// Exact enum values from Phase 3 schema.prisma — nothing invented.
const EXAM_TYPE_VALUES = ["QUIZ", "MIDTERM", "FINAL"] as const;

const CreateExamZodSchema = z.object({
	sectionId: z.string().min(1, "Section is required"),
	title: z.string().min(2, "Title must be at least 2 characters"),
	type: z.enum(EXAM_TYPE_VALUES, {
		message: `Type must be one of: ${EXAM_TYPE_VALUES.join(", ")}`,
	}),
	totalMarks: z.number().int().min(1, "Total marks must be at least 1"),
	examDate: z.coerce.date({ message: "Valid exam date is required" }),
});

const UpdateExamZodSchema = z.object({
	title: z.string().min(2, "Title must be at least 2 characters").optional(),
	type: z.enum(EXAM_TYPE_VALUES).optional(),
	totalMarks: z.number().int().min(1, "Total marks must be at least 1").optional(),
	examDate: z.coerce.date().optional(),
});

export const ExamValidation = {
	CreateExamZodSchema,
	UpdateExamZodSchema,
};
