import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import config from "./app/config/index.js";
import globalErrorHandler from "./app/middleware/globalErrorHandler.js";
import notFound from "./app/middleware/notFound.js";
import { AdminRoutes } from "./app/modules/admin/admin.route.js";
import { PaymentRoutes } from "./app/modules/payment/payment.route.js";
import { StudentRoutes } from "./app/modules/student/student.route.js";
import { InstructorRoutes } from "./app/modules/instructor/instructor.route.js";
import { SemesterRoutes } from "./app/modules/semester/semester.route.js";
import { CourseRoutes } from "./app/modules/course/course.route.js";
import { ProgramRoutes } from "./app/modules/program/program.route.js";
import { DepartmentRoutes } from "./app/modules/department/department.route.js";
import { AuthRoutes } from "./app/modules/auth/auth.route.js";
import { UserRoutes } from "./app/modules/user/user.route.js";

const app: Application = express();

app.use(
	cors({
		origin: [
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"https://university-management-system-fronte-lovat.vercel.app",
		],
		credentials: true,
	}),
);

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

app.use("/api/v1/instructors", InstructorRoutes);

app.use("/api/v1/students", StudentRoutes);

app.use("/api/v1/payments", PaymentRoutes);

app.use("/api/v1/admin", AdminRoutes);

app.use("/api/v1/user", UserRoutes);

app.use(notFound);

app.use(globalErrorHandler);

export default app;
