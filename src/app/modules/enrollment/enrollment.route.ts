import { Router } from "express";
import checkAuth, { Role } from "../../middleware/checkAuth.js";
import validateRequest from "../../middleware/validateRequest.js";
import { EnrollmentController } from "./enrollment.controller.js";
import { EnrollmentValidation } from "./enrollment.validation.js";

const router = Router();

router.post(
	"/",
	checkAuth(Role.STUDENT),
	validateRequest(EnrollmentValidation.CreateEnrollmentZodSchema),
	EnrollmentController.createEnrollment,
);

// Static path registered before any dynamic pattern, consistent with the
// /me-before-/:id convention used in the instructor/student modules.
router.get("/my-enrollments", checkAuth(Role.STUDENT), EnrollmentController.getMyEnrollments);

router.get(
	"/",
	checkAuth(Role.ADMIN, Role.INSTRUCTOR),
	EnrollmentController.getAllEnrollments,
);

router.post(
	"/:id/cancel",
	checkAuth(Role.STUDENT, Role.ADMIN),
	EnrollmentController.cancelEnrollment,
);

export const EnrollmentRoutes = router;
