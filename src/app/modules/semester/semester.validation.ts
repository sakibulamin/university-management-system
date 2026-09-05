import z from "zod";

const SEMESTER_STATUS_VALUES = ["UPCOMING", "ACTIVE", "COMPLETED"] as const;

const CreateSemesterZodSchema = z
	.object({
		name: z.string().min(2, "Name must be at least 2 characters"),
		startDate: z.coerce.date({ message: "Valid start date is required" }),
		endDate: z.coerce.date({ message: "Valid end date is required" }),
	})
	.refine((data) => data.endDate > data.startDate, {
		message: "End date must be after start date",
		path: ["endDate"],
	});

const UpdateSemesterZodSchema = z
	.object({
		name: z.string().min(2, "Name must be at least 2 characters").optional(),
		startDate: z.coerce.date().optional(),
		endDate: z.coerce.date().optional(),
	})
	.refine(
		(data) => !data.startDate || !data.endDate || data.endDate > data.startDate,
		{
			message: "End date must be after start date",
			path: ["endDate"],
		},
	);

const UpdateSemesterStatusZodSchema = z.object({
	status: z.enum(SEMESTER_STATUS_VALUES, {
		message: `Status must be one of: ${SEMESTER_STATUS_VALUES.join(", ")}`,
	}),
});

export const SemesterValidation = {
	CreateSemesterZodSchema,
	UpdateSemesterZodSchema,
	UpdateSemesterStatusZodSchema,
};
