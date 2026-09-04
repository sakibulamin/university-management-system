import z from "zod";

// grade/gradePoint are deliberately never accepted from the client — they
// are always server-computed via src/app/utils/gradeCalculator.ts.
const SubmitResultZodSchema = z.object({
	enrollmentId: z.string().min(1, "Enrollment is required"),
	examId: z.string().min(1, "Exam is required"),
	obtainedMarks: z.number().min(0, "Obtained marks cannot be negative"),
});

const UpdateResultZodSchema = z.object({
	obtainedMarks: z.number().min(0, "Obtained marks cannot be negative"),
});

export const ResultValidation = {
	SubmitResultZodSchema,
	UpdateResultZodSchema,
};
