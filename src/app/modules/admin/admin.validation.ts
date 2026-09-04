import z from "zod";

// Exact enum values from Phase 3 schema.prisma — exactly the 3 project roles.
const ROLE_VALUES = ["STUDENT", "INSTRUCTOR", "ADMIN"] as const;

const UpdateUserRoleZodSchema = z.object({
	role: z.enum(ROLE_VALUES, {
		message: `Role must be one of: ${ROLE_VALUES.join(", ")}`,
	}),
});

export const AdminValidation = {
	UpdateUserRoleZodSchema,
};
