import z from "zod";

// Exact enum values from Phase 3 schema.prisma — nothing invented.
const ATTENDANCE_STATUS_VALUES = ["PRESENT", "ABSENT", "LATE"] as const;

const CreateAttendanceZodSchema = z.object({
	enrollmentId: z.string().min(1, "Enrollment is required"),
	date: z.coerce.date({ message: "Valid date is required" }),
	status: z.enum(ATTENDANCE_STATUS_VALUES, {
		message: `Status must be one of: ${ATTENDANCE_STATUS_VALUES.join(", ")}`,
	}),
});

const UpdateAttendanceZodSchema = z.object({
	status: z.enum(ATTENDANCE_STATUS_VALUES, {
		message: `Status must be one of: ${ATTENDANCE_STATUS_VALUES.join(", ")}`,
	}),
});

export const AttendanceValidation = {
	CreateAttendanceZodSchema,
	UpdateAttendanceZodSchema,
};
