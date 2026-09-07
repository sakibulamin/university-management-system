import { Router } from "express";

import validateRequest from "../../middleware/validateRequest.js";
import { CourseController } from "./course.controller.js";
import { CourseValidation } from "./course.validation.js";
import { auth } from "../../middleware/checkAuth.js";
import { Role } from "../../../../generated/prisma/enums.js";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN),
	validateRequest(CourseValidation.CreateCourseZodSchema),
	CourseController.createCourse,
);

router.get("/", auth(), CourseController.getAllCourses);

router.get("/:id", auth(), CourseController.getSingleCourse);

router.patch(
	"/:id",
	auth(Role.ADMIN, Role.STUDENT),
	validateRequest(CourseValidation.UpdateCourseZodSchema),
	CourseController.updateCourse,
);

router.delete("/:id", auth(Role.ADMIN), CourseController.deleteCourse);

export const CourseRoutes = router;
