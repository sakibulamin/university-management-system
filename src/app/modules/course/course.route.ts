import { Router } from "express";
import checkAuth, { Role } from "../../middleware/checkAuth.js";
import validateRequest from "../../middleware/validateRequest.js";
import { CourseController } from "./course.controller.js";
import { CourseValidation } from "./course.validation.js";

const router = Router();

router.post(
	"/",
	checkAuth(Role.ADMIN),
	validateRequest(CourseValidation.CreateCourseZodSchema),
	CourseController.createCourse,
);

router.get("/", checkAuth(), CourseController.getAllCourses);

router.get("/:id", checkAuth(), CourseController.getSingleCourse);

router.patch(
	"/:id",
	checkAuth(Role.ADMIN),
	validateRequest(CourseValidation.UpdateCourseZodSchema),
	CourseController.updateCourse,
);

router.delete("/:id", checkAuth(Role.ADMIN), CourseController.deleteCourse);

export const CourseRoutes = router;
