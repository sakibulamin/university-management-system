import { Router } from "express";
import checkAuth, { Role } from "../../middleware/checkAuth.js";
import validateRequest from "../../middleware/validateRequest.js";
import { ProgramController } from "./program.controller.js";
import { ProgramValidation } from "./program.validation.js";

const router = Router();

router.post(
	"/",
	checkAuth(Role.ADMIN),
	validateRequest(ProgramValidation.CreateProgramZodSchema),
	ProgramController.createProgram,
);

router.get("/", checkAuth(), ProgramController.getAllPrograms);

router.get("/:id", checkAuth(), ProgramController.getSingleProgram);

router.patch(
	"/:id",
	checkAuth(Role.ADMIN),
	validateRequest(ProgramValidation.UpdateProgramZodSchema),
	ProgramController.updateProgram,
);

router.delete("/:id", checkAuth(Role.ADMIN), ProgramController.deleteProgram);

export const ProgramRoutes = router;
