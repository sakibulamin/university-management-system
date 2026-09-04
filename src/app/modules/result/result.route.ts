import { Router } from "express";
import checkAuth, { Role } from "../../middleware/checkAuth.js";
import validateRequest from "../../middleware/validateRequest.js";
import { ResultController } from "./result.controller.js";
import { ResultValidation } from "./result.validation.js";

const router = Router();

router.post(
	"/",
	checkAuth(Role.ADMIN, Role.INSTRUCTOR),
	validateRequest(ResultValidation.SubmitResultZodSchema),
	ResultController.submitResult,
);

// Static paths registered before the dynamic "/:id" pattern.
router.get("/my-results", checkAuth(Role.STUDENT), ResultController.getMyResults);

router.get(
	"/section/:sectionId",
	checkAuth(Role.ADMIN, Role.INSTRUCTOR),
	ResultController.getSectionResults,
);

router.patch(
	"/:id",
	checkAuth(Role.ADMIN, Role.INSTRUCTOR),
	validateRequest(ResultValidation.UpdateResultZodSchema),
	ResultController.updateResult,
);

export const ResultRoutes = router;
