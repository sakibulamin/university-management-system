import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";

import validateRequest from "../../middleware/validateRequest.js";
import { ProgramController } from "./program.controller.js";
import { ProgramValidation } from "./program.validation.js";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN),
	validateRequest(ProgramValidation.CreateProgramZodSchema),
	ProgramController.createProgram,
);

router.get("/", auth(), ProgramController.getAllPrograms);

router.get("/:id", auth(), ProgramController.getSingleProgram);

router.patch(
	"/:id",
	auth(Role.ADMIN),
	validateRequest(ProgramValidation.UpdateProgramZodSchema),
	ProgramController.updateProgram,
);

router.delete("/:id", auth(Role.ADMIN), ProgramController.deleteProgram);

export const ProgramRoutes = router;
