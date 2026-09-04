import { Router } from "express";
import { AdminRoutes } from "../modules/admin/admin.route.js";
import { AttendanceRoutes } from "../modules/attendance/attendance.route.js";
import { AuthRoutes } from "../modules/auth/auth.route.js";
import { CourseRoutes } from "../modules/course/course.route.js";
import { DepartmentRoutes } from "../modules/department/department.route.js";
import { EnrollmentRoutes } from "../modules/enrollment/enrollment.route.js";
import { ExamRoutes } from "../modules/exam/exam.route.js";
import { InstructorRoutes } from "../modules/instructor/instructor.route.js";
import { PaymentRoutes } from "../modules/payment/payment.route.js";
import { ProgramRoutes } from "../modules/program/program.route.js";
import { ResultRoutes } from "../modules/result/result.route.js";
import { SectionRoutes } from "../modules/section/section.route.js";
import { SemesterRoutes } from "../modules/semester/semester.route.js";
import { StudentRoutes } from "../modules/student/student.route.js";
import { TranscriptRoutes } from "../modules/transcript/transcript.route.js";

const router = Router();

const moduleRoutes = [
	{
		path: "/auth",
		route: AuthRoutes,
	},
	{
		path: "/departments",
		route: DepartmentRoutes,
	},
	{
		path: "/programs",
		route: ProgramRoutes,
	},
	{
		path: "/courses",
		route: CourseRoutes,
	},
	{
		path: "/semesters",
		route: SemesterRoutes,
	},
	{
		path: "/sections",
		route: SectionRoutes,
	},
	{
		path: "/instructors",
		route: InstructorRoutes,
	},
	{
		path: "/students",
		route: StudentRoutes,
	},
	{
		path: "/enrollments",
		route: EnrollmentRoutes,
	},
	{
		path: "/attendance",
		route: AttendanceRoutes,
	},
	{
		path: "/exams",
		route: ExamRoutes,
	},
	{
		path: "/results",
		route: ResultRoutes,
	},
	{
		path: "/transcripts",
		route: TranscriptRoutes,
	},
	{
		path: "/payments",
		route: PaymentRoutes,
	},
	{
		path: "/admin",
		route: AdminRoutes,
	},
];

moduleRoutes.forEach((moduleRoute) => router.use(moduleRoute.path, moduleRoute.route));

export default router;
