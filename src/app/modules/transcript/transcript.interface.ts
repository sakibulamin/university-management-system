import type { Grade } from "../../../generated/prisma/index.js";

export interface ITranscriptCourseEntry {
	enrollmentId: string;
	courseId: string;
	courseName: string;
	courseCode: string;
	credits: number;
	sectionCode: string;
	percentage: number;
	grade: Grade;
	gradePoint: number;
}

export interface ITranscriptSemesterGroup {
	semesterId: string;
	semesterName: string;
	semesterGpa: number;
	totalCredits: number;
	courses: ITranscriptCourseEntry[];
}
