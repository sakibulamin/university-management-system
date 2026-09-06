import { Router } from "express";

import validateRequest from "../../middleware/validateRequest.js";
import { InstructorController } from "./instructor.controller.js";
import { InstructorValidation } from "./instructor.validation.js";
import { auth } from "../../middleware/checkAuth.js";
import { Role } from "../../../../generated/prisma/enums.js";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN),
	validateRequest(InstructorValidation.CreateInstructorZodSchema),
	InstructorController.createInstructor,
);

router.get(
	"/",
	auth(Role.ADMIN, Role.INSTRUCTOR, Role.STUDENT),
	InstructorController.getAllInstructors,
);

router.get(
	"/me",
	auth(Role.INSTRUCTOR),
	InstructorController.getMyInstructorProfile,
);

router.get("/:id", auth(), InstructorController.getSingleInstructor);

router.patch(
	"/:id",
	auth(Role.ADMIN),
	validateRequest(InstructorValidation.UpdateInstructorZodSchema),
	InstructorController.updateInstructor,
);

router.delete("/:id", auth(Role.ADMIN), InstructorController.deleteInstructor);

export const InstructorRoutes = router;
