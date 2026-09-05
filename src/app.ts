import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";
import config from "./app/config/index.js";
import globalErrorHandler from "./app/middleware/globalErrorHandler.js";
import notFound from "./app/middleware/notFound.js";


import { AdminRoutes } from "./app/modules/admin/admin.route.js";
import { PaymentRoutes } from "./app/modules/payment/payment.route.js";
import { TranscriptRoutes } from "./app/modules/transcript/transcript.route.js";
import { ResultRoutes } from "./app/modules/result/result.route.js";
import { ExamRoutes } from "./app/modules/exam/exam.route.js";
import { AttendanceRoutes } from "./app/modules/attendance/attendance.route.js";
import { EnrollmentRoutes } from "./app/modules/enrollment/enrollment.route.js";
import { StudentRoutes } from "./app/modules/student/student.route.js";
import { InstructorRoutes } from "./app/modules/instructor/instructor.route.js";
import { SectionRoutes } from "./app/modules/section/section.route.js";
import { SemesterRoutes } from "./app/modules/semester/semester.route.js";
import { CourseRoutes } from "./app/modules/course/course.route.js";
import { ProgramRoutes } from "./app/modules/program/program.route.js";
import { DepartmentRoutes } from "./app/modules/department/department.route.js";
import { AuthRoutes } from "./app/modules/auth/auth.route.js";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/", (_req: Request, res: Response) => {
	res.status(200).json({
		success: true,
		message: "University Management System API is running",
		data: null,
	});
});


app.use("/api/v1/auth", AuthRoutes);

app.use("/api/v1/departments", DepartmentRoutes);

app.use("/api/v1/programs", ProgramRoutes);

app.use("/api/v1/courses", CourseRoutes);

app.use("/api/v1/semesters", SemesterRoutes);

app.use("/api/v1/sections", SectionRoutes);

app.use("/api/v1/instructors", InstructorRoutes);

app.use("/api/v1/students", StudentRoutes);

app.use("/api/v1/enrollments", EnrollmentRoutes);

app.use("/api/v1/attendance", AttendanceRoutes);

app.use("/api/v1/exams", ExamRoutes);

app.use("/api/v1/results", ResultRoutes);

app.use("/api/v1/transcripts", TranscriptRoutes);

app.use("/api/v1/payments", PaymentRoutes);

app.use("/api/v1/admin", AdminRoutes);

app.use(notFound);

app.use(globalErrorHandler);

export default app;
