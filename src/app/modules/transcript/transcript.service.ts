import httpStatus from "http-status";
import { EnrollmentStatus } from "../../../generated/prisma/index.js";
import prisma from "../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { calculateGrade } from "../../utils/gradeCalculator.js";
import type {
	ITranscriptCourseEntry,
	ITranscriptSemesterGroup,
} from "./transcript.interface.js";

const round2 = (value: number) => Math.round(value * 100) / 100;

// ---------------------------------------------------------------------------
// My Transcript (STUDENT — self only)
//
// "Completed course" here means: enrollment is not CANCELLED AND has at
// least one submitted Result. See Phase 10 plan for why this definition is
// used instead of Enrollment.status === COMPLETED (that transition doesn't
// exist anywhere in the current API surface).
// ---------------------------------------------------------------------------
const getMyTranscript = async (userId: string) => {
	const student = await prisma.student.findFirst({
		where: { userId, isDeleted: false },
		include: {
			user: { select: { id: true, name: true, email: true } },
			program: { select: { id: true, name: true, code: true } },
		},
	});

	if (!student) {
		throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
	}

	const enrollments = await prisma.enrollment.findMany({
		where: {
			studentId: student.id,
			status: { not: EnrollmentStatus.CANCELLED },
			results: { some: {} },
		},
		include: {
			section: {
				include: {
					course: { select: { id: true, name: true, code: true, credits: true } },
					semester: { select: { id: true, name: true, status: true } },
				},
			},
			results: {
				include: { exam: { select: { totalMarks: true } } },
			},
		},
	});

	const semesterMap = new Map<
		string,
		{
			semesterId: string;
			semesterName: string;
			totalWeightedPoints: number;
			totalCredits: number;
			courses: ITranscriptCourseEntry[];
		}
	>();

	for (const enrollment of enrollments) {
		const totalObtained = enrollment.results.reduce(
			(sum, result) => sum + result.obtainedMarks,
			0,
		);
		const totalPossible = enrollment.results.reduce(
			(sum, result) => sum + result.exam.totalMarks,
			0,
		);

		// Guards against a pathological 0-total-marks exam skewing the average.
		if (totalPossible <= 0) {
			continue;
		}

		const percentage = (totalObtained / totalPossible) * 100;
		const { grade, gradePoint } = calculateGrade(percentage);

		const credits = enrollment.section.course.credits;
		const semesterId = enrollment.section.semester.id;
		const semesterName = enrollment.section.semester.name;

		const courseEntry: ITranscriptCourseEntry = {
			enrollmentId: enrollment.id,
			courseId: enrollment.section.course.id,
			courseName: enrollment.section.course.name,
			courseCode: enrollment.section.course.code,
			credits,
			sectionCode: enrollment.section.sectionCode,
			percentage: round2(percentage),
			grade,
			gradePoint,
		};

		if (!semesterMap.has(semesterId)) {
			semesterMap.set(semesterId, {
				semesterId,
				semesterName,
				totalWeightedPoints: 0,
				totalCredits: 0,
				courses: [],
			});
		}

		const group = semesterMap.get(semesterId);

		if (!group) {
			continue;
		}

		group.courses.push(courseEntry);
		group.totalWeightedPoints += gradePoint * credits;
		group.totalCredits += credits;
	}

	const semesters: ITranscriptSemesterGroup[] = Array.from(semesterMap.values()).map(
		(group) => ({
			semesterId: group.semesterId,
			semesterName: group.semesterName,
			semesterGpa:
				group.totalCredits > 0
					? round2(group.totalWeightedPoints / group.totalCredits)
					: 0,
			totalCredits: group.totalCredits,
			courses: group.courses,
		}),
	);

	const overallWeightedPoints = semesters.reduce(
		(sum, semester) =>
			sum +
			semester.courses.reduce((cSum, course) => cSum + course.gradePoint * course.credits, 0),
		0,
	);
	const overallCredits = semesters.reduce((sum, semester) => sum + semester.totalCredits, 0);
	const cgpa = overallCredits > 0 ? round2(overallWeightedPoints / overallCredits) : 0;

	return {
		student: {
			id: student.id,
			studentId: student.studentId,
			name: student.user.name,
			email: student.user.email,
			program: student.program,
		},
		semesters,
		totalCreditsCompleted: overallCredits,
		cgpa,
	};
};

export const TranscriptService = {
	getMyTranscript,
};
