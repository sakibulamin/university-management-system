import { Router } from "express";
import checkAuth, { Role } from "../../middleware/checkAuth.js";
import validateRequest from "../../middleware/validateRequest.js";
import { InstructorController } from "./instructor.controller.js";
import { InstructorValidation } from "./instructor.validation.js";

const router = Router();

router.post(
	"/",
	checkAuth(Role.ADMIN),
	validateRequest(InstructorValidation.CreateInstructorZodSchema),
	InstructorController.createInstructor,
);

router.get("/", checkAuth(), InstructorController.getAllInstructors);

// IMPORTANT: /me must be registered before /:id or Express will treat
// "me" as an :id param.
router.get("/me", checkAuth(Role.INSTRUCTOR), InstructorController.getMyInstructorProfile);

router.get("/:id", checkAuth(), InstructorController.getSingleInstructor);

router.patch(
	"/:id",
	checkAuth(Role.ADMIN),
	validateRequest(InstructorValidation.UpdateInstructorZodSchema),
	InstructorController.updateInstructor,
);

router.delete("/:id", checkAuth(Role.ADMIN), InstructorController.deleteInstructor);

export const InstructorRoutes = router;
