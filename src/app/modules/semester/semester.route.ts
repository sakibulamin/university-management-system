import { Router } from "express";
import checkAuth, { Role } from "../../middleware/checkAuth.js";
import validateRequest from "../../middleware/validateRequest.js";
import { SemesterController } from "./semester.controller.js";
import { SemesterValidation } from "./semester.validation.js";

const router = Router();

router.post(
	"/",
	checkAuth(Role.ADMIN),
	validateRequest(SemesterValidation.CreateSemesterZodSchema),
	SemesterController.createSemester,
);

router.get("/", checkAuth(), SemesterController.getAllSemesters);

router.get("/:id", checkAuth(), SemesterController.getSingleSemester);

router.patch(
	"/:id",
	checkAuth(Role.ADMIN),
	validateRequest(SemesterValidation.UpdateSemesterZodSchema),
	SemesterController.updateSemester,
);

router.patch(
	"/:id/status",
	checkAuth(Role.ADMIN),
	validateRequest(SemesterValidation.UpdateSemesterStatusZodSchema),
	SemesterController.updateSemesterStatus,
);

export const SemesterRoutes = router;
