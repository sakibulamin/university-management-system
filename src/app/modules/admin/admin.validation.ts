import z from "zod";

const ROLE_VALUES = ["STUDENT", "INSTRUCTOR", "ADMIN"] as const;

const UpdateUserRoleZodSchema = z.object({
	role: z.enum(ROLE_VALUES, {
		message: `Role must be one of: ${ROLE_VALUES.join(", ")}`,
	}),
});

export const AdminValidation = {
	UpdateUserRoleZodSchema,
};
