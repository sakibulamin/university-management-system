import { Grade } from "../../generated/prisma/index.js";

type TGradeResult = {
	grade: Grade;
	gradePoint: number;
};

// Exact scale from the project spec — percentage tiers, highest first.
const GRADE_SCALE: { min: number; grade: Grade; gradePoint: number }[] = [
	{ min: 80, grade: Grade.A_PLUS, gradePoint: 4.0 },
	{ min: 75, grade: Grade.A, gradePoint: 3.75 },
	{ min: 70, grade: Grade.A_MINUS, gradePoint: 3.5 },
	{ min: 65, grade: Grade.B_PLUS, gradePoint: 3.25 },
	{ min: 60, grade: Grade.B, gradePoint: 3.0 },
	{ min: 55, grade: Grade.B_MINUS, gradePoint: 2.75 },
	{ min: 50, grade: Grade.C_PLUS, gradePoint: 2.5 },
	{ min: 45, grade: Grade.C, gradePoint: 2.25 },
	{ min: 40, grade: Grade.D, gradePoint: 2.0 },
	{ min: 0, grade: Grade.F, gradePoint: 0.0 },
];

export const calculateGrade = (percentage: number): TGradeResult => {
	const clamped = Math.max(0, Math.min(100, percentage));
	const tier = GRADE_SCALE.find((entry) => clamped >= entry.min);

	return {
		grade: tier?.grade ?? Grade.F,
		gradePoint: tier?.gradePoint ?? 0.0,
	};
};
