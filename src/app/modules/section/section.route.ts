import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";

import validateRequest from "../../middleware/validateRequest.js";
import { SectionController } from "./section.controller.js";
import { SectionValidation } from "./section.validation.js";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN),
	validateRequest(SectionValidation.CreateSectionZodSchema),
	SectionController.createSection,
);

router.get("/", auth(), SectionController.getAllSections);

router.get("/:id", auth(), SectionController.getSingleSection);

router.patch(
	"/:id",
	auth(Role.ADMIN),
	validateRequest(SectionValidation.UpdateSectionZodSchema),
	SectionController.updateSection,
);

router.patch(
	"/:id/assign-instructor",
	auth(Role.ADMIN),
	validateRequest(SectionValidation.AssignInstructorZodSchema),
	SectionController.assignInstructor,
);

router.delete("/:id", auth(Role.ADMIN), SectionController.deleteSection);

export const SectionRoutes = router;
