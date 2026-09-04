import z from "zod";

// Student enrolls themselves — sectionId is the only client-supplied field.
// studentId is always derived from the authenticated user, never accepted here.
const CreateEnrollmentZodSchema = z.object({
	sectionId: z.string().min(1, "Section is required"),
});

export const EnrollmentValidation = {
	CreateEnrollmentZodSchema,
};
