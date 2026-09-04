import { Router } from "express";
import checkAuth, { Role } from "../../middleware/checkAuth.js";
import validateRequest from "../../middleware/validateRequest.js";
import { AttendanceController } from "./attendance.controller.js";
import { AttendanceValidation } from "./attendance.validation.js";

const router = Router();

router.post(
	"/",
	checkAuth(Role.INSTRUCTOR),
	validateRequest(AttendanceValidation.CreateAttendanceZodSchema),
	AttendanceController.markAttendance,
);

// Static paths registered before the dynamic "/:id" pattern.
router.get("/my-attendance", checkAuth(Role.STUDENT), AttendanceController.getMyAttendance);

router.get(
	"/section/:sectionId",
	checkAuth(Role.ADMIN, Role.INSTRUCTOR),
	AttendanceController.getSectionAttendance,
);

router.patch(
	"/:id",
	checkAuth(Role.INSTRUCTOR),
	validateRequest(AttendanceValidation.UpdateAttendanceZodSchema),
	AttendanceController.updateAttendance,
);

export const AttendanceRoutes = router;
