import { Router } from "express";
import checkAuth, { Role } from "../../middleware/checkAuth.js";
import validateRequest from "../../middleware/validateRequest.js";
import { SectionController } from "./section.controller.js";
import { SectionValidation } from "./section.validation.js";

const router = Router();

router.post(
	"/",
	checkAuth(Role.ADMIN),
	validateRequest(SectionValidation.CreateSectionZodSchema),
	SectionController.createSection,
);

router.get("/", checkAuth(), SectionController.getAllSections);

router.get("/:id", checkAuth(), SectionController.getSingleSection);

router.patch(
	"/:id",
	checkAuth(Role.ADMIN),
	validateRequest(SectionValidation.UpdateSectionZodSchema),
	SectionController.updateSection,
);

router.patch(
	"/:id/assign-instructor",
	checkAuth(Role.ADMIN),
	validateRequest(SectionValidation.AssignInstructorZodSchema),
	SectionController.assignInstructor,
);

router.delete("/:id", checkAuth(Role.ADMIN), SectionController.deleteSection);

export const SectionRoutes = router;
