import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";

import validateRequest from "../../middleware/validateRequest.js";
import { SemesterController } from "./semester.controller.js";
import { SemesterValidation } from "./semester.validation.js";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN),
	validateRequest(SemesterValidation.CreateSemesterZodSchema),
	SemesterController.createSemester,
);

router.get("/", auth(), SemesterController.getAllSemesters);

router.get("/:id", auth(), SemesterController.getSingleSemester);

router.patch(
	"/:id",
	auth(Role.ADMIN),
	validateRequest(SemesterValidation.UpdateSemesterZodSchema),
	SemesterController.updateSemester,
);

router.patch(
	"/:id/status",
	auth(Role.ADMIN),
	validateRequest(SemesterValidation.UpdateSemesterStatusZodSchema),
	SemesterController.updateSemesterStatus,
);

export const SemesterRoutes = router;
