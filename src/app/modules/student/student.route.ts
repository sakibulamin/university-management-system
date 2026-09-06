import { Router } from "express";

import validateRequest from "../../middleware/validateRequest.js";
import { StudentController } from "./student.controller.js";
import { StudentValidation } from "./student.validation.js";
import { Role } from "../../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";

const router = Router();

router.get("/", auth(Role.ADMIN), StudentController.getAllStudents);

// IMPORTANT: /me must be registered before /:id or Express will treat
// "me" as an :id param.
router.get("/me", auth(Role.STUDENT), StudentController.getMyStudentProfile);

router.patch(
	"/me",
	auth(Role.STUDENT),
	validateRequest(StudentValidation.UpdateMyStudentProfileZodSchema),
	StudentController.updateMyStudentProfile,
);

router.get("/:id", auth(Role.ADMIN), StudentController.getSingleStudent);

router.patch(
	"/:id",
	auth(Role.ADMIN),
	validateRequest(StudentValidation.AdminUpdateStudentZodSchema),
	StudentController.adminUpdateStudent,
);

router.delete("/:id", auth(Role.ADMIN), StudentController.deleteStudent);

export const StudentRoutes = router;
