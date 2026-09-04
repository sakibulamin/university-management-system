import { Router } from "express";
import checkAuth, { Role } from "../../middleware/checkAuth.js";
import validateRequest from "../../middleware/validateRequest.js";
import { StudentController } from "./student.controller.js";
import { StudentValidation } from "./student.validation.js";

const router = Router();

router.get("/", checkAuth(Role.ADMIN), StudentController.getAllStudents);

// IMPORTANT: /me must be registered before /:id or Express will treat
// "me" as an :id param.
router.get("/me", checkAuth(Role.STUDENT), StudentController.getMyStudentProfile);

router.patch(
	"/me",
	checkAuth(Role.STUDENT),
	validateRequest(StudentValidation.UpdateMyStudentProfileZodSchema),
	StudentController.updateMyStudentProfile,
);

router.get("/:id", checkAuth(Role.ADMIN), StudentController.getSingleStudent);

router.patch(
	"/:id",
	checkAuth(Role.ADMIN),
	validateRequest(StudentValidation.AdminUpdateStudentZodSchema),
	StudentController.adminUpdateStudent,
);

router.delete("/:id", checkAuth(Role.ADMIN), StudentController.deleteStudent);

export const StudentRoutes = router;
